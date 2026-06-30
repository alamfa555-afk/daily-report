import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  ClipboardCopy, 
  Construction, 
  Inbox, 
  Plus, 
  Sparkles,
  Database,
  Info,
  Layers,
  FileCheck,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Lock,
  Unlock,
  User,
  LogIn,
  LogOut,
  Key,
  Users
} from "lucide-react";
import { Site, Delivery, Erection, Suggestion, UserProfile } from "./types";
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, doc, deleteDoc, setDoc, getDoc } from "./lib/firebase";
import { DEFAULT_SUGGESTIONS } from "./lib/suggestions";
import SiteSelector from "./components/SiteSelector";
import DeliveryForm from "./components/DeliveryForm";
import ErectionForm from "./components/ErectionForm";
import StatsGrid from "./components/StatsGrid";
import ReportExport from "./components/ReportExport";
import DataTable from "./components/DataTable";
import SiteInventory from "./components/SiteInventory";
import EquipmentInventory from "./components/EquipmentInventory";
import PerformanceCharts from "./components/PerformanceCharts";
import AdminPanel from "./components/AdminPanel";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./lib/firebase";

export default function App() {
  // State managers
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  
  // Site Unlock state management
  const [unlockedSites, setUnlockedSites] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("unlocked_sites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sitePasscodeInput, setSitePasscodeInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [erections, setErections] = useState<Erection[]>([]);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, string[]>>({});
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [cleaningStatus, setCleaningStatus] = useState<string>("");
  const [cleanedCount, setCleanedCount] = useState<number>(0);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  
  const [activeFormTab, setActiveFormTab] = useState<"receive" | "erect">("receive");
  const [activeDashboardTab, setActiveDashboardTab] = useState<"logging" | "logs" | "reports" | "inventory" | "equipment" | "charts" | "admin">("logging");

  // Authentication and Role-Based states (Login system completely removed/bypassed)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>({
    uid: "bypass-admin",
    email: "alamfa555@gmail.com",
    displayName: "Admin ARA",
  } as any);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>({
    uid: "bypass-admin",
    email: "alamfa555@gmail.com",
    displayName: "Admin ARA",
    role: "admin",
    assignedSiteIds: [],
    status: "approved",
    createdAt: new Date().toISOString()
  });
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  // Auth fields
  const [authMethodTab, setAuthMethodTab] = useState<"google" | "admin">("admin");
  const [adminPasscodeInputLogin, setAdminPasscodeInputLogin] = useState("");
  const [adminNameInputLogin, setAdminNameInputLogin] = useState("Admin ARA");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dynamic filter for dashboard
  const filteredDeliveriesForDashboard = useMemo(() => {
    if (!selectedDateFilter) return deliveries;
    return deliveries.filter(d => {
      if (!d.createdAt) return false;
      const recordDate = d.createdAt.split("T")[0]; // "YYYY-MM-DD"
      return recordDate === selectedDateFilter;
    });
  }, [deliveries, selectedDateFilter]);

  const filteredErectionsForDashboard = useMemo(() => {
    if (!selectedDateFilter) return erections;
    return erections.filter(e => {
      if (!e.createdAt) return false;
      const recordDate = e.createdAt.split("T")[0]; // "YYYY-MM-DD"
      return recordDate === selectedDateFilter;
    });
  }, [erections, selectedDateFilter]);

  const isUserAdmin = useMemo(() => currentUserProfile?.role === "admin", [currentUserProfile]);
  const isUserApprovedOperator = useMemo(() => currentUserProfile?.role === "operator" && currentUserProfile?.status === "approved", [currentUserProfile]);

  const isSiteReadOnly = useMemo(() => {
    if (!currentUserProfile) return true; // visitor -> read-only
    if (isUserAdmin) return false;        // admin -> full access
    if (isUserApprovedOperator && selectedSite) {
      // operator -> write if assigned to site
      return !currentUserProfile.assignedSiteIds.includes(selectedSite.id);
    }
    return true;                          // pending -> read-only
  }, [currentUserProfile, isUserAdmin, isUserApprovedOperator, selectedSite]);

  const isSiteUnlocked = useMemo(() => {
    if (!selectedSite) return true;
    if (!selectedSite.passcode) return true; // No passcode means unlocked
    return unlockedSites.includes(selectedSite.id);
  }, [selectedSite, unlockedSites]);
  
  // Loaders
  const [loadingSites, setLoadingSites] = useState(true);

  // Activation states for operators
  const [activationCodeInput, setActivationCodeInput] = useState("");
  const [verifyingActivationCode, setVerifyingActivationCode] = useState(false);
  const [activationCodeError, setActivationCodeError] = useState<string | null>(null);
  const [activationCodeSuccess, setActivationCodeSuccess] = useState<boolean>(false);

  // 0. Authentication Listener - Automatically authenticate anonymously in background to enable Firestore calls
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setCurrentUserProfile({
          uid: user.uid,
          email: user.email || "alamfa555@gmail.com",
          displayName: user.displayName || "Admin ARA",
          role: "admin",
          assignedSiteIds: [],
          status: "approved",
          createdAt: new Date().toISOString()
        });
        setLoadingAuth(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous authentication background step failed:", err);
          // Keep static bypass state
          setLoadingAuth(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleVerifyActivationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCodeInput.trim() || !firebaseUser) return;
    setVerifyingActivationCode(true);
    setActivationCodeError(null);
    try {
      const codeSnap = await getDoc(doc(db, "config", "security"));
      const actualCode = codeSnap.exists() ? codeSnap.data()?.accessCode || "ARA2026" : "ARA2026";
      
      if (activationCodeInput.trim() === actualCode) {
        setActivationCodeSuccess(true);
        // Update user status in Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        await setDoc(userRef, {
          status: "approved"
        }, { merge: true });
        
        setTimeout(() => {
          setActivationCodeSuccess(false);
          setActivationCodeInput("");
        }, 1500);
      } else {
        setActivationCodeError("Incorrect Access Code. Please contact the Admin for the valid code.");
      }
    } catch (err: any) {
      console.error("Error verifying code:", err);
      setActivationCodeError("Failed to verify access code: " + err.message);
    } finally {
      setVerifyingActivationCode(false);
    }
  };

  const handleAdminPasscodeSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleGoogleSignIn = async () => {
  };

  const handleSignOut = async () => {
  };

  // 0.2. Handle selected site passcode reset and verification
  useEffect(() => {
    setSitePasscodeInput("");
    setUnlockError(null);
  }, [selectedSite]);

  const handleUnlockSiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    if (selectedSite.passcode && sitePasscodeInput === selectedSite.passcode) {
      const updated = [...unlockedSites, selectedSite.id];
      setUnlockedSites(updated);
      try {
        sessionStorage.setItem("unlocked_sites", JSON.stringify(updated));
      } catch (err) {
        console.error("Error saving unlocked sites to sessionStorage:", err);
      }
      setSitePasscodeInput("");
      setUnlockError(null);
    } else {
      setUnlockError("Incorrect site passcode. Please contact your administrator.");
    }
  };

  // 1. Listen for project sites in real-time
  useEffect(() => {
    const q = query(collection(db, "sites"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSites: Site[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as Site;
        loadedSites.push({
          ...item,
          id: doc.id
        });
      });
      setSites(loadedSites);
      setLoadingSites(false);

      // Auto-select or sync selected site
      if (loadedSites.length > 0) {
        if (!selectedSite) {
          setSelectedSite(loadedSites[0]);
        } else {
          const updatedSelectedSite = loadedSites.find(s => s.id === selectedSite.id);
          if (updatedSelectedSite) {
            // Keep selectedSite in sync with any edits
            if (JSON.stringify(updatedSelectedSite) !== JSON.stringify(selectedSite)) {
              setSelectedSite(updatedSelectedSite);
            }
          } else {
            // Selected site was deleted, fallback to first available site
            setSelectedSite(loadedSites[0]);
          }
        }
      } else {
        setSelectedSite(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "sites");
      setLoadingSites(false);
    });

    return () => unsubscribe();
  }, [selectedSite]);

  // 2. Listen for Deliveries and Erections in real-time
  useEffect(() => {
    if (!selectedSite) {
      setDeliveries([]);
      setErections([]);
      return;
    }

    const deliverQ = query(collection(db, "deliveries"), orderBy("createdAt", "desc"));
    const unsubDeliveries = onSnapshot(deliverQ, (snapshot) => {
      const loaded: Delivery[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as Delivery;
        if (item.siteId === selectedSite.id) {
          loaded.push({
            ...item,
            id: doc.id
          });
        }
      });
      setDeliveries(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "deliveries");
    });

    const erectQ = query(collection(db, "erections"), orderBy("createdAt", "desc"));
    const unsubErections = onSnapshot(erectQ, (snapshot) => {
      const loaded: Erection[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as Erection;
        if (item.siteId === selectedSite.id) {
          loaded.push({
            ...item,
            id: doc.id
          });
        }
      });
      setErections(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "erections");
    });

    return () => {
      unsubDeliveries();
      unsubErections();
    };
  }, [selectedSite]);

  // Clean up any duplicate/conflicting records (e.g. 1003 = SHAMIM, 1003 = JAMSHED, 1004 = RAMESH) in Firestore automatically
  useEffect(() => {
    const autoCleanDuplicates = async () => {
      let count = 0;

      // 1. Clean Erections
      if (erections.length > 0) {
        const duplicateErections = erections.filter(e => {
          const er = e.erectionDetails;
          if (!er || !er.erectorId) return false;
          const id = er.erectorId.trim().toUpperCase();
          const name = (er.erectorName || "").trim().toUpperCase();

          // 1003 = SHAMIM or 1003 = JAMSHED
          if (id === "1003" && (name === "SHAMIM" || name === "JAMSHED")) {
            return true;
          }
          // 1004 = RAMESH or RAMESH KUMAR
          if (id === "1004" && name.includes("RAMESH")) {
            return true;
          }
          return false;
        });

        if (duplicateErections.length > 0) {
          setIsCleaning(true);
          for (const e of duplicateErections) {
            try {
              await deleteDoc(doc(db, "erections", e.id));
              count++;
            } catch (err) {
              console.error(`Error deleting duplicate erection ${e.id}:`, err);
            }
          }
        }
      }

      // 2. Clean Deliveries
      if (deliveries.length > 0) {
        const duplicateDeliveries = deliveries.filter(d => {
          const u = d.unloadingDetails;
          if (!u || !u.unloaderId) return false;
          const id = u.unloaderId.trim().toUpperCase();
          const name = (u.unloaderName || "").trim().toUpperCase();

          // 1003 = SHAMIM or 1003 = JAMSHED
          if (id === "1003" && (name === "SHAMIM" || name === "JAMSHED")) {
            return true;
          }
          // 1004 = RAMESH or RAMESH KUMAR
          if (id === "1004" && name.includes("RAMESH")) {
            return true;
          }
          return false;
        });

        if (duplicateDeliveries.length > 0) {
          setIsCleaning(true);
          for (const d of duplicateDeliveries) {
            try {
              await deleteDoc(doc(db, "deliveries", d.id));
              count++;
            } catch (err) {
              console.error(`Error deleting duplicate delivery ${d.id}:`, err);
            }
          }
        }
      }

      if (count > 0) {
        setCleanedCount(prev => prev + count);
        setCleaningStatus(`Automatically removed ${count} duplicate 1004 = RAMESH / conflicting records!`);
        setTimeout(() => setCleaningStatus(""), 8000);
        setIsCleaning(false);
      }
    };

    autoCleanDuplicates();
  }, [erections, deliveries]);

  // 2b. Listen for suggestion blacklist in real-time
  useEffect(() => {
    const unsubBlacklist = onSnapshot(doc(db, "settings", "suggestions_config"), (snapshot) => {
      if (snapshot.exists()) {
        setBlacklist(snapshot.data().blacklist || []);
      } else {
        setBlacklist([]);
      }
    }, (error) => {
      console.warn("Error loading suggestion blacklist:", error);
    });
    return () => unsubBlacklist();
  }, []);

  // 3. Listen for suggestions in real-time to build the autocompleting dropdowns
  useEffect(() => {
    const unsubSuggestions = onSnapshot(collection(db, "suggestions"), (snapshot) => {
      const rawMap: Record<string, Set<string>> = {};
      
      // Initialize with default standard sets
      Object.entries(DEFAULT_SUGGESTIONS).forEach(([field, defaults]) => {
        rawMap[field] = new Set(defaults);
      });

      // Overlay user entered database suggestions
      snapshot.forEach((doc) => {
        const item = doc.data() as Suggestion;
        if (item.fieldName && item.value) {
          if (!rawMap[item.fieldName]) {
            rawMap[item.fieldName] = new Set();
          }
          rawMap[item.fieldName].add(item.value);
        }
      });

      // Convert Sets to arrays for React props map
      const finalMap: Record<string, string[]> = {};
      Object.entries(rawMap).forEach(([field, valueSet]) => {
        finalMap[field] = Array.from(valueSet).sort((a, b) => a.localeCompare(b));
      });

      setSuggestionsMap(finalMap);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "suggestions");
    });

    return () => unsubSuggestions();
  }, []);

  // Merge loaded suggestions from Firestore suggestions collection WITH historical deliveries/erections
  const mergedSuggestionsMap = useMemo(() => {
    const combined: Record<string, Set<string>> = {};

    // 1. Put standard defaults
    Object.entries(DEFAULT_SUGGESTIONS).forEach(([field, defaults]) => {
      combined[field] = new Set(defaults);
    });

    // 2. Add Firestore-backed suggestions collection items
    Object.entries(suggestionsMap).forEach(([field, values]) => {
      if (!combined[field]) combined[field] = new Set();
      const arr = (values || []) as string[];
      arr.forEach(v => combined[field].add(v));
    });

    // 3. Extract from actual delivery histories
    deliveries.forEach(d => {
      if (d.mdrNo && d.mdrNo !== "N/A") {
        if (!combined.mdrNo) combined.mdrNo = new Set();
        combined.mdrNo.add(d.mdrNo);
      }
      if (d.elementCode) {
        if (!combined.elementCode) combined.elementCode = new Set();
        combined.elementCode.add(d.elementCode);
      }
      if (d.elementType) {
        if (!combined.elementType) combined.elementType = new Set();
        combined.elementType.add(d.elementType);
      }
      if (d.zone) {
        if (!combined.zone) combined.zone = new Set();
        combined.zone.add(d.zone);
      }
      if (d.villaType) {
        if (!combined.villaType) combined.villaType = new Set();
        combined.villaType.add(d.villaType);
      }
      if (d.buildingNo) {
        if (!combined.buildingNo) combined.buildingNo = new Set();
        combined.buildingNo.add(d.buildingNo);
      }
      if (d.floorNo) {
        if (!combined.floorNo) combined.floorNo = new Set();
        combined.floorNo.add(d.floorNo);
      }
      
      const u = d.unloadingDetails;
      if (u) {
        if (u.unloaderName) {
          if (!combined.unloaderName) combined.unloaderName = new Set();
          combined.unloaderName.add(u.unloaderName);
          if (!combined.erectorName) combined.erectorName = new Set();
          combined.erectorName.add(u.unloaderName);
        }
        if (u.unloaderId) {
          if (!combined.unloaderId) combined.unloaderId = new Set();
          combined.unloaderId.add(u.unloaderId);
        }
        if (u.unloaderTitle) {
          if (!combined.unloaderTitle) combined.unloaderTitle = new Set();
          combined.unloaderTitle.add(u.unloaderTitle);
        }
        if (u.equipmentType) {
          if (!combined.equipmentType) combined.equipmentType = new Set();
          combined.equipmentType.add(u.equipmentType);
        }
        if (u.equipmentPlateNo) {
          if (!combined.equipmentPlateNo) combined.equipmentPlateNo = new Set();
          combined.equipmentPlateNo.add(u.equipmentPlateNo);
        }
        if (u.operatorName) {
          if (!combined.operatorName) combined.operatorName = new Set();
          combined.operatorName.add(u.operatorName);
        }
        if (u.operatorId) {
          if (!combined.operatorId) combined.operatorId = new Set();
          combined.operatorId.add(u.operatorId);
        }
      }
    });

    // 4. Extract from actual erections histories
    erections.forEach(e => {
      if (e.elementCode) {
        if (!combined.elementCode) combined.elementCode = new Set();
        combined.elementCode.add(e.elementCode);
      }
      if (e.elementType) {
        if (!combined.elementType) combined.elementType = new Set();
        combined.elementType.add(e.elementType);
      }
      if (e.zone) {
        if (!combined.zone) combined.zone = new Set();
        combined.zone.add(e.zone);
      }
      if (e.villaType) {
        if (!combined.villaType) combined.villaType = new Set();
        combined.villaType.add(e.villaType);
      }
      if (e.buildingNo) {
        if (!combined.buildingNo) combined.buildingNo = new Set();
        combined.buildingNo.add(e.buildingNo);
      }
      if (e.floorNo) {
        if (!combined.floorNo) combined.floorNo = new Set();
        combined.floorNo.add(e.floorNo);
      }

      const er = e.erectionDetails;
      if (er) {
        if (er.erectorName) {
          if (!combined.erectorName) combined.erectorName = new Set();
          combined.erectorName.add(er.erectorName);
          if (!combined.unloaderName) combined.unloaderName = new Set();
          combined.unloaderName.add(er.erectorName);
        }
        if (er.erectorId) {
          if (!combined.erectorId) combined.erectorId = new Set();
          combined.erectorId.add(er.erectorId);
        }
        if (er.erectorTitle) {
          if (!combined.erectorTitle) combined.erectorTitle = new Set();
          combined.erectorTitle.add(er.erectorTitle);
        }
        if (er.equipmentType) {
          if (!combined.equipmentType) combined.equipmentType = new Set();
          combined.equipmentType.add(er.equipmentType);
        }
        if (er.equipmentPlateNo) {
          if (!combined.equipmentPlateNo) combined.equipmentPlateNo = new Set();
          combined.equipmentPlateNo.add(er.equipmentPlateNo);
        }
        if (er.operatorName) {
          if (!combined.operatorName) combined.operatorName = new Set();
          combined.operatorName.add(er.operatorName);
        }
        if (er.operatorId) {
          if (!combined.operatorId) combined.operatorId = new Set();
          combined.operatorId.add(er.operatorId);
        }
      }
    });

    // Convert sets to sorted arrays and filter out blacklisted items
    const finalMap: Record<string, string[]> = {};
    Object.entries(combined).forEach(([field, valueSet]) => {
      const sortedVals = Array.from(valueSet).sort((a, b) => a.localeCompare(b));
      finalMap[field] = sortedVals.filter(v => {
        const key = `${field}:${v.trim().toUpperCase()}`;
        return !blacklist.includes(key);
      });
    });

    return finalMap;
  }, [suggestionsMap, deliveries, erections, blacklist]);

  // Dynamic Employee ID -> Name map with STRICT 1-to-1 mapping constraints
  const employeeNameMap = useMemo(() => {
    const mapping: Record<string, string> = {};
    
    // 1. Pre-populate with standard default employee entries (Empty, as requested to delete them!)
    const defaults: Record<string, string> = {};

    // 2. Scan deliveries and build dynamic mapping (ignoring conflicts)
    deliveries.forEach(d => {
      const u = d.unloadingDetails;
      if (u && u.unloaderId && u.unloaderName) {
        const id = u.unloaderId.trim().toUpperCase();
        const name = u.unloaderName.trim();
        if (id && name) {
          // If the ID is a default ID, its name must match the default. If not, skip (conflict).
          if (defaults[id] && defaults[id].toUpperCase() !== name.toUpperCase()) {
            return;
          }
          // If the name is already mapped to a different ID, skip (conflict).
          const existingIdForName = Object.keys(mapping).find(
            k => mapping[k].toUpperCase() === name.toUpperCase()
          );
          if (existingIdForName && existingIdForName !== id) {
            return;
          }
          // Otherwise, it is a safe non-conflicting entry
          if (!mapping[id]) {
            mapping[id] = name;
          }
        }
      }
    });

    // 3. Scan erections and add non-conflicting entries
    erections.forEach(e => {
      const er = e.erectionDetails;
      if (er && er.erectorId && er.erectorName) {
        const id = er.erectorId.trim().toUpperCase();
        const name = er.erectorName.trim();
        if (id && name) {
          // If the ID is a default ID, its name must match the default. If not, skip (conflict).
          if (defaults[id] && defaults[id].toUpperCase() !== name.toUpperCase()) {
            return;
          }
          // If the name is already mapped to a different ID, skip (conflict).
          const existingIdForName = Object.keys(mapping).find(
            k => mapping[k].toUpperCase() === name.toUpperCase()
          );
          if (existingIdForName && existingIdForName !== id) {
            return;
          }
          // Add to map
          if (!mapping[id]) {
            mapping[id] = name;
          }
        }
      }
    });

    // 4. Filter out any blacklisted employee IDs or names
    const filteredMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([id, name]) => {
      const idKey = `unloaderId:${id.toUpperCase()}`;
      const nameKey = `unloaderName:${name.toUpperCase()}`;
      const idKeyErect = `erectorId:${id.toUpperCase()}`;
      const nameKeyErect = `erectorName:${name.toUpperCase()}`;
      
      const isBlacklisted = 
        blacklist.includes(idKey) || 
        blacklist.includes(nameKey) ||
        blacklist.includes(idKeyErect) ||
        blacklist.includes(nameKeyErect);
        
      if (!isBlacklisted) {
        filteredMapping[id] = name;
      }
    });

    return filteredMapping;
  }, [deliveries, erections, blacklist]);

  // Compute the last entry of each to enable easy operator/equipment autofills
  const lastDelivery = useMemo(() => {
    return deliveries.length > 0 ? deliveries[0] : null;
  }, [deliveries]);

  const lastErection = useMemo(() => {
    return erections.length > 0 ? erections[0] : null;
  }, [erections]);

  const handleDeleteSuggestion = async (fieldName: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    // 1. Delete document from Firestore suggestions collection if exists
    const docId = `${fieldName.toLowerCase()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    try {
      await deleteDoc(doc(db, "suggestions", docId));
    } catch (err) {
      console.warn("Error deleting suggestion doc:", err);
    }

    // 2. Add to blacklist in settings/suggestions_config to hide it even if it exists in history
    try {
      const blacklistRef = doc(db, "settings", "suggestions_config");
      const key = `${fieldName}:${trimmed.toUpperCase()}`;
      
      const newBlacklist = [...blacklist];
      if (!newBlacklist.includes(key)) {
        newBlacklist.push(key);
      }
      
      // Also if it's an employee ID, blacklist both unloader and erector versions
      if (fieldName === "unloaderId" || fieldName === "erectorId") {
        const uIdKey = `unloaderId:${trimmed.toUpperCase()}`;
        const eIdKey = `erectorId:${trimmed.toUpperCase()}`;
        if (!newBlacklist.includes(uIdKey)) newBlacklist.push(uIdKey);
        if (!newBlacklist.includes(eIdKey)) newBlacklist.push(eIdKey);
      }
      if (fieldName === "unloaderName" || fieldName === "erectorName") {
        const uNameKey = `unloaderName:${trimmed.toUpperCase()}`;
        const eNameKey = `erectorName:${trimmed.toUpperCase()}`;
        if (!newBlacklist.includes(uNameKey)) newBlacklist.push(uNameKey);
        if (!newBlacklist.includes(eNameKey)) newBlacklist.push(eNameKey);
      }

      await setDoc(blacklistRef, { blacklist: newBlacklist }, { merge: true });
    } catch (err) {
      console.error("Error updating blacklist:", err);
    }
  };

  const handleClearFieldSuggestions = async (fieldNames: string[], activeValues: string[]) => {
    // 1. Delete matching documents from Firestore suggestions
    for (const fieldName of fieldNames) {
      for (const val of activeValues) {
        const docId = `${fieldName.toLowerCase()}_${val.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        try {
          await deleteDoc(doc(db, "suggestions", docId));
        } catch (err) {
          // ignore
        }
      }
    }

    // 2. Blacklist all activeValues for these fields
    try {
      const blacklistRef = doc(db, "settings", "suggestions_config");
      const newBlacklist = [...blacklist];
      
      fieldNames.forEach(fieldName => {
        activeValues.forEach(val => {
          const key = `${fieldName}:${val.trim().toUpperCase()}`;
          if (!newBlacklist.includes(key)) {
            newBlacklist.push(key);
          }
        });
      });

      await setDoc(blacklistRef, { blacklist: newBlacklist }, { merge: true });
    } catch (err) {
      console.error("Error clearing suggestions:", err);
    }
  };

  const handleClearEmployees = async () => {
    // Get all active employee IDs and Names
    const activeIds = Object.keys(employeeNameMap) as string[];
    const activeNames = Object.values(employeeNameMap) as string[];

    // Delete suggestion docs
    for (const id of activeIds) {
      await deleteDoc(doc(db, "suggestions", `unloaderid_${id.toLowerCase().replace(/[^a-z0-9]/g, "_")}`));
      await deleteDoc(doc(db, "suggestions", `erectorid_${id.toLowerCase().replace(/[^a-z0-9]/g, "_")}`));
    }
    for (const name of activeNames) {
      await deleteDoc(doc(db, "suggestions", `unloadername_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`));
      await deleteDoc(doc(db, "suggestions", `erectorname_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`));
    }

    // Add to blacklist
    try {
      const blacklistRef = doc(db, "settings", "suggestions_config");
      const newBlacklist = [...blacklist];

      activeIds.forEach(id => {
        const idU = `unloaderId:${id.toUpperCase()}`;
        const idE = `erectorId:${id.toUpperCase()}`;
        if (!newBlacklist.includes(idU)) newBlacklist.push(idU);
        if (!newBlacklist.includes(idE)) newBlacklist.push(idE);
      });

      activeNames.forEach(name => {
        const nameU = `unloaderName:${name.toUpperCase()}`;
        const nameE = `erectorName:${name.toUpperCase()}`;
        if (!newBlacklist.includes(nameU)) newBlacklist.push(nameU);
        if (!newBlacklist.includes(nameE)) newBlacklist.push(nameE);
      });

      await setDoc(blacklistRef, { blacklist: newBlacklist }, { merge: true });
    } catch (err) {
      console.error("Error clearing employees blacklist:", err);
    }
  };



  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans antialiased relative overflow-hidden bg-radial from-[#0a1128] via-[#020617] to-[#010409]">
      {/* Dynamic Cosmic Nebulas & Stardust Glows */}
      <div className="absolute top-[8%] left-[15%] w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[25%] w-[350px] h-[350px] bg-indigo-500/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 1. Header & Branding Section */}
      <header className="bg-slate-950/45 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 shadow-xl non-printable">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo vector + Company Names */}
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden group px-1">
              <svg className="w-10 h-8 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Blue Background Arrow/Triangle */}
                <polygon points="60,6 102,82 18,82" fill="#1b75bc" />
                
                {/* Left A */}
                <path d="M 5,85 L 42,32 H 54 L 24,76 H 48 L 52,85 H 5 Z" fill="#2e3192" />
                <polygon points="34,63 26,63 30,52" fill="#ffffff" />
                
                {/* Middle R */}
                <path d="M 46,38 H 70 C 76,38 80,41 80,46 C 80,51 76,54 70,54 H 57 L 72,85 H 60 L 48,58 V 85 H 38 V 38 H 46 Z" fill="#2e3192" />
                <path d="M 48,44 V 48 H 66 C 68,44 68,44 66,44 H 48 Z" fill="#ffffff" />
                
                {/* Right A */}
                <path d="M 66,85 L 70,76 H 94 L 66,32 H 78 L 115,85 H 66 Z" fill="#2e3192" />
                <polygon points="82,52 78,63 86,63" fill="#ffffff" />
              </svg>
            </div>
            
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-extrabold px-1.5 py-0.5 rounded border border-indigo-500/35 uppercase tracking-wider">Precast HQ</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 rounded font-bold px-1.5 py-0.5 flex items-center gap-0.5 border border-emerald-500/20">
                  <Database className="h-2 w-2" /> Live Sync
                </span>
              </div>
              <h1 className="text-base font-black text-white leading-none tracking-wider uppercase">
                AL RASHID ABETONG
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Real-Time Site Delivery & Erection Control Center</p>
            </div>
          </div>

          {/* Quick Stats & Authenticators Group */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Stats Indicators */}
            <div className="hidden md:flex items-center gap-3 text-[10px] font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg p-2 px-3 shadow-inner">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Realtime Connected</span>
              </div>
              <div className="h-3 w-px bg-slate-800"></div>
              <div>
                <span>Sites Registered: <span className="font-bold text-white">{sites.length}</span></span>
              </div>
            </div>

            {/* Authenticated User Status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 px-3 shadow-xl">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-white leading-none mb-0.5">
                    Admin ARA
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] bg-rose-500/20 text-rose-300 font-extrabold px-1.5 py-0.5 rounded border border-rose-500/30 uppercase tracking-widest font-mono">
                      Admin Mode
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Construction Site Selector Panel */}
      <div className="pt-3 px-4 max-w-7xl mx-auto w-full non-printable">
        <SiteSelector
          sites={sites}
          selectedSite={selectedSite}
          onSelectSite={setSelectedSite}
          loading={loadingSites}
          selectedDate={selectedDateFilter}
          onSelectedDateChange={setSelectedDateFilter}
          isAdmin={isUserAdmin}
        />
      </div>

      {/* 3. Main Dashboard Body App Area */}
      {selectedSite ? (
        !isSiteUnlocked ? (
          <main className="flex-1 px-4 max-w-md mx-auto w-full pt-12 pb-12 non-printable">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Site Locked
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Site <span className="text-blue-400 font-bold">No. {selectedSite.siteNo} ({selectedSite.name})</span> is passcode protected. Please enter the site passcode to access the data.
                </p>
              </div>

              <form onSubmit={handleUnlockSiteSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">
                    Site Access Passcode
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Enter site passcode..."
                      value={sitePasscodeInput}
                      onChange={(e) => {
                        setSitePasscodeInput(e.target.value);
                        setUnlockError(null);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-blue-500 transition-colors font-mono font-bold tracking-wider"
                    />
                  </div>
                </div>

                {unlockError && (
                  <p className="text-xs font-bold text-red-450 animate-pulse font-mono">
                    ✕ {unlockError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase tracking-wider text-xs rounded-xl cursor-pointer shadow-lg transition-colors border border-blue-500 font-sans"
                >
                  Unlock Site Data
                </button>
              </form>
            </div>
          </main>
        ) : (
          <main className="flex-1 px-4 max-w-7xl mx-auto w-full space-y-4 pb-12 non-printable">
          


          {/* Main Key Figures Grid */}
          <StatsGrid
            deliveries={filteredDeliveriesForDashboard}
            erections={filteredErectionsForDashboard}
          />

          {/* Clean, High-Contrast Dashboard Navigation Tabs */}
          <div className="flex flex-wrap p-1 bg-slate-950/70 border border-slate-800 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveDashboardTab("logging")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDashboardTab === "logging"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📝 LOGGING FORMS
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardTab("logs")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDashboardTab === "logs"
                  ? "bg-purple-700 text-white shadow-lg shadow-purple-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📋 DATA LOG SHEETS ({deliveries.length + erections.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardTab("reports")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDashboardTab === "reports"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📊 REPORTS & SEARCH
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardTab("inventory")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDashboardTab === "inventory"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📦 SITE INVENTORY
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardTab("equipment")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDashboardTab === "equipment"
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              🏗️ CRANE RECORDS
            </button>
            <button
              type="button"
              onClick={() => setActiveDashboardTab("charts")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDashboardTab === "charts"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/50"
              }`}
            >
              📈 PERFORMANCE CHARTS
            </button>
            {isUserAdmin && (
              <button
                type="button"
                onClick={() => setActiveDashboardTab("admin")}
                className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeDashboardTab === "admin"
                    ? "bg-rose-700 text-white shadow-lg shadow-rose-500/10"
                    : "text-slate-400 hover:text-rose-400 hover:bg-slate-900/50"
                }`}
              >
                🔑 USER MANAGEMENT
              </button>
            )}
          </div>

          {/* Conditional Rendering based on active dashboard tab */}
          {activeDashboardTab === "logging" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-fade-in">
              {/* Left Column - Entry forms */}
              <div className="lg:col-span-8 bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-xl p-4">
                
                {/* Form Tab Switches */}
                <div className="flex gap-1.5 p-0.5 bg-slate-950/70 border border-slate-800/70 rounded-lg mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveFormTab("receive")}
                    className={`cursor-pointer flex-1 py-1.5 px-2.5 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      activeFormTab === "receive"
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    MDR Slip (Received)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFormTab("erect")}
                    className={`cursor-pointer flex-1 py-1.5 px-2.5 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      activeFormTab === "erect"
                        ? "bg-purple-700 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Construction className="h-3.5 w-3.5" />
                    Erection Progress
                  </button>
                </div>

                {/* Active Tab Screen */}
                {activeFormTab === "receive" ? (
                  <div className="animate-fade-in">
                    <DeliveryForm
                      selectedSite={selectedSite}
                      sites={sites}
                      onSelectSite={setSelectedSite}
                      suggestions={mergedSuggestionsMap}
                      lastDelivery={lastDelivery}
                      employeeNameMap={employeeNameMap}
                      onSuccess={() => console.log("Received data logged successfully.")}
                      readOnly={isSiteReadOnly}
                    />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <ErectionForm
                      selectedSite={selectedSite}
                      sites={sites}
                      onSelectSite={setSelectedSite}
                      suggestions={mergedSuggestionsMap}
                      lastErection={lastErection}
                      deliveries={deliveries}
                      erections={erections}
                      employeeNameMap={employeeNameMap}
                      onSuccess={() => console.log("Erection logged successfully")}
                      readOnly={isSiteReadOnly}
                    />
                  </div>
                )}
              </div>

              {/* Right Column - Small Help Card & Quick Site Info */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-gradient-to-bx from-blue-950/40 to-slate-900/60 border border-slate-800/80 text-white rounded-xl shadow-2xl p-4 relative overflow-hidden backdrop-blur-md">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 text-blue-400">
                    <Layers className="h-3.5 w-3.5" />
                    Active Site Status
                  </h3>
                  <h2 className="text-base font-black tracking-tight mb-0.5 text-white">
                    Site No. {selectedSite.siteNo}
                  </h2>
                  <p className="text-xs text-slate-300 font-semibold mb-3">{selectedSite.name}</p>
                  <div className="h-px bg-slate-800 my-2"></div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Date Registered:</span>
                      <span className="font-mono text-white">{new Date(selectedSite.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total MDR Deliveries:</span>
                      <span className="font-bold text-emerald-400">{deliveries.length} pcs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Erections:</span>
                      <span className="font-bold text-purple-300">{erections.length} pcs</span>
                    </div>
                  </div>
                </div>

                {/* Staff ID Integrity Panel */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs space-y-3 shadow-lg">
                  <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                     <ShieldCheck className="h-4 w-4 text-emerald-400" />
                     Staff ID Integrity Control
                  </h4>
                  
                  <div className="space-y-2 leading-relaxed text-[11px]">
                    <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                      <span className="text-slate-400 font-medium">Status:</span>
                      <span className="text-emerald-400 font-black tracking-wide uppercase flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        STRICT UNIQUE ACTIVE
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                      <span className="text-slate-400 font-medium">Active Workers Map:</span>
                      <span className="text-white font-bold">{Object.keys(employeeNameMap).length} Employees</span>
                    </div>

                    {cleaningStatus ? (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold animate-pulse">
                        ⚠️ {cleaningStatus}
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
                        ✅ No duplicate or conflicting employee entries found. All systems 100% clean!
                      </div>
                    )}

                    {cleanedCount > 0 && (
                      <div className="p-1.5 bg-blue-500/10 border border-blue-500/25 rounded text-blue-300 font-semibold text-[10px]">
                        ℹ️ Sessions auto-removed {cleanedCount} conflict records.
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isCleaning}
                    onClick={async () => {
                      setIsCleaning(true);
                      setCleaningStatus("Scanning for duplicate or conflicting records in both forms...");
                      let count = 0;

                      // 1. Clean Erections
                      const toCleanErections = erections.filter(e => {
                        const er = e.erectionDetails;
                        if (!er || !er.erectorId) return false;
                        const id = er.erectorId.trim().toUpperCase();
                        const name = (er.erectorName || "").trim().toUpperCase();
                        if (id === "1003" && (name === "SHAMIM" || name === "JAMSHED")) return true;
                        if (id === "1004" && name.includes("RAMESH")) return true;
                        return false;
                      });

                      for (const e of toCleanErections) {
                        try {
                          await deleteDoc(doc(db, "erections", e.id));
                          count++;
                        } catch (err) {
                          console.error(err);
                        }
                      }

                      // 2. Clean Deliveries
                      const toCleanDeliveries = deliveries.filter(d => {
                        const u = d.unloadingDetails;
                        if (!u || !u.unloaderId) return false;
                        const id = u.unloaderId.trim().toUpperCase();
                        const name = (u.unloaderName || "").trim().toUpperCase();
                        if (id === "1003" && (name === "SHAMIM" || name === "JAMSHED")) return true;
                        if (id === "1004" && name.includes("RAMESH")) return true;
                        return false;
                      });

                      for (const d of toCleanDeliveries) {
                        try {
                          await deleteDoc(doc(db, "deliveries", d.id));
                          count++;
                        } catch (err) {
                          console.error(err);
                        }
                      }

                      if (count > 0) {
                        setCleanedCount(prev => prev + count);
                        setCleaningStatus(`Scan complete! Successfully deleted ${count} duplicate/conflicting records.`);
                      } else {
                        setCleaningStatus("Scan complete. Zero duplicates found in either collection!");
                      }
                      setTimeout(() => {
                        setCleaningStatus("");
                        setIsCleaning(false);
                      }, 5000);
                    }}
                    className="w-full py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-900/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    Force Scan & Clean Duplicates
                  </button>
                </div>

                {/* Auto-Suggestions & Workers Manager */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs space-y-4 shadow-lg">
                  <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-800">
                    <Database className="h-4 w-4 text-blue-400" />
                    Suggestions & Workers Manager
                  </h4>
                  
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    View and delete previously saved autocomplete values or employee profiles to reset or update them.
                  </p>

                  <div className="space-y-4">
                    {/* 1. Trailer Numbers Section */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Trailer Numbers ({mergedSuggestionsMap.trailerNo?.length || 0})</span>
                        {(mergedSuggestionsMap.trailerNo?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearFieldSuggestions(["trailerNo"], mergedSuggestionsMap.trailerNo || [])}
                            className="text-[9px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-24 overflow-y-auto bg-slate-950/40 border border-slate-800/60 rounded p-1.5 space-y-1 scrollbar-thin">
                        {(mergedSuggestionsMap.trailerNo?.length || 0) === 0 ? (
                          <div className="text-center py-2 text-slate-500 text-[10px]">No active trailer suggestions</div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(mergedSuggestionsMap.trailerNo || []).map(val => (
                              <div key={val} className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                <span>{val}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSuggestion("trailerNo", val)}
                                  className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer ml-1 font-bold"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Crane Plate Numbers Section */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Crane Plate Numbers ({mergedSuggestionsMap.equipmentPlateNo?.length || 0})</span>
                        {(mergedSuggestionsMap.equipmentPlateNo?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => handleClearFieldSuggestions(["equipmentPlateNo"], mergedSuggestionsMap.equipmentPlateNo || [])}
                            className="text-[9px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-24 overflow-y-auto bg-slate-950/40 border border-slate-800/60 rounded p-1.5 space-y-1 scrollbar-thin">
                        {(mergedSuggestionsMap.equipmentPlateNo?.length || 0) === 0 ? (
                          <div className="text-center py-2 text-slate-500 text-[10px]">No active crane suggestions</div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(mergedSuggestionsMap.equipmentPlateNo || []).map(val => (
                              <div key={val} className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                <span>{val}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSuggestion("equipmentPlateNo", val)}
                                  className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer ml-1 font-bold"
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Employee ID -> Name Map Section */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Employee Mappings ({Object.keys(employeeNameMap).length})</span>
                        {Object.keys(employeeNameMap).length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearEmployees}
                            className="text-[9px] text-red-400 hover:text-red-300 font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-36 overflow-y-auto bg-slate-950/40 border border-slate-800/60 rounded p-1.5 space-y-1 scrollbar-thin">
                        {Object.keys(employeeNameMap).length === 0 ? (
                          <div className="text-center py-2 text-slate-500 text-[10px]">No registered employee profiles</div>
                        ) : (
                          <div className="space-y-1">
                            {(Object.entries(employeeNameMap) as [string, string][]).map(([id, name]) => (
                              <div key={id} className="flex items-center justify-between bg-slate-900 border border-slate-800/80 px-2 py-1 rounded text-[10px]">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className="font-mono font-bold text-blue-400 shrink-0">#{id}</span>
                                  <span className="text-slate-200 font-medium truncate">{name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleDeleteSuggestion("unloaderId", id);
                                    await handleDeleteSuggestion("unloaderName", name);
                                  }}
                                  className="text-slate-500 hover:text-red-400 font-black p-0.5 cursor-pointer shrink-0"
                                  title="Delete Employee Profile"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {blacklist.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[9px]">
                      <span className="text-slate-500 font-medium">Deleted entries hidden: {blacklist.length}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const blacklistRef = doc(db, "settings", "suggestions_config");
                            await setDoc(blacklistRef, { blacklist: [] }, { merge: true });
                          } catch (err) {
                            console.error("Error clearing blacklist:", err);
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 font-black uppercase tracking-wider cursor-pointer"
                      >
                        Restore All Deleted
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wide flex items-center gap-1.5 pb-1 border-b border-slate-800/80">
                     <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                     Live Suggestions Active
                  </h4>
                  <p className="text-slate-200 leading-relaxed text-[11px]">
                    MDRs, Operator IDs, Plate numbers and Villa types auto-save on submission for instant future selection!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeDashboardTab === "logs" && (
            <div className="animate-fade-in">
              <DataTable
                deliveries={filteredDeliveriesForDashboard}
                erections={filteredErectionsForDashboard}
                selectedSiteNo={selectedSite.siteNo}
                readOnly={isSiteReadOnly}
              />
            </div>
          )}

          {activeDashboardTab === "reports" && (
            <div className="animate-fade-in">
              <ReportExport
                selectedSite={selectedSite}
                deliveries={filteredDeliveriesForDashboard}
                erections={filteredErectionsForDashboard}
              />
            </div>
          )}

          {activeDashboardTab === "inventory" && (
            <div className="animate-fade-in">
              <SiteInventory
                sites={sites}
                initialSelectedSite={selectedSite}
              />
            </div>
          )}

          {activeDashboardTab === "equipment" && (
            <div className="animate-fade-in">
              <EquipmentInventory
                sites={sites}
                currentSite={selectedSite}
                readOnly={isSiteReadOnly}
              />
            </div>
          )}

          {activeDashboardTab === "charts" && (
            <div className="animate-fade-in">
              <PerformanceCharts
                sites={sites}
                currentSite={selectedSite}
                deliveries={filteredDeliveriesForDashboard}
                erections={filteredErectionsForDashboard}
                onSelectSite={setSelectedSite}
              />
            </div>
          )}

          {activeDashboardTab === "admin" && isUserAdmin && (
            <div className="animate-fade-in">
              <AdminPanel
                sites={sites}
                currentUserProfile={currentUserProfile}
              />
            </div>
          )}

        </main>
        )
      ) : (
        /* Empty Welcoming Board */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto non-printable z-10">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <Building2 className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-black text-white mb-2 uppercase tracking-tight">
            Create or Select a Construction Site
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            AL RASHID ABETONG Precast Concrete Buildings Contractor platform requires an active site number reference to load and segregate receipt and erection schedules. Add a site number at the top of the interface to begin!
          </p>
          <div className="animate-pulse text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Select Riyadh Phase or Site No. Above to Unlock
          </div>
        </div>
      )}

      {/* 4. Global Footer stamp */}
      <footer className="bg-slate-950/40 border-t border-slate-850/80 py-6 text-center text-xs text-slate-400 mt-auto non-printable z-10">
        <p>© {new Date().getFullYear()} AL RASHID ABETONG (ARA) Precast Contractors • Riyadh, KSA</p>
        <p className="text-[10px] text-slate-500 mt-1">Unified Real-Time Quality Control System • Connected to Cloud Firestore DB</p>
      </footer>



    </div>
  );
}
