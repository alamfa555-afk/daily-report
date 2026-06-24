import React, { useState } from "react";
import { Plus, Check, Loader2, MapPin } from "lucide-react";
import { Site } from "../types";
import { db, collection, addDoc, handleFirestoreError, OperationType } from "../lib/firebase";

interface SiteSelectorProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelectSite: (site: Site) => void;
  loading: boolean;
}

export default function SiteSelector({
  sites,
  selectedSite,
  onSelectSite,
  loading
}: SiteSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSiteNo, setNewSiteNo] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "sites"), sitePayload);
      setNewSiteNo("");
      setNewSiteName("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Error creating site:", err);
      setError("Failed to save new site. Please verify Firebase database permission rules.");
      handleFirestoreError(err, OperationType.WRITE, "sites");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 backdrop-blur-md rounded-2xl p-5 max-w-7xl mx-auto mb-6 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Active site indicators */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/15 border border-blue-500/25 rounded-xl text-blue-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Construction Project Site</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedSite
                ? `Active: Site No. ${selectedSite.siteNo} (${selectedSite.name})`
                : "No active project site selected"}
            </p>
          </div>
        </div>

        {/* Site dropdown list / creation actions */}
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 py-2 px-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              Loading sites...
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <select
                value={selectedSite?.id || ""}
                onChange={(e) => {
                  const targetSite = sites.find((s) => s.id === e.target.value);
                  if (targetSite) onSelectSite(targetSite);
                }}
                className="bg-slate-950/60 border border-slate-700/60 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">Select Site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id} className="bg-slate-900 text-slate-100">
                    No. {site.siteNo} - {site.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setError(null);
                }}
                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Site
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Creation Drawer */}
      {showAddForm && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 animate-fade-in">
          {error && (
            <div className="mb-4 p-3.5 text-xs text-rose-200 bg-rose-500/10 border border-rose-500/25 rounded-lg">
              {error}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-end gap-3 max-w-2xl"
          >
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                SITE NUMBER PIN *
              </label>
              <input
                type="text"
                required
                value={newSiteNo}
                onChange={(e) => setNewSiteNo(e.target.value)}
                placeholder="e.g. 505, SITE-24"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                SITE NAME / OFFICE (OPTIONAL)
              </label>
              <input
                type="text"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="e.g. Riyadh Villa Phase 2"
                className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg px-5 py-3 text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-slate-800 hover:bg-slate-755 text-slate-200 font-bold rounded-lg px-5 py-3 text-xs uppercase tracking-wider w-full sm:w-auto cursor-pointer transition-colors border border-slate-700/80"
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
