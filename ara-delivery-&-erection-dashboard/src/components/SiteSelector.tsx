import React, { useState } from "react";
import { Plus, Check, Loader2, MapPin, Edit2, Trash2, X } from "lucide-react";
import { Site } from "../types";
import { db, collection, addDoc, handleFirestoreError, OperationType, doc, updateDoc, deleteDoc } from "../lib/firebase";

interface SiteSelectorProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelectSite: (site: Site) => void;
  loading: boolean;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  isAdmin?: boolean;
}

export default function SiteSelector({
  sites,
  selectedSite,
  onSelectSite,
  loading,
  selectedDate,
  onSelectedDateChange,
  isAdmin = false
}: SiteSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSiteNo, setNewSiteNo] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newProjectManager, setNewProjectManager] = useState("");
  const [newSitePasscode, setNewSitePasscode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editSiteNo, setEditSiteNo] = useState("");
  const [editSiteName, setEditSiteName] = useState("");
  const [editProjectManager, setEditProjectManager] = useState("");
  const [editSitePasscode, setEditSitePasscode] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete confirm states
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteNo.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const siteId = `site_${Date.now()}`;
      const sitePayload = {
        id: siteId,
        siteNo: newSiteNo.trim(),
        name: (newSiteName.trim() || `Site ${newSiteNo.trim()}`),
        projectManager: newProjectManager.trim() || "",
        passcode: newSitePasscode.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "sites"), sitePayload);
      setNewSiteNo("");
      setNewSiteName("");
      setNewProjectManager("");
      setNewSitePasscode("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Error creating site:", err);
      setError("Failed to save new site. Please verify Firebase database permission rules.");
      handleFirestoreError(err, OperationType.WRITE, "sites");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !editSiteNo.trim()) return;

    setUpdating(true);
    setError(null);
    try {
      const siteRef = doc(db, "sites", selectedSite.id);
      await updateDoc(siteRef, {
        siteNo: editSiteNo.trim(),
        name: editSiteName.trim() || `Site ${editSiteNo.trim()}`,
        projectManager: editProjectManager.trim() || "",
        passcode: editSitePasscode.trim(),
        updatedAt: new Date().toISOString()
      });
      setShowEditForm(false);
    } catch (err) {
      console.error("Error editing site:", err);
      setError("Failed to update site. Please verify Firebase database permission rules.");
      handleFirestoreError(err, OperationType.UPDATE, `sites/${selectedSite.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!selectedSite) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, "sites", selectedSite.id));
      setConfirmDelete(false);
    } catch (err) {
      console.error("Error deleting site:", err);
      setError("Failed to delete project site. Please verify Firebase database permission rules.");
      handleFirestoreError(err, OperationType.DELETE, `sites/${selectedSite.id}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-xl p-3.5 max-w-7xl mx-auto mb-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Active site indicators */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-500/15 border border-blue-500/25 rounded-lg text-blue-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Construction Project Site</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedSite
                ? `Active: Site No. ${selectedSite.siteNo} (${selectedSite.name})${selectedSite.projectManager ? ` | PM: ${selectedSite.projectManager}` : ""}`
                : "No active project site selected"}
            </p>
          </div>
        </div>

        {/* Site dropdown list / creation actions */}
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-1 text-xs text-slate-400 py-1 px-2">
              <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
              Loading sites...
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSite?.id || ""}
                onChange={(e) => {
                  const targetSite = sites.find((s) => s.id === e.target.value);
                  if (targetSite) onSelectSite(targetSite);
                }}
                className="bg-slate-950/60 border border-slate-700/60 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-bold"
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">Select Site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id} className="bg-slate-900 text-slate-100">
                    No. {site.siteNo} - {site.name} {site.projectManager ? `(PM: ${site.projectManager})` : ""}
                  </option>
                ))}
              </select>

              {/* Date Selector Filter */}
              <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide">DATE:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onSelectedDateChange(e.target.value)}
                  className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer outline-none border-0 p-0 text-xs [color-scheme:dark]"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => onSelectedDateChange("")}
                    className="text-slate-500 hover:text-slate-300 font-bold px-1 text-xs cursor-pointer ml-1"
                    title="Clear Date"
                  >
                    ×
                  </button>
                )}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setShowEditForm(false);
                    setConfirmDelete(false);
                    setError(null);
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-white ${
                    showAddForm ? "bg-slate-750 hover:bg-slate-700" : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{showAddForm ? "Close" : "Add Site"}</span>
                </button>
              )}

              {isAdmin && selectedSite && !confirmDelete && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditSiteNo(selectedSite.siteNo);
                      setEditSiteName(selectedSite.name);
                      setEditProjectManager(selectedSite.projectManager || "");
                      setEditSitePasscode(selectedSite.passcode || "");
                      setShowEditForm(!showEditForm);
                      setShowAddForm(false);
                      setError(null);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                      showEditForm
                        ? "bg-slate-750 hover:bg-slate-700 text-slate-200 border-slate-600"
                        : "bg-amber-600/20 hover:bg-amber-600/45 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {showEditForm ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                    <span>{showEditForm ? "Close" : "Edit"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(true);
                      setShowEditForm(false);
                      setShowAddForm(false);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600/45 text-rose-300 border border-rose-500/30 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </>
              )}

              {isAdmin && selectedSite && confirmDelete && (
                <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 rounded-lg px-2.5 py-1 text-xs">
                  <span className="text-rose-200 font-bold text-[10px]">Delete No. {selectedSite.siteNo}?</span>
                  <button
                    type="button"
                    onClick={handleDeleteSite}
                    disabled={deleting}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black px-2 py-1 rounded text-[10px] uppercase cursor-pointer transition-colors"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded text-[10px] uppercase cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Creation Drawer */}
      {showAddForm && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 animate-fade-in">
          {error && (
            <div className="mb-3 p-2 text-xs text-rose-200 bg-rose-500/10 border border-rose-500/25 rounded-lg">
              {error}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-end gap-2.5 max-w-4xl"
          >
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                SITE NUMBER PIN *
              </label>
              <input
                type="text"
                required
                value={newSiteNo}
                onChange={(e) => setNewSiteNo(e.target.value)}
                placeholder="e.g. 505"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                SITE NAME / OFFICE (OPTIONAL)
              </label>
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="e.g. Riyadh Villa Phase 2"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                PROJECT MANAGER (OPTIONAL)
              </label>
              <input
                type="text"
                value={newProjectManager}
                onChange={(e) => setNewProjectManager(e.target.value)}
                placeholder="e.g. Eng. Khalid"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider text-blue-400">
                SITE PASSCODE (OPTIONAL)
              </label>
              <input
                type="text"
                value={newSitePasscode}
                onChange={(e) => setNewSitePasscode(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1 w-full sm:w-auto cursor-pointer transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider w-full sm:w-auto cursor-pointer transition-colors border border-slate-700/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dynamic Edit Drawer */}
      {showEditForm && selectedSite && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 animate-fade-in">
          {error && (
            <div className="mb-3 p-2 text-xs text-rose-200 bg-rose-500/10 border border-rose-500/25 rounded-lg">
              {error}
            </div>
          )}
          <form
            onSubmit={handleEditSubmit}
            className="flex flex-col sm:flex-row items-end gap-2.5 max-w-4xl"
          >
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                EDIT SITE NUMBER PIN *
              </label>
              <input
                type="text"
                required
                value={editSiteNo}
                onChange={(e) => setEditSiteNo(e.target.value)}
                placeholder="e.g. 505"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-bold"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                EDIT SITE NAME / OFFICE (OPTIONAL)
              </label>
              <input
                type="text"
                value={editSiteName}
                onChange={(e) => setEditSiteName(e.target.value)}
                placeholder="e.g. Riyadh Villa Phase 2"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-semibold"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
                EDIT PROJECT MANAGER (OPTIONAL)
              </label>
              <input
                type="text"
                value={editProjectManager}
                onChange={(e) => setEditProjectManager(e.target.value)}
                placeholder="e.g. Eng. Khalid"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-semibold"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-wider text-blue-400">
                EDIT SITE PASSCODE (OPTIONAL)
              </label>
              <input
                type="text"
                value={editSitePasscode}
                onChange={(e) => setEditSitePasscode(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-semibold"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                type="submit"
                disabled={updating}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1 w-full sm:w-auto cursor-pointer transition-colors"
              >
                {updating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider w-full sm:w-auto cursor-pointer transition-colors border border-slate-700/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
