import React, { useState, useEffect, useMemo } from "react";
import { db, collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "../lib/firebase";
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
  FileSpreadsheet
} from "lucide-react";

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

  // Sync search state with the current selected site from App
  useEffect(() => {
    if (currentSite) {
      setSearchSiteNo(currentSite.siteNo);
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

  // Filtered equipment by Site Number (case insensitive search)
  const filteredEquipment = useMemo(() => {
    if (!searchSiteNo.trim()) return equipmentList;
    return equipmentList.filter((eq) =>
      eq.siteNo.toLowerCase().includes(searchSiteNo.trim().toLowerCase())
    );
  }, [equipmentList, searchSiteNo]);

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
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save the equipment record.");
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
      const row = [
        `"${eq.siteNo}"`,
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
            <div className="md:col-span-2 flex flex-col gap-1">
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
                          Site {eq.siteNo}
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
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider inline-block">
                              Rented
                            </span>
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

    </div>
  );
}
