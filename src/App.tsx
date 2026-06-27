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
  CheckCircle2
} from "lucide-react";
import { Site, Delivery, Erection, Suggestion } from "./types";
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType } from "./lib/firebase";
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

export default function App() {
  // State managers
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [erections, setErections] = useState<Erection[]>([]);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, string[]>>({});
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  
  const [activeFormTab, setActiveFormTab] = useState<"receive" | "erect">("receive");
  const [activeDashboardTab, setActiveDashboardTab] = useState<"logging" | "logs" | "reports" | "inventory" | "equipment" | "charts">("logging");

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
  
  // Loaders
  const [loadingSites, setLoadingSites] = useState(true);

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

    // Convert sets to sorted arrays
    const finalMap: Record<string, string[]> = {};
    Object.entries(combined).forEach(([field, valueSet]) => {
      finalMap[field] = Array.from(valueSet).sort((a, b) => a.localeCompare(b));
    });

    return finalMap;
  }, [suggestionsMap, deliveries, erections]);

  // Dynamic Employee ID -> Name map to enable instant auto-fill when matching ID is entered
  const employeeNameMap = useMemo(() => {
    const mapping: Record<string, string> = {};
    
    // Scan deliveries
    deliveries.forEach(d => {
      const u = d.unloadingDetails;
      if (u && u.unloaderId && u.unloaderName) {
        const id = u.unloaderId.trim().toUpperCase();
        const name = u.unloaderName.trim();
        if (id && name) {
          mapping[id] = name;
        }
      }
    });

    // Scan erections
    erections.forEach(e => {
      const er = e.erectionDetails;
      if (er && er.erectorId && er.erectorName) {
        const id = er.erectorId.trim().toUpperCase();
        const name = er.erectorName.trim();
        if (id && name) {
          mapping[id] = name;
        }
      }
    });

    return mapping;
  }, [deliveries, erections]);

  // Compute the last entry of each to enable easy operator/equipment autofills
  const lastDelivery = useMemo(() => {
    return deliveries.length > 0 ? deliveries[0] : null;
  }, [deliveries]);

  const lastErection = useMemo(() => {
    return erections.length > 0 ? erections[0] : null;
  }, [erections]);

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

          {/* Quick Stats Indicators */}
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 rounded-lg p-2 px-3 shadow-inner">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Realtime Connected</span>
            </div>
            <div className="h-3 w-px bg-slate-800"></div>
            <div>
              <span>Sites Registered: <span className="font-bold text-white">{sites.length}</span></span>
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
        />
      </div>

      {/* 3. Main Dashboard Body App Area */}
      {selectedSite ? (
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
                      employeeNameMap={employeeNameMap}
                      onSuccess={() => console.log("Erection logged successfully")}
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

        </main>
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
