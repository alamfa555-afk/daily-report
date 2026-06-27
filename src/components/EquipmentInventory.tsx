import React, { useState, useEffect, useMemo } from "react";
import { db, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs } from "../lib/firebase";
import { Site, Equipment } from "../types";
import { 
  Loader2, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Wrench, 
  Building2, 
  Truck, 
  ShieldAlert, 
  Check, 
  X, 
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const drawARALogo = (doc: any, x: number, y: number, width: number, height: number) => {
  const drawAbsolutePolygon = (points: {x: number, y: number}[], style: string) => {
    if (points.length === 0) return;
    try {
      if (typeof doc.polygon === "function") {
        const relativePoints = [points[0]];
        for (let i = 1; i < points.length; i++) {
          relativePoints.push({
            x: points[i].x - points[i - 1].x,
            y: points[i].y - points[i - 1].y
          });
        }
        doc.polygon(relativePoints, style);
      } else {
        // Fallback: draw using lines
        doc.setLineWidth(0.5);
        for (let i = 0; i < points.length; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          doc.line(p1.x, p1.y, p2.x, p2.y);
        }
      }
    } catch (e) {
      console.error("drawAbsolutePolygon failed:", e);
    }
  };

  // Blue Background Arrow/Triangle (3 points)
  const pts1 = [
    { x: x + width * (60 / 120), y: y + height * (6 / 100) },
    { x: x + width * (102 / 120), y: y + height * (82 / 100) },
    { x: x + width * (18 / 120), y: y + height * (82 / 100) }
  ];
  doc.setFillColor(27, 117, 188); // #1b75bc
  try {
    doc.triangle(pts1[0].x, pts1[0].y, pts1[1].x, pts1[1].y, pts1[2].x, pts1[2].y, "F");
  } catch (e) {
    drawAbsolutePolygon(pts1, "F");
  }

  // Left A (6 points)
  const ptsLeftA = [
    { x: x + width * (5 / 120), y: y + height * (85 / 100) },
    { x: x + width * (42 / 120), y: y + height * (32 / 100) },
    { x: x + width * (54 / 120), y: y + height * (32 / 100) },
    { x: x + width * (24 / 120), y: y + height * (76 / 100) },
    { x: x + width * (48 / 120), y: y + height * (76 / 100) },
    { x: x + width * (52 / 120), y: y + height * (85 / 100) }
  ];
  doc.setFillColor(46, 49, 146); // #2e3192
  drawAbsolutePolygon(ptsLeftA, "F");

  // Left A cutout (3 points)
  const ptsLeftCutout = [
    { x: x + width * (34 / 120), y: y + height * (63 / 100) },
    { x: x + width * (26 / 120), y: y + height * (63 / 100) },
    { x: x + width * (30 / 120), y: y + height * (52 / 100) }
  ];
  doc.setFillColor(255, 255, 255);
  try {
    doc.triangle(ptsLeftCutout[0].x, ptsLeftCutout[0].y, ptsLeftCutout[1].x, ptsLeftCutout[1].y, ptsLeftCutout[2].x, ptsLeftCutout[2].y, "F");
  } catch (e) {
    drawAbsolutePolygon(ptsLeftCutout, "F");
  }

  // Middle R (13 points)
  const ptsR = [
    { x: x + width * (38 / 120), y: y + height * (38 / 100) },
    { x: x + width * (70 / 120), y: y + height * (38 / 100) },
    { x: x + width * (75 / 120), y: y + height * (39 / 100) },
    { x: x + width * (78.5 / 120), y: y + height * (41.5 / 100) },
    { x: x + width * (80 / 120), y: y + height * (46 / 100) },
    { x: x + width * (78.5 / 120), y: y + height * (50.5 / 100) },
    { x: x + width * (75 / 120), y: y + height * (53 / 100) },
    { x: x + width * (57 / 120), y: y + height * (54 / 100) },
    { x: x + width * (72 / 120), y: y + height * (85 / 100) },
    { x: x + width * (60 / 120), y: y + height * (85 / 100) },
    { x: x + width * (48 / 120), y: y + height * (58 / 100) },
    { x: x + width * (48 / 120), y: y + height * (85 / 100) },
    { x: x + width * (38 / 120), y: y + height * (85 / 100) }
  ];
  doc.setFillColor(46, 49, 146); // #2e3192
  drawAbsolutePolygon(ptsR, "F");

  // Middle R Cutout (4 points)
  const ptsRCutout = [
    { x: x + width * (48 / 120), y: y + height * (44 / 100) },
    { x: x + width * (66 / 120), y: y + height * (44 / 100) },
    { x: x + width * (66 / 120), y: y + height * (48 / 100) },
    { x: x + width * (48 / 120), y: y + height * (48 / 100) }
  ];
  doc.setFillColor(255, 255, 255);
  drawAbsolutePolygon(ptsRCutout, "F");

  // Right A (6 points)
  const ptsRightA = [
    { x: x + width * (66 / 120), y: y + height * (85 / 100) },
    { x: x + width * (70 / 120), y: y + height * (76 / 100) },
    { x: x + width * (94 / 120), y: y + height * (76 / 100) },
    { x: x + width * (66 / 120), y: y + height * (32 / 100) },
    { x: x + width * (78 / 120), y: y + height * (32 / 100) },
    { x: x + width * (115 / 120), y: y + height * (85 / 100) }
  ];
  doc.setFillColor(46, 49, 146); // #2e3192
  drawAbsolutePolygon(ptsRightA, "F");

  // Right A cutout (3 points)
  const ptsRightCutout = [
    { x: x + width * (82 / 120), y: y + height * (52 / 100) },
    { x: x + width * (78 / 120), y: y + height * (63 / 100) },
    { x: x + width * (86 / 120), y: y + height * (63 / 100) }
  ];
  doc.setFillColor(255, 255, 255);
  try {
    doc.triangle(ptsRightCutout[0].x, ptsRightCutout[0].y, ptsRightCutout[1].x, ptsRightCutout[1].y, ptsRightCutout[2].x, ptsRightCutout[2].y, "F");
  } catch (e) {
    drawAbsolutePolygon(ptsRightCutout, "F");
  }
};

interface EquipmentInventoryProps {
  sites: Site[];
  currentSite: Site | null;
}

const EQUIPMENT_TYPES = [
  "Mobile Crane",
  "Crawler Crane",
  "Forklift",
  "Manlift",
  "Tower Crane",
  "Boom Truck"
];

export default function EquipmentInventory({ sites, currentSite }: EquipmentInventoryProps) {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search and filter states
  const [searchSiteNo, setSearchSiteNo] = useState<string>("");

  // Form states
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Input states
  const [formSiteId, setFormSiteId] = useState<string>("");
  const [formEquipmentType, setFormEquipmentType] = useState<string>("Mobile Crane");
  const [formPlateNo, setFormPlateNo] = useState<string>("");
  const [formCapacity, setFormCapacity] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"rented" | "ARA">("ARA");
  const [formOwnerName, setFormOwnerName] = useState<string>("");

  // Developer Diagnostics State
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagDeliveries, setDiagDeliveries] = useState<any[]>([]);
  const [diagErections, setDiagErections] = useState<any[]>([]);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);

  const loadDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const delSnap = await getDocs(collection(db, "deliveries"));
      const loadedDels: any[] = [];
      delSnap.forEach((doc) => {
        loadedDels.push({ id: doc.id, ...doc.data() });
      });
      setDiagDeliveries(loadedDels);

      const ereSnap = await getDocs(collection(db, "erections"));
      const loadedEres: any[] = [];
      ereSnap.forEach((doc) => {
        loadedEres.push({ id: doc.id, ...doc.data() });
      });
      setDiagErections(loadedEres);
    } catch (err: any) {
      console.error("Failed to load diagnostics:", err);
    } finally {
      setDiagLoading(false);
    }
  };

  // Sync search state with the current selected site from App
  useEffect(() => {
    if (currentSite) {
      setSearchSiteNo(String(currentSite.siteNo || ""));
      setFormSiteId(currentSite.id);
    }
  }, [currentSite]);

  // Real-time listener for equipment records
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "equipment"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Equipment[] = [];
        snapshot.forEach((doc) => {
          loaded.push({
            ...(doc.data() as Omit<Equipment, "id">),
            id: doc.id
          });
        });
        setEquipmentList(loaded);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading equipment:", err);
        setErrorMsg("Failed to connect to the equipment database.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen in real-time to deliveries and erections and auto-sync cranes
  useEffect(() => {
    if (sites.length === 0) return;

    let isSyncingBackground = false;
    const runBackgroundSync = async () => {
      if (isSyncingBackground) return;
      isSyncingBackground = true;
      try {
        await handleAutoSyncCranes(true);
      } catch (e) {
        console.error("Background auto sync failed:", e);
      } finally {
        isSyncingBackground = false;
      }
    };

    // Listen to changes in both collections to auto-sync in real-time!
    const unsubDels = onSnapshot(collection(db, "deliveries"), () => {
      runBackgroundSync();
    });

    const unsubEres = onSnapshot(collection(db, "erections"), () => {
      runBackgroundSync();
    });

    return () => {
      unsubDels();
      unsubEres();
    };
  }, [sites]);

  // Helper helper to convert any Firestore date/timestamp/string format reliably
  const parseToIsoString = (val: any): string => {
    if (!val) return "1970-01-01T00:00:00.000Z";
    if (typeof val === "string") return val;
    if (typeof val.toDate === "function") {
      try {
        return val.toDate().toISOString();
      } catch (e) {}
    }
    if (val.seconds) {
      try {
        return new Date(val.seconds * 1000).toISOString();
      } catch (e) {}
    }
    try {
      return new Date(val).toISOString();
    } catch (e) {
      return "1970-01-01T00:00:00.000Z";
    }
  };

  // Scan previous site logs (Deliveries & Erections) and automatically sync/update cranes/equipment records
  const handleAutoSyncCranes = async (silent: boolean = false) => {
    if (!silent) setSyncing(true);
    try {
      // 1. Get all existing registered equipments as a Map by plate number
      const existingEquipMap = new Map<string, { id: string; siteId: string; siteNo: string; capacity: number; equipmentType: string; status: string; ownerName: string }>();
      let snapshot;
      try {
        const q = query(collection(db, "equipment"));
        snapshot = await getDocs(q);
      } catch (e: any) {
        console.error("Error reading equipment collection:", e);
        throw new Error(`[Equipment Collection] ${e.message || e}`);
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.plateNo) {
          existingEquipMap.set(data.plateNo.trim().toUpperCase(), {
            id: doc.id,
            siteId: data.siteId || "",
            siteNo: String(data.siteNo || ""),
            capacity: Number(data.capacity) || 0,
            equipmentType: data.equipmentType || "",
            status: data.status || "ARA",
            ownerName: data.ownerName || ""
          });
        }
      });

      // 2. Get deliveries and erections logs to build the map of latest logged cranes
      let delSnap;
      try {
        delSnap = await getDocs(collection(db, "deliveries"));
      } catch (e: any) {
        console.error("Error reading deliveries collection:", e);
        throw new Error(`[Deliveries Collection] ${e.message || e}`);
      }

      let ereSnap;
      try {
        ereSnap = await getDocs(collection(db, "erections"));
      } catch (e: any) {
        console.error("Error reading erections collection:", e);
        throw new Error(`[Erections Collection] ${e.message || e}`);
      }

      interface LoggedCrane {
        siteId: string;
        siteNo: string;
        equipmentType: string;
        plateNo: string;
        capacity: number;
        status: "ARA" | "rented";
        ownerName: string;
        createdAt: string;
      }

      const latestCranesMap = new Map<string, LoggedCrane>();

      // Read from deliveries
      delSnap.forEach((doc) => {
        const data = doc.data();
        const unloading = data.unloadingDetails;
        if (unloading && unloading.equipmentPlateNo && unloading.equipmentPlateNo.trim()) {
          const plate = unloading.equipmentPlateNo.trim().toUpperCase();
          
          // Robust site lookup: match by ID first, or by site number string (with fallback to data.siteNo)
          let siteObj = sites.find(s => s.id === data.siteId);
          if (!siteObj && (data.siteId || data.siteNo)) {
            const cleanIdStr = String(data.siteId || data.siteNo).trim().toLowerCase();
            if (cleanIdStr && cleanIdStr !== "undefined" && cleanIdStr !== "null") {
              siteObj = sites.find(s => {
                const sNo = String(s.siteNo || "").toLowerCase();
                if (sNo === cleanIdStr) return true;
                const digitsS = sNo.replace(/\D/g, "");
                const digitsClean = cleanIdStr.replace(/\D/g, "");
                return digitsS && digitsClean && digitsS === digitsClean;
              });
            }
          }
          
          const actualSiteId = siteObj ? siteObj.id : (data.siteId || "");
          const actualSiteNo = siteObj ? String(siteObj.siteNo) : String(data.siteNo || "N/A");
          
          let rawType = unloading.equipmentType || "Mobile Crane";
          let eqType = "Mobile Crane";
          if (rawType.toLowerCase().includes("crawler")) eqType = "Crawler Crane";
          else if (rawType.toLowerCase().includes("forklift")) eqType = "Forklift";
          else if (rawType.toLowerCase().includes("manlift")) eqType = "Manlift";
          else if (rawType.toLowerCase().includes("tower")) eqType = "Tower Crane";
          else if (rawType.toLowerCase().includes("boom")) eqType = "Boom Truck";
          else if (rawType.trim()) eqType = rawType.trim();

          const currentLogDate = parseToIsoString(data.createdAt || data.updatedAt);
          const existing = latestCranesMap.get(plate);
          if (!existing || currentLogDate > existing.createdAt) {
            const loggedStatus = unloading.equipmentStatus || "ARA";
            const loggedOwner = (unloading.operatorName || "").trim() ? `Operator: ${(unloading.operatorName || "").trim()}` : "";
            
            latestCranesMap.set(plate, {
              siteId: actualSiteId,
              siteNo: actualSiteNo,
              equipmentType: eqType,
              plateNo: plate,
              capacity: Number(unloading.capacity) || 25,
              status: loggedStatus,
              ownerName: loggedOwner,
              createdAt: currentLogDate
            });
          }
        }
      });

      // Read from erections
      ereSnap.forEach((doc) => {
        const data = doc.data();
        const erection = data.erectionDetails;
        if (erection && erection.equipmentPlateNo && erection.equipmentPlateNo.trim()) {
          const plate = erection.equipmentPlateNo.trim().toUpperCase();
          
          // Robust site lookup: match by ID first, or by site number string (with fallback to data.siteNo)
          let siteObj = sites.find(s => s.id === data.siteId);
          if (!siteObj && (data.siteId || data.siteNo)) {
            const cleanIdStr = String(data.siteId || data.siteNo).trim().toLowerCase();
            if (cleanIdStr && cleanIdStr !== "undefined" && cleanIdStr !== "null") {
              siteObj = sites.find(s => {
                const sNo = String(s.siteNo || "").toLowerCase();
                if (sNo === cleanIdStr) return true;
                const digitsS = sNo.replace(/\D/g, "");
                const digitsClean = cleanIdStr.replace(/\D/g, "");
                return digitsS && digitsClean && digitsS === digitsClean;
              });
            }
          }
          
          const actualSiteId = siteObj ? siteObj.id : (data.siteId || "");
          const actualSiteNo = siteObj ? String(siteObj.siteNo) : String(data.siteNo || "N/A");
          
          let rawType = erection.equipmentType || "Mobile Crane";
          let eqType = "Mobile Crane";
          if (rawType.toLowerCase().includes("crawler")) eqType = "Crawler Crane";
          else if (rawType.toLowerCase().includes("forklift")) eqType = "Forklift";
          else if (rawType.toLowerCase().includes("manlift")) eqType = "Manlift";
          else if (rawType.toLowerCase().includes("tower")) eqType = "Tower Crane";
          else if (rawType.toLowerCase().includes("boom")) eqType = "Boom Truck";
          else if (rawType.trim()) eqType = rawType.trim();

          const currentLogDate = parseToIsoString(data.createdAt || data.updatedAt);
          const existing = latestCranesMap.get(plate);
          if (!existing || currentLogDate > existing.createdAt) {
            const loggedStatus = erection.equipmentStatus || "ARA";
            const loggedOwner = (erection.operatorName || "").trim() ? `Operator: ${(erection.operatorName || "").trim()}` : "";
            
            latestCranesMap.set(plate, {
              siteId: actualSiteId,
              siteNo: actualSiteNo,
              equipmentType: eqType,
              plateNo: plate,
              capacity: Number(erection.capacity) || 25,
              status: loggedStatus,
              ownerName: loggedOwner,
              createdAt: currentLogDate
            });
          }
        }
      });

      // 3. Process changes (Insert new ones, or update sites/info of existing ones)
      let updateCount = 0;
      let insertCount = 0;

      for (const [plate, logged] of latestCranesMap.entries()) {
        const existing = existingEquipMap.get(plate);
        if (existing) {
          // If any field changed, update the record
          if (
            existing.siteId !== logged.siteId || 
            existing.siteNo !== logged.siteNo ||
            existing.capacity !== logged.capacity || 
            existing.equipmentType !== logged.equipmentType ||
            existing.status !== logged.status ||
            existing.ownerName !== logged.ownerName
          ) {
            await updateDoc(doc(db, "equipment", existing.id), {
              siteId: logged.siteId,
              siteNo: logged.siteNo,
              equipmentType: logged.equipmentType,
              capacity: logged.capacity,
              status: logged.status,
              ownerName: logged.ownerName,
              updatedAt: new Date().toISOString()
            });
            updateCount++;
          }
        } else {
          // Add as a completely new equipment record
          await addDoc(collection(db, "equipment"), {
            siteId: logged.siteId,
            siteNo: logged.siteNo,
            equipmentType: logged.equipmentType,
            plateNo: logged.plateNo,
            capacity: logged.capacity,
            status: logged.status,
            ownerName: logged.ownerName,
            createdAt: logged.createdAt,
            updatedAt: new Date().toISOString()
          });
          insertCount++;
        }
      }

      if (!silent) {
        if (insertCount > 0 || updateCount > 0) {
          setSuccessMsg(`⚡ Synchronized successfully: Registered ${insertCount} new cranes and updated ${updateCount} existing crane deployments!`);
        } else {
          setSuccessMsg("⚡ Site logs are fully synchronized. Zero new or shifted crane records found.");
        }
      }
    } catch (err: any) {
      console.error("Auto sync failed:", err);
      const friendlyMessage = err?.message || String(err);
      if (!silent) {
        setErrorMsg(`Failed to synchronize crane records from logs: ${friendlyMessage}`);
      } else {
        setErrorMsg(`Initial background sync failed: ${friendlyMessage}`);
      }
    } finally {
      if (!silent) setSyncing(false);
    }
  };

  // Filtered equipment by Site Number (case insensitive search)
  const filteredEquipment = useMemo(() => {
    const cleanSearchStr = String(searchSiteNo || "").trim().toLowerCase();
    if (!cleanSearchStr) return equipmentList;
    return equipmentList.filter((eq) => {
      const site = sites.find((s) => s.id === eq.siteId);
      const actualSiteNo = String(site ? site.siteNo : (eq.siteNo || "")).trim().toLowerCase();
      return actualSiteNo.includes(cleanSearchStr);
    });
  }, [equipmentList, searchSiteNo, sites]);

  // Find site detail helper
  const getSiteName = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site ? site.name : "Unknown Site";
  };

  const getSiteNo = (siteId: string) => {
    const site = sites.find((s) => s.id === siteId);
    return site ? site.siteNo : "N/A";
  };

  // Reset form helper
  const resetForm = () => {
    setFormEquipmentType("Mobile Crane");
    setFormPlateNo("");
    setFormCapacity("");
    setFormStatus("ARA");
    setFormOwnerName("");
    setEditingId(null);
  };

  // Handle Create / Update action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formSiteId) {
      setErrorMsg("Please select a Construction Site.");
      return;
    }
    if (!formEquipmentType.trim()) {
      setErrorMsg("Please enter or select an Equipment Type.");
      return;
    }
    if (!formPlateNo.trim()) {
      setErrorMsg("Please enter a Plate Number.");
      return;
    }
    if (!formCapacity || isNaN(Number(formCapacity)) || Number(formCapacity) <= 0) {
      setErrorMsg("Please enter a valid capacity in Tons.");
      return;
    }
    if (formStatus === "rented" && !formOwnerName.trim()) {
      setErrorMsg("Please enter the Rental Owner/Company Name.");
      return;
    }

    const selectedSiteObj = sites.find((s) => s.id === formSiteId);
    if (!selectedSiteObj) {
      setErrorMsg("Selected site is invalid.");
      return;
    }

    const payload = {
      siteId: formSiteId,
      siteNo: selectedSiteObj.siteNo,
      equipmentType: formEquipmentType.trim(),
      plateNo: formPlateNo.trim().toUpperCase(),
      capacity: Number(formCapacity),
      status: formStatus,
      ownerName: formStatus === "rented" ? formOwnerName.trim() : "",
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        // Update mode
        await updateDoc(doc(db, "equipment", editingId), payload);
        setSuccessMsg("Equipment record updated successfully!");
        setEditingId(null);
      } else {
        // Add mode
        await addDoc(collection(db, "equipment"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setSuccessMsg("New Equipment record created successfully!");
      }
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to save the equipment record: ${err?.message || String(err)}`);
    }
  };

  // Edit item trigger
  const handleEditClick = (item: Equipment) => {
    setEditingId(item.id);
    setFormSiteId(item.siteId);
    setFormEquipmentType(item.equipmentType);
    setFormPlateNo(item.plateNo);
    setFormCapacity(String(item.capacity));
    setFormStatus(item.status);
    setFormOwnerName(item.ownerName || "");
    setShowAddForm(true);
    // Scroll to form nicely
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  // Delete record
  const handleDeleteClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this equipment record?")) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await deleteDoc(doc(db, "equipment", id));
      setSuccessMsg("Equipment record deleted successfully.");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete the equipment record.");
    }
  };

  // CSV Downloader
  const handleDownloadCSV = () => {
    if (filteredEquipment.length === 0) {
      setErrorMsg("No equipment records to download.");
      return;
    }

    let csvContent = "Site No,Site Name,Equipment Type,Plate No,Capacity (Tons),Status,Last Updated\n";
    filteredEquipment.forEach((eq) => {
      const siteName = getSiteName(eq.siteId);
      const siteNoVal = getSiteNo(eq.siteId);
      const row = [
        `"${siteNoVal}"`,
        `"${siteName}"`,
        `"${eq.equipmentType}"`,
        `"${eq.plateNo}"`,
        eq.capacity,
        `"${eq.status === "ARA" ? "Al Rashid Abetong (ARA)" : "Rented"}"`,
        `"${new Date(eq.updatedAt).toLocaleString()}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ARA_Crane_Equipment_Records_Site_${searchSiteNo || "All"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Downloader for Crane Log
  const handleDownloadPDF = () => {
    if (filteredEquipment.length === 0) {
      setErrorMsg("No equipment records to download.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const textDark = [15, 23, 42];

    // 1. Draw Centered ARA Logo
    const logoWidth = 18;
    const logoHeight = 14;
    const logoX = (210 - logoWidth) / 2; // ~96mm
    const logoY = 8;
    drawARALogo(doc, logoX, logoY, logoWidth, logoHeight);

    // 2. Company Name Center (AL RASHID ABETONG)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(27, 38, 59); // deep corporate blue/slate
    doc.text("AL RASHID ABETONG", 105, 27, { align: "center" });

    // 3. Subtitle Center (THE PRECAST COMPANY)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(115, 115, 115); // neutral gray
    doc.text("THE PRECAST COMPANY", 105, 31, { align: "center" });

    // 4. Report Title Center
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("CRANE & EQUIPMENT DEPLOYMENT REPORT", 105, 37, { align: "center" });

    // 5. Divider Line
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.4);
    doc.line(12, 40, 198, 40);

    // 6. Draw details on both sides
    // Left side details (Aligned Left starting at X = 12)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("ACTIVE SITE:", 12, 45);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    const siteText = searchSiteNo ? `Site No. ${searchSiteNo}` : "ALL ACTIVE SITES";
    doc.text(siteText, 32, 45);

    // Right side details (Aligned Left starting at X = 135)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("GENERATED DATE:", 135, 45);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString(), 165, 45);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("OPERATIONS:", 135, 49.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("HEAVY CRANES & VEHICLES", 165, 49.5);

    const tableRows: any[] = [];
    filteredEquipment.forEach((eq, index) => {
      const siteName = getSiteName(eq.siteId);
      const siteNoVal = getSiteNo(eq.siteId);
      tableRows.push([
        index + 1,
        siteNoVal,
        siteName,
        eq.equipmentType,
        eq.plateNo,
        `${eq.capacity} Tons`,
        eq.status === "ARA" ? "Al Rashid Abetong (ARA)" : `Rented (${eq.ownerName || "N/A"})`,
        new Date(eq.updatedAt).toLocaleDateString()
      ]);
    });

    autoTable(doc, {
      startY: 55,
      head: [["S.No", "Site No", "Site Location / Name", "Equipment Type", "Plate No", "Capacity", "Status / Ownership", "Last Updated"]],
      body: tableRows,
      theme: "striped",
      headStyles: {
        fillColor: [217, 119, 6],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "left"
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [254, 252, 243]
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 15 },
        2: { cellWidth: 45 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 40 },
        7: { cellWidth: 20 }
      },
      margin: { left: 12, right: 12 }
    });

    doc.save(`ARA_Crane_Equipment_Report_Site_${searchSiteNo || "All"}.pdf`);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-200">
      
      {/* Alert Notices */}
      {errorMsg && (
        <div className="mb-4 p-3.5 text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-2xl flex justify-between items-center animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-450" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 font-extrabold text-sm">×</button>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 text-xs text-emerald-200 bg-emerald-500/15 border border-emerald-500/25 rounded-2xl flex justify-between items-center animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200 font-extrabold text-sm">×</button>
        </div>
      )}

      {/* Title & Introduction Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/50 p-4 border border-slate-850 rounded-2xl mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Crane & Equipment Deployment Directory
            </h4>
            <p className="text-xs text-slate-400">
              Track mobile cranes, crawler cranes, forklifts, manlifts on sites, their plate numbers, capacities, and rental status.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Main Action buttons */}
          <button
            onClick={() => handleAutoSyncCranes(false)}
            disabled={syncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01]"
            title="Automatically scan all deliveries & erections reports to fetch and list logged cranes"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Scanning..." : "Sync from Site Logs"}
          </button>

          <button
            onClick={() => {
              if (showAddForm && editingId) {
                resetForm();
              }
              setShowAddForm(!showAddForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer transition-all hover:scale-[1.01]"
          >
            {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddForm ? "Cancel Form" : "Log New Equipment"}
          </button>
          
          <button
            onClick={handleDownloadCSV}
            disabled={filteredEquipment.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={filteredEquipment.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer transition-all disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01]"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Interactive Collapsible Create/Edit Form */}
      {showAddForm && (
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 mb-4 animate-fade-in">
          <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-2 mb-3.5 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-400" />
            {editingId ? "Modify Equipment Record" : "Register Crane / Heavy Equipment Deployment"}
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Site Picker */}
            <div className="md:col-span-4 flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Construction Site *
              </label>
              <select
                value={formSiteId}
                onChange={(e) => setFormSiteId(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer [&_option]:bg-slate-950"
              >
                <option value="">-- Select Active Project --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    Site No. {s.siteNo} {s.name ? `- ${s.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Type Dropdown + Custom Field option */}
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Equipment Type *
              </label>
              <div className="flex gap-1.5">
                <select
                  value={EQUIPMENT_TYPES.includes(formEquipmentType) ? formEquipmentType : "Other"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Other") {
                      setFormEquipmentType("");
                    } else {
                      setFormEquipmentType(val);
                    }
                  }}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer [&_option]:bg-slate-950 flex-1"
                >
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="Other">Other / Custom</option>
                </select>

                {!EQUIPMENT_TYPES.includes(formEquipmentType) && (
                  <input
                    type="text"
                    placeholder="Enter Custom Type..."
                    value={formEquipmentType}
                    onChange={(e) => setFormEquipmentType(e.target.value)}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                  />
                )}
              </div>
            </div>

            {/* Plate Number */}
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Plate Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 1234-XYZ"
                value={formPlateNo}
                onChange={(e) => setFormPlateNo(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold placeholder:text-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase font-mono"
              />
            </div>

            {/* Capacity (Ton) */}
            <div className="md:col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Capacity (Ton) *
              </label>
              <input
                type="number"
                step="any"
                placeholder="Tons"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold placeholder:text-slate-650 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Ownership Status Rented / ARA Dropdown */}
            <div className={`${formStatus === "rented" ? "md:col-span-1" : "md:col-span-2"} flex flex-col gap-1`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Status (Ownership) *
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as "rented" | "ARA")}
                className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer [&_option]:bg-slate-950"
              >
                <option value="ARA">Al Rashid (ARA)</option>
                <option value="rented">Rented</option>
              </select>
            </div>

            {/* Dynamic Owner Name Field */}
            {formStatus === "rented" && (
              <div className="md:col-span-1 flex flex-col gap-1 animate-fade-in">
                <label className="text-[10px] font-black text-amber-450 uppercase tracking-wider">
                  Owner / Rental Co. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Faris"
                  value={formOwnerName}
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  className="bg-slate-900/90 border border-amber-500/25 rounded-xl px-3 py-2.5 text-xs text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                />
              </div>
            )}

            {/* Submission triggers */}
            <div className="col-span-1 md:col-span-12 flex justify-end gap-2 mt-2 pt-2 border-t border-slate-850">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowAddForm(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs uppercase cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-5 rounded-xl text-xs uppercase cursor-pointer"
              >
                {editingId ? "Save Changes" : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Filter Header (Entering Site Number displays all the equipment records) */}
      <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 relative">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="🔍 Search / Filter by Site No... (e.g. 102)"
              value={searchSiteNo}
              onChange={(e) => setSearchSiteNo(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white font-bold placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchSiteNo && (
              <button
                type="button"
                onClick={() => setSearchSiteNo("")}
                className="absolute right-3.5 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              Quick Filter:
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSearchSiteNo("")}
                className={`py-1 px-2 text-[10px] rounded font-bold transition-all uppercase ${
                  searchSiteNo === ""
                    ? "bg-slate-850 text-white border border-slate-700"
                    : "bg-slate-900 text-slate-450 hover:text-white"
                }`}
              >
                Show All Sites
              </button>
              {sites.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSearchSiteNo(s.siteNo)}
                  className={`py-1 px-2 text-[10px] rounded font-bold transition-all ${
                    searchSiteNo === s.siteNo
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                      : "bg-slate-900 text-slate-450 hover:text-white"
                  }`}
                >
                  Site {s.siteNo}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main List Rendering */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-7 w-7 text-amber-500" />
          <span className="text-xs uppercase tracking-widest">Querying Equipment Deployment Records...</span>
        </div>
      ) : (
        <div className="bg-slate-950/40 rounded-2xl border border-slate-850 overflow-hidden">
          <div className="p-3 bg-slate-950/70 border-b border-slate-850 flex justify-between items-center flex-wrap gap-2">
            <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              Deployment Records for Site No: {searchSiteNo ? `"${searchSiteNo}"` : "All Registered Sites"}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              ({filteredEquipment.length} Deployments Found)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/30 text-slate-400 border-b border-slate-850 text-[10px] font-black uppercase tracking-wider">
                  <th className="p-3 px-4">Site No.</th>
                  <th className="p-3">Site Location / Name</th>
                  <th className="p-3">Equipment Type</th>
                  <th className="p-3">Plate No.</th>
                  <th className="p-3 text-center">Capacity (Ton)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 font-mono text-[11px]">
                {filteredEquipment.length > 0 ? (
                  filteredEquipment.map((eq) => {
                    const siteName = getSiteName(eq.siteId);
                    return (
                      <tr key={eq.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="p-3 px-4 font-bold text-blue-400">
                          Site {getSiteNo(eq.siteId)}
                        </td>
                        <td className="p-3 text-slate-300 font-sans font-medium max-w-[200px] truncate" title={siteName}>
                          {siteName}
                        </td>
                        <td className="p-3 text-white font-sans font-bold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
                          {eq.equipmentType}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-200">
                          {eq.plateNo}
                        </td>
                        <td className="p-3 text-center text-emerald-400 font-extrabold font-mono">
                          {eq.capacity} Tons
                        </td>
                        <td className="p-3 text-center font-sans">
                          {eq.status === "ARA" ? (
                            <span className="bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider inline-block">
                              ARA (Al Rashid)
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider inline-block">
                                Rented
                              </span>
                              {eq.ownerName && (
                                <span className="text-[10px] text-slate-400 font-sans font-bold bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800" title="Rental Company Name">
                                  👤 {eq.ownerName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(eq)}
                              className="p-1 bg-slate-900 hover:bg-blue-600/20 text-slate-400 hover:text-blue-300 border border-slate-800 rounded transition-all cursor-pointer"
                              title="Edit Equipment Record"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(eq.id)}
                              className="p-1 bg-slate-900 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 border border-slate-800 rounded transition-all cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500 italic font-sans text-xs">
                      {searchSiteNo 
                        ? `No crane or equipment records registered under Site No. "${searchSiteNo}".` 
                        : "No cranes or heavy equipment deployments registered yet. Click 'Log New Equipment' above to start!"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collapsible Diagnostics Section */}
      <div className="mt-8 border border-slate-800 rounded-3xl overflow-hidden bg-slate-950/20 non-printable">
        <button
          type="button"
          onClick={() => {
            const nextVal = !showDiagnostics;
            setShowDiagnostics(nextVal);
            if (nextVal) {
              loadDiagnostics();
            }
          }}
          className="w-full flex items-center justify-between p-4 px-5 text-left text-xs font-bold text-slate-400 bg-slate-900/40 hover:bg-slate-900/60 transition-all focus:outline-none cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            🔍 SYSTEM DATABASE INSPECTOR (DEVELOPER DIAGNOSTICS)
          </span>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
            {showDiagnostics ? "Collapse" : "Expand"}
          </span>
        </button>

        {showDiagnostics && (
          <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 animate-fade-in flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-800/50 rounded-2xl">
              <div>
                <h5 className="text-xs font-black text-white uppercase tracking-wider">
                  Live Firestore Diagnostics
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  See raw, unfiltered collections from the Firestore database to diagnose any data entry or sync conflicts.
                </p>
              </div>
              <button
                type="button"
                onClick={loadDiagnostics}
                disabled={diagLoading}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 font-bold py-1.5 px-3 rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {diagLoading ? "Loading..." : "Reload Raw Collections"}
              </button>
            </div>

            {diagLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Deliveries Logs */}
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-2">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                      🚚 Raw Delivery Logs ({diagDeliveries.length})
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1.5 divide-y divide-slate-900/50">
                    {diagDeliveries.length > 0 ? (
                      diagDeliveries.map((d, idx) => (
                        <div key={d.id || idx} className="pt-1.5 first:pt-0">
                          <div className="font-sans font-bold text-white flex justify-between">
                            <span>MDR: {d.mdrNo || "N/A"} (Site {d.siteNo || "N/A"})</span>
                            <span className="text-slate-500">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "No Date"}</span>
                          </div>
                          <div className="text-slate-450 mt-0.5">
                            Plate: <span className="text-blue-400 font-bold">{d.unloadingDetails?.equipmentPlateNo || "None"}</span> | Type: {d.unloadingDetails?.equipmentType || "None"} ({d.unloadingDetails?.capacity || "0"}T)
                          </div>
                          <div className="text-slate-600 text-[9px] mt-0.5 truncate">
                            ID: {d.id} | siteId: {d.siteId}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500 italic block py-2">No raw delivery logs found in Firestore.</span>
                    )}
                  </div>
                </div>

                {/* Erections Logs */}
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-2">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                      🏗️ Raw Erection Logs ({diagErections.length})
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1.5 divide-y divide-slate-900/50">
                    {diagErections.length > 0 ? (
                      diagErections.map((e, idx) => (
                        <div key={e.id || idx} className="pt-1.5 first:pt-0">
                          <div className="font-sans font-bold text-white flex justify-between">
                            <span>ER: {e.mdrNo || "N/A"} (Site {e.siteNo || "N/A"})</span>
                            <span className="text-slate-500">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "No Date"}</span>
                          </div>
                          <div className="text-slate-450 mt-0.5">
                            Plate: <span className="text-blue-400 font-bold">{e.erectionDetails?.equipmentPlateNo || "None"}</span> | Type: {e.erectionDetails?.equipmentType || "None"} ({e.erectionDetails?.capacity || "0"}T)
                          </div>
                          <div className="text-slate-600 text-[9px] mt-0.5 truncate">
                            ID: {e.id} | siteId: {e.siteId}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500 italic block py-2">No raw erection logs found in Firestore.</span>
                    )}
                  </div>
                </div>

                {/* Equipment Directory */}
                <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/60 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-2">
                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">
                      🛠️ Registered Equipment Collection ({equipmentList.length})
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1.5 divide-y divide-slate-900/50">
                    {equipmentList.length > 0 ? (
                      equipmentList.map((eq) => (
                        <div key={eq.id} className="pt-1.5 first:pt-0 flex flex-wrap justify-between gap-2">
                          <div>
                            <span className="text-blue-300 font-bold">{eq.plateNo}</span> ({eq.equipmentType} - {eq.capacity}T)
                            <div className="text-slate-500 mt-0.5 text-[9px]">
                              DocID: {eq.id} | siteId: {eq.siteId} | siteNo: {eq.siteNo}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 font-sans">Deployed: Site {eq.siteNo}</span>
                            <div className="text-slate-600 text-[9px] mt-0.5">
                              Status: {eq.status} | Owner: {eq.ownerName || "None"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-500 italic block py-2">No registered equipment records found.</span>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
