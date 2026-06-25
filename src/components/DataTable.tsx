import React, { useState } from "react";
import { Trash2, Edit3, ShieldAlert, Loader2, ArrowRightLeft, FileSpreadsheet, Search } from "lucide-react";
import { Delivery, Erection, ElementStatus } from "../types";
import { db, doc, deleteDoc, updateDoc, handleFirestoreError, OperationType } from "../lib/firebase";

interface DataTableProps {
  deliveries: Delivery[];
  erections: Erection[];
  selectedSiteNo: string;
}

export default function DataTable({ deliveries = [], erections = [], selectedSiteNo }: DataTableProps) {
  const [activeTab, setActiveTab] = useState<"deliveries" | "erections">("deliveries");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Edit record states
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    type: "deliveries" | "erections";
    data: any;
  } | null>(null);
  const [updating, setUpdating] = useState(false);

  // Deletion logic
  const handleDelete = async (id: string, collectionName: "deliveries" | "erections") => {
    setDeletingId(id);
    setErrorBanner(null);
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      console.error("Error deleting record:", err);
      setErrorBanner("Error deleting record. Please check Firestore security rules.");
      handleFirestoreError(err, OperationType.DELETE, collectionName);
    } finally {
      setDeletingId(null);
    }
  };

  // Editing save logic
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setUpdating(true);
    setErrorBanner(null);

    try {
      const docRef = doc(db, editingRecord.type, editingRecord.id);
      
      const updatedPayload = {
        ...editingRecord.data,
        weight: Number(editingRecord.data.weight),
        quantity: Number(editingRecord.data.quantity),
        totalWeight: Number(editingRecord.data.weight) * Number(editingRecord.data.quantity),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(docRef, updatedPayload);
      setEditingRecord(null);
    } catch (err) {
      console.error("Error updating record:", err);
      setErrorBanner("Failed to update record. Check Firestore permissions.");
      handleFirestoreError(err, OperationType.UPDATE, editingRecord.type);
    } finally {
      setUpdating(false);
    }
  };

  const handleEditClick = (record: any, type: "deliveries" | "erections") => {
    setEditingRecord({
      id: record.id,
      type,
      data: JSON.parse(JSON.stringify(record)) // deep copy
    });
  };

  // Filtering
  const filteredDeliveries = deliveries.filter(d => {
    const matchesSearch = 
      d.mdrNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.elementCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.elementType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.villaType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.trailerNo?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredErections = erections.filter(e => {
    const matchesSearch = 
      e.elementCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.elementType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.villaType?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderStatus = (status: ElementStatus) => {
    switch (status) {
      case "good":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">✅ Good</span>;
      case "damage":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">⚠️ Damage</span>;
      case "reject":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25">❌ Reject</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-7xl mx-auto my-6">
      {errorBanner && (
        <div className="mb-4 p-3.5 text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-xl flex justify-between items-center animate-fade-in">
          <span className="font-semibold">{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-400 hover:text-rose-300 font-extrabold text-sm px-1.5 py-0.5 rounded cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
      {/* Tab Selectors & Search bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex gap-2 p-1.5 bg-slate-950/70 border border-slate-800/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => { setActiveTab("deliveries"); setSearchQuery(""); }}
            className={`cursor-pointer px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${
              activeTab === "deliveries"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Received element Logs ({filteredDeliveries.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("erections"); setSearchQuery(""); }}
            className={`cursor-pointer px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 ${
              activeTab === "erections"
                ? "bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Erection Progress Logs ({filteredErections.length})
          </button>
        </div>

        {/* Global Search box in list */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, type, zone..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Tables Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
        {activeTab === "deliveries" ? (
          <table className="min-w-full divide-y divide-slate-800/60 text-left font-sans">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-3 py-2">MDR Slip</th>
                <th className="px-3 py-2">Trailer No.</th>
                <th className="px-3 py-2">Element Code</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Weight (T)</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2">Total Weight</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Zone/Villa</th>
                <th className="px-3 py-2">Equipment / Plate</th>
                <th className="px-3 py-2">Received By</th>
                <th className="px-3 py-2">Date Received</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 text-[11px]">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-3 py-2 font-extrabold text-white">{d.mdrNo}</td>
                    <td className="px-3 py-2">
                      {d.trailerNo ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery(d.trailerNo || "")}
                          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 rounded px-2 py-0.5 text-[9px] font-black tracking-wider uppercase transition-all"
                          title="Click to filter by trailer"
                        >
                          {d.trailerNo}
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-blue-400">{d.elementCode}</td>
                    <td className="px-3 py-2 text-slate-300">{d.elementType}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{Number(d.weight).toFixed(3)}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-200">{d.quantity}</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-400">{Number(d.totalWeight).toFixed(3)}</td>
                    <td className="px-3 py-2">{renderStatus(d.status)}</td>
                    <td className="px-4 py-4 text-slate-300">
                      {d.zone || "-"} / {d.villaType || "-"}
                      <div className="text-[10px] text-slate-500">
                        {d.buildingNo ? `B: ${d.buildingNo}` : ""} {d.houseNo ? `H: ${d.houseNo}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">
                      <div>{d.unloadingDetails?.equipmentType || "-"} ({d.unloadingDetails?.capacity || 0}T)</div>
                      <div className="text-[10px] text-slate-500">Plate: {d.unloadingDetails?.equipmentPlateNo || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-100 font-bold">
                      {d.unloadingDetails?.unloaderName || "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-mono">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(d, "deliveries")}
                          className="p-1 px-2.5 text-slate-400 hover:text-blue-400 hover:bg-blue-600/15 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                          title="Edit delivery"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        {confirmDeleteId === d.id ? (
                          <div className="inline-flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/30 p-1 rounded-lg animate-fade-in text-rose-300">
                            <span className="text-[10px] text-rose-300 font-bold px-1 select-none">Sure?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                handleDelete(d.id, "deliveries");
                              }}
                              className="p-1 px-2 text-rose-350 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-[10px] font-bold rounded cursor-pointer transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 px-2 text-slate-300 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded cursor-pointer transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={deletingId === d.id}
                            onClick={() => setConfirmDeleteId(d.id)}
                            className="p-1 px-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                            title="Delete delivery"
                          >
                            {deletingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-500 italic">
                    No received elements registered under current criteria. Show more by adjusting search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full divide-y divide-slate-800/60 text-left">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-3 py-2">Element Code</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Weight (T)</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2">Total Weight</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Zone/Villa</th>
                <th className="px-3 py-2">Erection Crane / Plate</th>
                <th className="px-3 py-2">Erector / Supervisor</th>
                <th className="px-3 py-2">Date Erected</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 text-[11px]">
              {filteredErections.length > 0 ? (
                filteredErections.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-3 py-2 font-mono font-bold text-purple-400">{e.elementCode}</td>
                    <td className="px-3 py-2 text-slate-300">{e.elementType}</td>
                    <td className="px-3 py-2 font-mono text-slate-400">{Number(e.weight).toFixed(3)}</td>
                    <td className="px-3 py-2 text-center font-bold text-slate-200">{e.quantity}</td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-400">{Number(e.totalWeight).toFixed(3)}</td>
                    <td className="px-3 py-2">{renderStatus(e.status)}</td>
                    <td className="px-3 py-2 text-slate-300">
                      {e.zone || "-"} / {e.villaType || "-"}
                      <div className="text-[10px] text-slate-500">
                        {e.buildingNo ? `B: ${e.buildingNo}` : ""} {e.houseNo ? `H: ${e.houseNo}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      <div>{e.erectionDetails?.equipmentType || "-"} ({e.erectionDetails?.capacity || 0}T)</div>
                      <div className="text-[10px] text-slate-500">Plate: {e.erectionDetails?.equipmentPlateNo || "-"}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      <div>{e.erectionDetails?.erectorName || "-"}</div>
                      <div className="text-[10px] text-slate-500">ID: {e.erectionDetails?.erectorId || "-"}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(e, "erections")}
                          className="p-1 px-2.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/15 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                          title="Edit Erection"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        {confirmDeleteId === e.id ? (
                          <div className="inline-flex items-center gap-1.5 bg-rose-955/40 border border-rose-900/30 p-1 rounded-lg animate-fade-in text-rose-300">
                            <span className="text-[10px] text-rose-300 font-bold px-1 select-none">Sure?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                handleDelete(e.id, "erections");
                              }}
                              className="p-1 px-2 text-rose-350 bg-rose-500/20 hover:bg-rose-505/35 border border-rose-500/30 text-[10px] font-bold rounded cursor-pointer transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 px-2 text-slate-300 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold rounded cursor-pointer transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={deletingId === e.id}
                            onClick={() => setConfirmDeleteId(e.id)}
                            className="p-1 px-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
                            title="Delete Erection"
                          >
                            {deletingId === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500 italic">
                    No erection progress entries registered. Records show up once you perform an erection update.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Editing Modal Dialog Popup */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 animate-scale-in">
            <h3 className="text-base font-bold text-white border-b border-slate-850 pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Edit3 className="h-4 w-4 text-blue-500" />
              Edit {editingRecord.type === "deliveries" ? "Delivery Element" : "Erection Record"}
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {editingRecord.type === "deliveries" && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">MDR Slip No.</label>
                      <input
                        type="text"
                        value={editingRecord.data.mdrNo}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          data: { ...editingRecord.data, mdrNo: e.target.value }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Receiver Name (Employee)</label>
                      <input
                        type="text"
                        value={editingRecord.data.unloadingDetails?.unloaderName || ""}
                        onChange={(e) => setEditingRecord({
                          ...editingRecord,
                          data: {
                            ...editingRecord.data,
                            unloadingDetails: {
                              ...(editingRecord.data.unloadingDetails || {}),
                              unloaderName: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Element Code</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.data.elementCode}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, elementCode: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Element Type</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.data.elementType}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, elementType: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Weight (Ton)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={editingRecord.data.weight}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, weight: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingRecord.data.quantity}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, quantity: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Status Condition</label>
                  <select
                    value={editingRecord.data.status}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, status: e.target.value as ElementStatus }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer [&_option]:bg-slate-900"
                  >
                    <option value="good" className="bg-slate-900 text-emerald-400 font-semibold">✅ Good</option>
                    <option value="damage" className="bg-slate-900 text-amber-400 font-semibold">⚠️ Damage</option>
                    <option value="reject" className="bg-slate-900 text-rose-400 font-semibold">❌ Reject</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Zone</label>
                  <input
                    type="text"
                    value={editingRecord.data.zone}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, zone: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Villa Type</label>
                  <input
                    type="text"
                    value={editingRecord.data.villaType}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, villaType: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Building No</label>
                  <input
                    type="text"
                    value={editingRecord.data.buildingNo}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, buildingNo: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">House No</label>
                  <input
                    type="text"
                    value={editingRecord.data.houseNo}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, houseNo: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Flat No</label>
                  <input
                    type="text"
                    value={editingRecord.data.flatNo}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      data: { ...editingRecord.data, flatNo: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-800/80 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-650 text-white font-bold py-2.5 px-5 rounded-lg text-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-55"
                >
                  {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
