import React, { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Save, Sparkles, CheckCircle2, AlertTriangle, X, Check, ShieldAlert } from "lucide-react";
import { Site, Erection, ElementStatus, Delivery } from "../types";
import { db, collection, doc, setDoc, handleFirestoreError, OperationType, query, where, getDocs, addDoc, updateDoc } from "../lib/firebase";
import { saveSuggestion } from "../lib/suggestions";
import CustomCombobox from "./CustomCombobox";

interface ProductItem {
  tempId: string;
  elementType: string;
  elementCode: string;
  weight: string;
  quantity: string;
  status: ElementStatus;
  rejectionReason: string;
}

interface ErectionFormProps {
  selectedSite: Site | null;
  sites: Site[];
  onSelectSite: (site: Site) => void;
  suggestions: Record<string, string[]>;
  onSuccess: () => void;
  lastErection: Erection | null;
  deliveries: Delivery[];
  employeeNameMap: Record<string, string>;
}

export default function ErectionForm({
  selectedSite,
  sites,
  onSelectSite,
  suggestions,
  onSuccess,
  lastErection,
  deliveries = [],
  employeeNameMap
}: ErectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [successList, setSuccessList] = useState<string | null>(null);
  const [syncingCrane, setSyncingCrane] = useState(false);

  // New site popup/inline form state
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteNo, setNewSiteNo] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [savingSite, setSavingSite] = useState(false);

  // Header metadata states
  const [erectorId, setErectorId] = useState("");
  const [erectorName, setErectorName] = useState("");
  const [date, setDate] = useState(() => {
    // Default to today's date in local format (YYYY-MM-DD)
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });
  const [foremanRole, setForemanRole] = useState("Erection Foreman");

  // Transportation/Site coordination
  const [zone, setZone] = useState("");
  const [villaType, setVillaType] = useState("4BD");
  const [buildingNo, setBuildingNo] = useState("");
  const [floorNo, setFloorNo] = useState("");

  // Equipment details
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentPlateNo, setEquipmentPlateNo] = useState("");
  const [capacity, setCapacity] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [equipmentStatus, setEquipmentStatus] = useState<"ARA" | "rented">("ARA");

  // Dynamic Product Items (Initially 1 item loaded)
  const [items, setItems] = useState<ProductItem[]>([
    {
      tempId: "item_initial_erect_0",
      elementType: "",
      elementCode: "",
      weight: "",
      quantity: "1",
      status: "good",
      rejectionReason: ""
    }
  ]);

  // Overall notes/supervisor remarks
  const [remarks, setRemarks] = useState("");

  // Autofill fields from last record submitted to save typing
  useEffect(() => {
    if (lastErection) {
      setZone(lastErection.zone || "");
      setVillaType(lastErection.villaType || "4BD");
      setBuildingNo(lastErection.buildingNo || "");
      setFloorNo(lastErection.floorNo || "");
      
      const eDetails = lastErection.erectionDetails;
      if (eDetails) {
        setErectorId(eDetails.erectorId || "");
        setErectorName(eDetails.erectorName || "");
        setEquipmentType(eDetails.equipmentType || "");
        setCapacity(eDetails.capacity ? String(eDetails.capacity) : "");
        setEquipmentPlateNo(eDetails.equipmentPlateNo || "");
        setOperatorName(eDetails.operatorName || "");
        setOperatorId(eDetails.operatorId || "");
      }
    }
  }, [lastErection]);

  // Auto fill Employee Name when Employee ID is typed or chosen from suggestions
  useEffect(() => {
    const cleanId = erectorId.trim().toUpperCase();
    if (cleanId && employeeNameMap && employeeNameMap[cleanId]) {
      setErectorName(employeeNameMap[cleanId]);
    }
  }, [erectorId, employeeNameMap]);

  // Handle adding a new blank product item card to the list
  const handleAddItem = () => {
    const newItemId = `item_erect_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setItems([
      ...items,
      {
        tempId: newItemId,
        elementType: "",
        elementCode: "",
        weight: "",
        quantity: "1",
        status: "good",
        rejectionReason: ""
      }
    ]);
  };

  // Update specific field inside a specific product card
  const updateItemField = (tempId: string, field: keyof ProductItem, value: string) => {
    setItems(items.map(item => item.tempId === tempId ? { ...item, [field]: value } : item));
  };

  // Remove specific item from the list
  const handleRemoveItem = (tempId: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.tempId !== tempId));
    } else {
      setErrorList("You must log at least one precast product item.");
      setTimeout(() => setErrorList(null), 3000);
    }
  };

  // Handle creating a new construction site inline
  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteNo.trim()) return;

    setSavingSite(true);
    setErrorList(null);
    try {
      const siteId = `site_${Date.now()}`;
      const sitePayload = {
        id: siteId,
        siteNo: newSiteNo.trim(),
        name: (newSiteName.trim() || `Site ${newSiteNo.trim()}`),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "sites", sitePayload.id), sitePayload);
      
      // Auto select newly created site
      onSelectSite(sitePayload);
      
      setNewSiteNo("");
      setNewSiteName("");
      setShowAddSite(false);
      setSuccessList(`Construction site No. ${sitePayload.siteNo} successfully registered!`);
      setTimeout(() => setSuccessList(null), 3000);
    } catch (err) {
      console.error("Error creating site:", err);
      setErrorList("Failed to save new project site to Firebase. Check permission rules.");
      handleFirestoreError(err, OperationType.WRITE, "sites");
    } finally {
      setSavingSite(false);
    }
  };

  // Save/Submit the entire erection shift transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorList(null);
    setSuccessList(null);

    if (!selectedSite) {
      setErrorList("Please select a Construction Project Site first.");
      return;
    }
    if (!erectorId.trim() || !erectorName.trim()) {
      setErrorList("Employee ID and Employee Name are required.");
      return;
    }

    // Validate all entered items inside list
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemIndexLabel = `Item #${i + 1}`;
      if (!item.elementType.trim()) {
        setErrorList(`Please select or type a Product Type for ${itemIndexLabel}.`);
        return;
      }
      if (!item.elementCode.trim()) {
        setErrorList(`Please provide a unique Product Code for ${itemIndexLabel}.`);
        return;
      }

      // Check if this item has been received at the selected site
      const trimmedCode = item.elementCode.trim().toUpperCase();
      const isReceived = deliveries.some(
        (d) => d.elementCode.trim().toUpperCase() === trimmedCode && d.siteId === selectedSite.id
      );
      if (!isReceived) {
        setErrorList(`WRONG ITEM ERROR: Element Code "${trimmedCode}" (${itemIndexLabel}) has NOT been received at this site. Erection is forbidden.`);
        return;
      }

      if (!item.weight || Number(item.weight) <= 0) {
        setErrorList(`Please provide a valid Unit Weight (Tons) for ${itemIndexLabel}.`);
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setErrorList(`Quantity for ${itemIndexLabel} must be 1 or higher.`);
        return;
      }
    }

    setLoading(true);

    try {
      // Loop over items and register each inside Firestore erections collection
      for (const item of items) {
        const itemWeight = Number(item.weight) || 0;
        const itemQty = Number(item.quantity) || 1;
        const erectionPayload = {
          id: `erection_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          siteId: selectedSite.id,
          elementCode: item.elementCode.trim().toUpperCase(),
          elementType: item.elementType.trim(),
          weight: itemWeight,
          quantity: itemQty,
          totalWeight: itemWeight * itemQty,
          status: item.status,
          rejectionReason: item.status !== "good" ? item.rejectionReason.trim() : "",
          zone: zone.trim(),
          villaType: villaType.trim(),
          buildingNo: buildingNo.trim(),
          floorNo: floorNo.trim(),
          houseNo: "",
          flatNo: "",
          erectionDetails: {
            erectorId: erectorId.trim(),
            erectorName: erectorName.trim(),
            erectorTitle: foremanRole,
            equipmentType: equipmentType.trim(),
            capacity: Number(capacity) || 0,
            equipmentPlateNo: equipmentPlateNo.trim().toUpperCase(),
            operatorName: operatorName.trim(),
            operatorId: operatorId.trim()
          },
          remarks: remarks.trim(),
          recordedBy: erectorName.trim() || "Site Erector",
          createdAt: (() => {
            const d = new Date(date);
            const now = new Date();
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            return d.toISOString();
          })(),
          updatedAt: new Date().toISOString()
        };

        // Write to Firestore
        await setDoc(doc(db, "erections", erectionPayload.id), erectionPayload);

        // Save autocompleting suggestions
        await saveSuggestion("elementCode", item.elementCode);
        await saveSuggestion("elementType", item.elementType);
      }

      // Automatically register or update the crane/equipment in the general directory if plate exists
      if (equipmentPlateNo.trim() && selectedSite) {
        const plate = equipmentPlateNo.trim().toUpperCase();
        try {
          const eqQuery = query(collection(db, "equipment"), where("plateNo", "==", plate));
          const eqSnap = await getDocs(eqQuery);
          
          const cranePayload = {
            siteId: selectedSite.id,
            siteNo: selectedSite.siteNo,
            equipmentType: equipmentType.trim() || "Mobile Crane",
            plateNo: plate,
            capacity: Number(capacity) || 25,
            status: equipmentStatus,
            ownerName: operatorName.trim() ? `Operator: ${operatorName.trim()}` : "",
            updatedAt: new Date().toISOString()
          };

          if (!eqSnap.empty) {
            // Update existing crane
            const existingDocId = eqSnap.docs[0].id;
            await updateDoc(doc(db, "equipment", existingDocId), cranePayload);
          } else {
            // Add new crane
            await addDoc(collection(db, "equipment"), {
              ...cranePayload,
              createdAt: new Date().toISOString()
            });
          }
        } catch (eqErr) {
          console.error("Error auto-registering crane during erection submission:", eqErr);
        }
      }

      // Save metadata autocompleting suggestions
      const metaPromises = [
        saveSuggestion("zone", zone),
        saveSuggestion("villaType", villaType),
        saveSuggestion("buildingNo", buildingNo),
        saveSuggestion("floorNo", floorNo),
        saveSuggestion("erectorId", erectorId),
        saveSuggestion("erectorName", erectorName),
        saveSuggestion("erectorTitle", foremanRole),
        saveSuggestion("equipmentType", equipmentType),
        saveSuggestion("equipmentPlateNo", equipmentPlateNo),
        saveSuggestion("operatorName", operatorName),
        saveSuggestion("operatorId", operatorId)
      ];
      await Promise.all(metaPromises);

      // Clean products state back to initial empty 1 item
      setItems([
        {
          tempId: `item_erect_${Date.now()}`,
          elementType: "",
          elementCode: "",
          weight: "",
          quantity: "1",
          status: "good",
          rejectionReason: ""
        }
      ]);
      setRemarks("");

      setSuccessList(`Successfully recorded ARA Ledger: All ${items.length} products logged and synchronized as ERECTED!`);
      onSuccess();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error logging bulk erection items:", err);
      setErrorList("Error saving erected elements to Firestore. Check connection or project settings.");
      handleFirestoreError(err, OperationType.WRITE, "erections");
    } finally {
      setLoading(false);
    }
  };

  // Handle explicit/manual crane registration and sync to Crane Log
  const handleSyncCrane = async () => {
    if (!selectedSite) {
      setErrorList("Please select a Construction Project Site first.");
      return;
    }
    if (!equipmentPlateNo.trim()) {
      setErrorList("Please enter a Crane Plate Number.");
      return;
    }

    setSyncingCrane(true);
    setErrorList(null);
    setSuccessList(null);

    try {
      const plate = equipmentPlateNo.trim().toUpperCase();
      const eqQuery = query(collection(db, "equipment"), where("plateNo", "==", plate));
      const eqSnap = await getDocs(eqQuery);

      const cranePayload = {
        siteId: selectedSite.id,
        siteNo: selectedSite.siteNo,
        equipmentType: equipmentType.trim() || "Mobile Crane",
        plateNo: plate,
        capacity: Number(capacity) || 25,
        status: equipmentStatus,
        ownerName: operatorName.trim() ? `Operator: ${operatorName.trim()}` : "",
        updatedAt: new Date().toISOString()
      };

      if (!eqSnap.empty) {
        // Update existing crane
        const existingDocId = eqSnap.docs[0].id;
        await updateDoc(doc(db, "equipment", existingDocId), cranePayload);
        setSuccessList(`Crane "${plate}" successfully updated in Crane Log directory!`);
      } else {
        // Add new crane
        await addDoc(collection(db, "equipment"), {
          ...cranePayload,
          createdAt: new Date().toISOString()
        });
        setSuccessList(`Crane "${plate}" successfully registered in Crane Log directory!`);
      }
      setTimeout(() => setSuccessList(null), 4000);
    } catch (err: any) {
      console.error("Error syncing crane to directory:", err);
      setErrorList(`Failed to register crane: ${err.message || err}`);
    } finally {
      setSyncingCrane(false);
    }
  };

  // Reset form helper
  const handleClearForm = () => {
    setErectorId("");
    setErectorName("");
    setZone("");
    setVillaType("4BD");
    setBuildingNo("");
    setEquipmentType("");
    setEquipmentPlateNo("");
    setCapacity("");
    setOperatorName("");
    setOperatorId("");
    setEquipmentStatus("ARA");
    setRemarks("");
    setItems([
      {
        tempId: "item_initial_erect_0",
        elementType: "",
        elementCode: "",
        weight: "",
        quantity: "1",
        status: "good",
        rejectionReason: ""
      }
    ]);
    setErrorList(null);
    setSuccessList("Form reset successfully.");
    setTimeout(() => setSuccessList(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {errorList && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-lg">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-400 shrink-0 animate-bounce" />
          <span>{errorList}</span>
        </div>
      )}
      {successList && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-lg">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          <span>{successList}</span>
        </div>
      )}

      {/* SECTION HEADER */}
      <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs uppercase tracking-wider mb-2">
        <span className="text-orange-500 text-sm font-black">✦</span> ADD / EDIT ERECTION PROGRESS
      </div>

      {/* BLOCK 1: Project details & Site Coordinates */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
              PROJECT NO. <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedSite?.id || ""}
                onChange={(e) => {
                  const s = sites.find(item => item.id === e.target.value);
                  if (s) onSelectSite(s);
                }}
                className="flex-1 bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer font-bold"
              >
                <option value="" disabled>Select Project...</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-slate-100">
                    No. {s.siteNo} - {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddSite(!showAddSite)}
                className="bg-purple-600/25 hover:bg-purple-600/45 text-purple-300 border border-purple-500/35 font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap inline-flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>
          </div>

          {/* Project location auto-fill */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
              PROJECT LOCATION
            </label>
            <input
              type="text"
              readOnly
              value={selectedSite ? selectedSite.name : "Auto-fill from project"}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 placeholder:text-slate-500 focus:outline-none font-semibold"
            />
          </div>
        </div>

        {/* Inline Collapse Site Creation Drawer */}
        {showAddSite && (
          <div className="bg-slate-950/60 border border-purple-500/20 rounded-2xl p-4.5 animate-fade-in">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h4 className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Register New Construction Site No.</h4>
              <button type="button" onClick={() => setShowAddSite(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSite} className="flex flex-col sm:flex-row items-end gap-3">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Site Number PIN *</label>
                <input
                  type="text"
                  required
                  value={newSiteNo}
                  onChange={(e) => setNewSiteNo(e.target.value)}
                  placeholder="e.g. 505"
                  className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Site Location Name</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g. Riyadh Villa Phase 2"
                  className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={savingSite}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider w-full sm:w-auto inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingSite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Save Site
              </button>
            </form>
          </div>
        )}
      </div>

      {/* BLOCK 2: Employee and Foreman Information */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <CustomCombobox
            label="EMPLOYEE ID"
            required
            value={erectorId}
            onChange={setErectorId}
            suggestions={suggestions.erectorId || []}
            placeholder="e.g. APC-001"
            fieldName="erectorId"
          />

          <CustomCombobox
            label="EMPLOYEE NAME"
            required
            value={erectorName}
            onChange={setErectorName}
            suggestions={suggestions.erectorName || []}
            placeholder="Type name..."
            fieldName="erectorName"
          />

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
              DATE <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
              FOREMAN ROLE
            </label>
            <select
              value={foremanRole}
              onChange={(e) => setForemanRole(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer font-bold"
            >
              <option value="Erection Foreman" className="bg-slate-900">Erection Foreman</option>
              <option value="Unloading Foreman" className="bg-slate-900">Unloading Foreman</option>
              <option value="Supervisor" className="bg-slate-900">Supervisor</option>
              <option value="Site Engineer" className="bg-slate-900">Site Engineer</option>
            </select>
          </div>
        </div>
      </div>

      {/* BLOCK 3: Coordinates */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <CustomCombobox
            label="ZONE"
            value={zone}
            onChange={setZone}
            suggestions={suggestions.zone || []}
            placeholder="e.g. Zone A"
            fieldName="zone"
          />

          <CustomCombobox
            label="VILLA TYPE"
            value={villaType}
            onChange={setVillaType}
            suggestions={suggestions.villaType || []}
            placeholder="e.g. Type 3B"
            fieldName="villaType"
          />

          <CustomCombobox
            label="BUILDING NO."
            value={buildingNo}
            onChange={setBuildingNo}
            suggestions={suggestions.buildingNo || []}
            placeholder="e.g. B-12"
            fieldName="buildingNo"
          />

          <CustomCombobox
            label="FLOOR NO."
            value={floorNo}
            onChange={setFloorNo}
            suggestions={suggestions.floorNo || []}
            placeholder="e.g. Ground Floor"
            fieldName="floorNo"
          />
        </div>
      </div>

      {/* BLOCK 4: Crane/Equipment Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl">
        <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider mb-3 border-b border-slate-800/80 pb-1.5">
          EQUIPMENT FOR ERECTION
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <CustomCombobox
            label="EQUIPMENT TYPE"
            value={equipmentType}
            onChange={setEquipmentType}
            suggestions={suggestions.equipmentType || []}
            placeholder="Select/type crane..."
            fieldName="equipmentType"
          />

          <CustomCombobox
            label="PLATE / REG. NO."
            value={equipmentPlateNo}
            onChange={setEquipmentPlateNo}
            suggestions={suggestions.equipmentPlateNo || []}
            placeholder="e.g. RJ-14-GA-5678"
            fieldName="equipmentPlateNo"
          />

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
              CAPACITY (TONS)
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-semibold"
            />
          </div>

          <CustomCombobox
            label="OPERATOR NAME"
            value={operatorName}
            onChange={setOperatorName}
            suggestions={suggestions.operatorName || []}
            placeholder="e.g. Jan Bahadur"
            fieldName="operatorName"
          />

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">
              OWNERSHIP
            </label>
            <select
              value={equipmentStatus}
              onChange={(e) => setEquipmentStatus(e.target.value as "ARA" | "rented")}
              className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none cursor-pointer font-bold [&_option]:bg-slate-950"
            >
              <option value="ARA" className="bg-slate-900">Al Rashid (ARA)</option>
              <option value="rented" className="bg-slate-900">Rented</option>
            </select>
          </div>
        </div>

        {/* Sync/Register Crane Button */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-medium">
            Sync this crane's type, plate number, and capacity to the general Crane Log (Equipment Directory).
          </span>
          <button
            type="button"
            onClick={handleSyncCrane}
            disabled={syncingCrane || !equipmentPlateNo.trim() || !selectedSite}
            className="w-full sm:w-auto bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-bold py-1.5 px-4 rounded-lg text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {syncingCrane ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>Register Crane in Crane Log</span>
          </button>
        </div>
      </div>

      {/* BLOCK 5: Dynamic Product Items section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
            ITEMS ERECTED
          </h3>
          <span className="text-xs text-slate-400 font-bold">
            Total items: <span className="text-purple-400">{items.length}</span>
          </span>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => {
            const isRejected = item.status !== "good";
            return (
              <div
                key={item.tempId}
                className="bg-slate-950/50 border border-slate-800/90 rounded-3xl p-5 relative space-y-4 transition-all hover:border-slate-700/80"
              >
                {/* Product index heading + Remove button */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                  <span className="text-xs font-extrabold text-slate-300">
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.tempId)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer border border-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>

                {/* Input grid Row 1: Product Specifications */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <CustomCombobox
                    label="PRODUCT TYPE"
                    required
                    value={item.elementType}
                    onChange={(val) => updateItemField(item.tempId, "elementType", val)}
                    suggestions={suggestions.elementType || []}
                    placeholder="Select/type product..."
                    fieldName="elementType"
                  />

                  <CustomCombobox
                    label="PRODUCT CODE"
                    required
                    value={item.elementCode}
                    onChange={(val) => updateItemField(item.tempId, "elementCode", val)}
                    suggestions={suggestions.elementCode || []}
                    placeholder="e.g. EW-1234"
                    fieldName="elementCode"
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      QUANTITY (PCS) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemField(item.tempId, "quantity", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      UNIT WEIGHT (TONS) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.001"
                      value={item.weight}
                      onChange={(e) => updateItemField(item.tempId, "weight", e.target.value)}
                      placeholder="e.g. 5.42"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                {/* Input grid Row 2: Status & Rejection Reason */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      STATUS
                    </label>
                    <select
                      value={item.status}
                      onChange={(e) => updateItemField(item.tempId, "status", e.target.value as ElementStatus)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none cursor-pointer font-bold"
                    >
                      <option value="good" className="bg-slate-900 text-emerald-400">Accepted (Good)</option>
                      <option value="damage" className="bg-slate-900 text-amber-400">Minor Defect (Repairable)</option>
                      <option value="reject" className="bg-slate-900 text-rose-400">Rejected (Redo Erection)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      REJECTION REASON
                    </label>
                    <input
                      type="text"
                      disabled={!isRejected}
                      value={isRejected ? item.rejectionReason : ""}
                      onChange={(e) => updateItemField(item.tempId, "rejectionReason", e.target.value)}
                      placeholder={isRejected ? "Provide defect or delay details..." : "Not applicable (Placed securely)"}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none ${!isRejected ? 'opacity-40 select-none' : 'font-semibold border-amber-500/30'}`}
                    />
                  </div>
                </div>

                {/* Live element total weight feedback */}
                {item.weight && (
                  <div className="text-[10px] text-slate-500 text-right font-medium">
                    Subtotal item weight: <strong className="text-slate-300">{(Number(item.weight) * (Number(item.quantity) || 1)).toFixed(3)} Tons</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Product Item dashed button */}
        <button
          type="button"
          onClick={handleAddItem}
          className="w-full border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/25 hover:bg-slate-950/45 py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 tracking-wider transition-all cursor-pointer active:scale-[0.99]"
        >
          <Plus className="h-4 w-4 shrink-0 text-indigo-400" />
          + Add Product Item
        </button>
      </div>

      {/* BLOCK 6: Supervisor Remarks */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
          SUPERVISOR REMARKS
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Any notes..."
          className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* BLOCK 7: Action Buttons */}
      {!selectedSite && (
        <div className="p-3.5 text-xs text-amber-200 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center gap-2 animate-fade-in mt-4">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-semibold">⚠️ BINA SITE NO. KE KOI ENTRY NHI HOGI: Please select or register a construction project site above before saving.</span>
        </div>
      )}

      <div className="flex gap-3 pt-2.5 border-t border-slate-900">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !selectedSite}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-lg text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          ) : (
            <span className="font-black text-sm">✓</span>
          )}
          <span>Save Product</span>
        </button>

        <button
          type="button"
          onClick={handleClearForm}
          className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-5 rounded-lg text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
        >
          <span className="font-black text-sm">✕</span>
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
