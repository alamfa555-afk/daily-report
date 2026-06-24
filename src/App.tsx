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

export default function App() {
  // State managers
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [erections, setErections] = useState<Erection[]>([]);
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, string[]>>({});
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  
  const [activeFormTab, setActiveFormTab] = useState<"receive" | "erect">("receive");

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

      // Auto select the first site if none selected yet
      if (loadedSites.length > 0 && !selectedSite) {
        setSelectedSite(loadedSites[0]);
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
            <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden group">
              <svg className="w-7 h-7 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Triangular blue pyramid */}
                <path d="M50 12 L88 78 H12 L50 12 Z" fill="#3b82f6" />
                {/* Internal stylized A letter white overlay */}
                <path d="M37 56 H63 L50 32 Z" fill="#ffffff" />
                {/* Deep purple base representing foundation */}
                <path d="M26 73 H74 L50 61 Z" fill="#a855f7" />
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

          {/* Form Entries & Layouts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left/Middle Column - Entry Workflows forms (Tabs) */}
            <div className="lg:col-span-8 bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-xl p-4">
              
              {/* Form Tab Switches */}
              <div className="flex gap-1.5 p-0.5 bg-slate-950/70 border border-slate-800/70 rounded-lg mb-3">
                <button
                  type="button"
                  onClick={() => setActiveFormTab("receive")}
                  className={`cursor-pointer flex-1 py-1 px-2.5 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                    activeFormTab === "receive"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Inbox className="h-3 w-3" />
                  MDR Slip (Received)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab("erect")}
                  className={`cursor-pointer flex-1 py-1 px-2.5 rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                    activeFormTab === "erect"
                      ? "bg-purple-700 text-white shadow-lg shadow-purple-500/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Construction className="h-3 w-3" />
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
                    onSuccess={() => console.log("Erection logged successfully")}
                  />
                </div>
              )}
            </div>

            {/* Right Column - Small Help Card & Quick Site Info */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-gradient-to-bx from-blue-950/60 to-purple-950/60 border border-slate-800/80 text-white rounded-2xl shadow-2xl p-6 relative overflow-hidden backdrop-blur-md">
                {/* Background SVG style accent */}
                <div className="absolute -right-16 -bottom-16 opacity-10">
                  <Building2 className="w-48 h-48" />
                </div>
                
                <h3 className="text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" />
                  Active Site Brief
                </h3>
                <h2 className="text-lg font-black tracking-tight mb-1">
                  Site. No {selectedSite.siteNo}
                </h2>
                <p className="text-xs text-blue-200/90 mb-4 font-semibold">{selectedSite.name}</p>
                <div className="h-px bg-blue-800/60 my-4"></div>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-200/75">Registration Date:</span>
                    <span className="font-mono font-medium">{new Date(selectedSite.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200/75">Deliveries Logged:</span>
                    <span className="font-bold text-emerald-400">{deliveries.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-200/75">Erections Logged:</span>
                    <span className="font-bold text-purple-300">{erections.length} items</span>
                  </div>
                </div>
              </div>

               <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-inner text-xs space-y-3">
                 <h4 className="font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    How suggestions save time
                 </h4>
                 <p className="text-slate-300 leading-relaxed">
                   Typing operator IDs, crane levels, plate numbers, or custom house references once adds them immediately. 
                   Next time, simply start typing or click the arrow to select instantly. Pre-filled rows also import previous values dynamically!
                 </p>
               </div>
            </div>
          </div>

          {/* Interactive Logs & Filtering Data-Tables */}
          <DataTable
            deliveries={filteredDeliveriesForDashboard}
            erections={filteredErectionsForDashboard}
            selectedSiteNo={selectedSite.siteNo}
          />

          {/* Reports generator, PDF Letterhead exports, CSV downloaders */}
          <ReportExport
            selectedSite={selectedSite}
            deliveries={filteredDeliveriesForDashboard}
            erections={filteredErectionsForDashboard}
          />

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

      {/* Active layout used exclusively for Printing (Hidden on screen, but readymade for browser print layout output) */}
      {selectedSite && (
        <div className="hidden printing-template absolute top-0 left-0 w-full bg-white text-black p-8 font-sans">
          <div className="border-b-4 border-blue-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10 L90 80 H10 L50 10 Z" fill="#1e40af" />
                    <path d="M35 55 H65 L50 30 Z" fill="#ffffff" />
                    <path d="M25 75 H75 L50 62 Z" fill="#581c87" />
                  </svg>
                  <div>
                    <h1 className="text-xl font-black text-blue-900 leading-none tracking-wider uppercase">
                      AL RASHID ABETONG
                    </h1>
                    <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-widest mt-1">
                      PRECAST CONCRETE BUILDINGS CONTRACTOR
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">Site Operations Summary Ledger</p>
              </div>
              <div className="text-right text-xs text-gray-650">
                <div className="font-extrabold text-sm text-blue-900">PROJECT SITE STATUS SUMMARY</div>
                <div>Date Generated: {new Date().toLocaleDateString()}</div>
                <div className="font-bold">Active Site: {selectedSite.siteNo} - {selectedSite.name}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs mb-8">
            <div className="border border-gray-300 rounded p-3">
              <span className="block text-gray-400 font-bold uppercase text-[9px] mb-1">TOTAL RECEIVED PRECAST</span>
              <span className="text-lg font-black text-blue-950">
                {deliveries.reduce((s, x) => s + (x.totalWeight || 0), 0).toFixed(2)} Tons
              </span>
              <span className="block text-[10px] text-gray-400 font-medium">({deliveries.reduce((s, x) => s + (x.quantity || 1), 0)} items total)</span>
            </div>

            <div className="border border-gray-300 rounded p-3">
              <span className="block text-gray-400 font-bold uppercase text-[9px] mb-1">TOTAL ERECTED PROGRESS</span>
              <span className="text-lg font-black text-purple-950">
                {erections.reduce((s, x) => s + (x.totalWeight || 0), 0).toFixed(2)} Tons
              </span>
              <span className="block text-[10px] text-gray-400 font-medium">({erections.reduce((s, x) => s + (x.quantity || 1), 0)} items erected)</span>
            </div>

            <div className="border border-gray-300 rounded p-3">
              <span className="block text-gray-400 font-bold uppercase text-[9px] mb-1">ON-SITE STOCK BALANCE</span>
              <span className="text-lg font-black text-indigo-950">
                {(deliveries.reduce((s, x) => s + (x.totalWeight || 0), 0) - erections.reduce((s, x) => s + (x.totalWeight || 0), 0)).toFixed(2)} Tons
              </span>
              <span className="block text-[10px] text-gray-400 font-medium">({deliveries.reduce((s, x) => s + (x.quantity || 1), 0) - erections.reduce((s, x) => s + (x.quantity || 1), 0)} elements stored)</span>
            </div>
          </div>

          {/* Table index layout */}
          <div className="mb-4">
            <h3 className="font-bold text-xs uppercase text-blue-900 border-b pb-1 mb-2">1. Site Received Catalog</h3>
            <table className="w-full text-[9px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold border-b text-gray-500">
                  <th className="p-1 px-2">MDR SLIP</th>
                  <th className="p-1 px-2">ELEMENT CODE</th>
                  <th className="p-1 px-2">TYPE</th>
                  <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                  <th className="p-1 px-2 text-center">QTY</th>
                  <th className="p-1 px-2 text-right">TOTAL T</th>
                  <th className="p-1 px-2">STATUS</th>
                  <th className="p-1 px-2">LOCATION (ZONE / VILLA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.length > 0 ? (
                  deliveries.map((d) => (
                    <tr key={d.id}>
                      <td className="p-1 px-2 font-bold">{d.mdrNo}</td>
                      <td className="p-1 px-2 font-mono text-blue-800">{d.elementCode}</td>
                      <td className="p-1 px-2">{d.elementType}</td>
                      <td className="p-1 px-2 text-right">{d.weight.toFixed(3)}</td>
                      <td className="p-1 px-2 text-center">{d.quantity}</td>
                      <td className="p-1 px-2 text-right font-bold">{d.totalWeight.toFixed(3)}</td>
                      <td className="p-1 px-2">{d.status.toUpperCase()}</td>
                      <td className="p-1 px-2 text-gray-600">{d.zone || "-"} / {d.villaType || "-"} / B:{d.buildingNo || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-2 text-center text-gray-400 italic">No received precasts registered on this ledger.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="font-bold text-xs uppercase text-purple-900 border-b pb-1 mb-2">2. Site Erection Progress</h3>
            <table className="w-full text-[9px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold border-b text-gray-500">
                  <th className="p-1 px-2">ELEMENT CODE</th>
                  <th className="p-1 px-2">TYPE</th>
                  <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                  <th className="p-1 px-2 text-center">QTY</th>
                  <th className="p-1 px-2 text-right">TOTAL T</th>
                  <th className="p-1 px-2">STATUS</th>
                  <th className="p-1 px-2">LOCATION (ZONE / VILLA / HOUSE)</th>
                  <th className="p-1 px-2">OPERATOR / CRANE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {erections.length > 0 ? (
                  erections.map((e) => (
                    <tr key={e.id}>
                      <td className="p-1 px-2 font-mono text-purple-800 font-semibold">{e.elementCode}</td>
                      <td className="p-1 px-2">{e.elementType}</td>
                      <td className="p-1 px-2 text-right">{e.weight.toFixed(3)}</td>
                      <td className="p-1 px-2 text-center">{e.quantity}</td>
                      <td className="p-1 px-2 text-right font-bold">{e.totalWeight.toFixed(3)}</td>
                      <td className="p-1 px-2">{e.status.toUpperCase()}</td>
                      <td className="p-1 px-2 text-gray-650">{e.zone || "-"} / {e.villaType || "-"} / H:{e.houseNo || "-"}</td>
                      <td className="p-1 px-2">{e.erectionDetails?.operatorName || "-"} / {e.erectionDetails?.equipmentType || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-2 text-center text-gray-400 italic">No installation records registered on this ledger.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-14 pt-4 border-t border-gray-250 flex justify-between text-[10px] text-gray-400">
            <div>AL RASHID ABETONG • Riyadh HQ, KSA • Official Field Record Document</div>
            <div className="text-right">Digital Verification Code: ARA-{selectedSite.siteNo}-SECURE</div>
          </div>
        </div>
      )}
    </div>
  );
}
