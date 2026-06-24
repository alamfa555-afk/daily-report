import React, { useState, useMemo } from "react";
import { ListFilter, CalendarRange, Download, Printer, Percent, Info, Sparkles } from "lucide-react";
import { Delivery, Erection, Site } from "../types";

interface ReportExportProps {
  selectedSite: Site | null;
  deliveries: Delivery[];
  erections: Erection[];
}

export default function ReportExport({
  selectedSite,
  deliveries = [],
  erections = []
}: ReportExportProps) {
  const [filterPeriod, setFilterPeriod] = useState<"daily" | "weekly" | "monthly" | "all">("all");
  const [selectedElementType, setSelectedElementType] = useState<string>("all");
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>("all");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Get unique element types in deliveries and erections
  const uniqueElementTypes = useMemo(() => {
    const typesSet = new Set<string>();
    deliveries.forEach((d) => {
      if (d.elementType) typesSet.add(d.elementType);
    });
    erections.forEach((e) => {
      if (e.elementType) typesSet.add(e.elementType);
    });
    return Array.from(typesSet);
  }, [deliveries, erections]);

  // Extract unique employees
  const uniqueEmployees = useMemo(() => {
    const empMap = new Map<string, { name: string; id: string }>();
    
    deliveries.forEach((d) => {
      const u = d.unloadingDetails;
      if (u && u.unloaderName) {
        const key = u.unloaderName.trim().toUpperCase();
        empMap.set(key, { name: u.unloaderName.trim(), id: u.unloaderId?.trim() || "N/A" });
      }
    });

    erections.forEach((e) => {
      const er = e.erectionDetails;
      if (er && er.erectorName) {
        const key = er.erectorName.trim().toUpperCase();
        empMap.set(key, { name: er.erectorName.trim(), id: er.erectorId?.trim() || "N/A" });
      }
    });

    return Array.from(empMap.values());
  }, [deliveries, erections]);

  // Determine date ranges
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of week (7 days ago)
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - 7);

    // Start of month (30 days ago)
    const startOfMonth = new Date();
    startOfMonth.setDate(now.getDate() - 30);

    const checkPeriod = (dateStr: string) => {
      const recordDate = new Date(dateStr);
      if (filterPeriod === "daily") {
        return recordDate >= startOfToday;
      }
      if (filterPeriod === "weekly") {
        return recordDate >= startOfWeek;
      }
      if (filterPeriod === "monthly") {
        return recordDate >= startOfMonth;
      }
      return true; // All time
    };

    const filterItem = (item: any) => {
      const matchesPeriod = checkPeriod(item.createdAt);
      const matchesType = selectedElementType === "all" || item.elementType === selectedElementType;
      return matchesPeriod && matchesType;
    };

    return {
      deliveries: deliveries.filter(filterItem),
      erections: erections.filter(filterItem)
    };
  }, [deliveries, erections, filterPeriod, selectedElementType]);

  // Filtered by Employee for display & print
  const employeeFilteredData = useMemo(() => {
    if (selectedEmployeeName === "all") {
      return filteredData;
    }
    return {
      deliveries: filteredData.deliveries.filter(
        (d) => d.unloadingDetails?.unloaderName?.trim().toLowerCase() === selectedEmployeeName.toLowerCase()
      ),
      erections: filteredData.erections.filter(
        (e) => e.erectionDetails?.erectorName?.trim().toLowerCase() === selectedEmployeeName.toLowerCase()
      )
    };
  }, [filteredData, selectedEmployeeName]);

  // Download Excel CSV Logic
  const handleDownloadCSV = (type: "deliveries" | "erections") => {
    const dataList = type === "deliveries" ? employeeFilteredData.deliveries : employeeFilteredData.erections;
    if (dataList.length === 0) {
      setErrorNotice(`No ${type} records available for current filters to download.`);
      setTimeout(() => setErrorNotice(null), 5000);
      return;
    }

    let csvContent = "";
    if (type === "deliveries") {
      // Headers for deliveries
      csvContent += "MDR No,Trailer No,Element Code,Element Type,Weight (Ton),Quantity,Total Weight (Ton),Status,Zone,Villa Type,Building No,House No,Flat No,Unloader Name,Equipment,Equipment Capacity (Ton),Equipment Plate No,Operator Name,Date Received\n";
      
      dataList.forEach((d) => {
        const row = [
          `"${d.mdrNo || "N/A"}"`,
          `"${d.trailerNo || ""}"`,
          `"${d.elementCode || ""}"`,
          `"${d.elementType || ""}"`,
          d.weight,
          d.quantity,
          d.totalWeight,
          `"${d.status || ""}"`,
          `"${d.zone || ""}"`,
          `"${d.villaType || ""}"`,
          `"${d.buildingNo || ""}"`,
          `"${d.houseNo || ""}"`,
          `"${d.flatNo || ""}"`,
          `"${d.unloadingDetails?.unloaderName || ""}"`,
          `"${d.unloadingDetails?.equipmentType || ""}"`,
          d.unloadingDetails?.capacity || 0,
          `"${d.unloadingDetails?.equipmentPlateNo || ""}"`,
          `"${d.unloadingDetails?.operatorName || ""}"`,
          `"${new Date(d.createdAt).toLocaleDateString()}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      // Headers for erections (NO MDR)
      csvContent += "Element Code,Element Type,Weight (Ton),Quantity,Total Weight (Ton),Status,Zone,Villa Type,Building No,House No,Flat No,Erector Name,Equipment,Equipment Capacity (Ton),Equipment Plate No,Operator Name,Date Erected\n";
      
      dataList.forEach((e) => {
        const row = [
          `"${e.elementCode || ""}"`,
          `"${e.elementType || ""}"`,
          e.weight,
          e.quantity,
          e.totalWeight,
          `"${e.status || ""}"`,
          `"${e.zone || ""}"`,
          `"${e.villaType || ""}"`,
          `"${e.buildingNo || ""}"`,
          `"${e.houseNo || ""}"`,
          `"${e.flatNo || ""}"`,
          `"${e.erectionDetails?.erectorName || ""}"`,
          `"${e.erectionDetails?.equipmentType || ""}"`,
          e.erectionDetails?.capacity || 0,
          `"${e.erectionDetails?.equipmentPlateNo || ""}"`,
          `"${e.erectionDetails?.operatorName || ""}"`,
          `"${new Date(e.createdAt).toLocaleDateString()}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ARA_Precast_${type}_Report_${selectedSite?.siteNo || "unknown"}_${filterPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modern Document PDF Print
  const handlePrintPDF = () => {
    window.print();
  };

  // Computations for report stats
  const repDelWeight = employeeFilteredData.deliveries.reduce((s, x) => s + (x.totalWeight || 0), 0);
  const repDelQty = employeeFilteredData.deliveries.reduce((s, x) => s + (x.quantity || 1), 0);
  const repEreWeight = employeeFilteredData.erections.reduce((s, x) => s + (x.totalWeight || 0), 0);
  const repEreQty = employeeFilteredData.erections.reduce((s, x) => s + (x.quantity || 1), 0);

  // Good Received totals only for Awaiting Erection calculations
  const repGoodDelWeight = employeeFilteredData.deliveries.filter(d => d.status === "good").reduce((s, x) => s + (x.totalWeight || 0), 0);
  const repGoodDelQty = employeeFilteredData.deliveries.filter(d => d.status === "good").reduce((s, x) => s + (x.quantity || 1), 0);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-7xl mx-auto my-6 non-printable">
      {errorNotice && (
        <div className="mb-4 p-3.5 text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-xl flex justify-between items-center animate-fade-in animate-scale-in">
          <span className="font-semibold">{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-rose-450 hover:text-rose-300 font-extrabold text-sm px-1.5 py-0.5 rounded cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
      {/* Upper header */}
      <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
        <ListFilter className="h-4.5 w-4.5 text-blue-400" />
        Site Reports & Exports Generator
      </h3>

      {/* Control Box: Filter Period, Element Type & Employee */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
            Select Report Period
          </label>
          <div className="flex gap-1.5 p-1.5 bg-slate-950/70 border border-slate-800/85 rounded-xl">
            {(["all", "daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPeriod(p)}
                className={`flex-1 text-[11px] font-bold py-2 rounded text-center uppercase tracking-wide transition-all cursor-pointer ${
                  filterPeriod === p
                    ? "bg-[#1e293b] text-blue-400 shadow-md border border-slate-750"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {p === "all" ? "All" : p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
            Filter Element Type
          </label>
          <select
            value={selectedElementType}
            onChange={(e) => setSelectedElementType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer [&_option]:bg-slate-900"
          >
            <option value="all">ALL ELEMENT TYPES ({uniqueElementTypes.length})</option>
            {uniqueElementTypes.map((type, idx) => (
              <option key={idx} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-1">
            <span>Employee Progress</span>
            <span className="text-[8px] text-blue-400 bg-blue-500/10 px-1 py-0.2 rounded font-black font-mono">REPORT</span>
          </label>
          <select
            value={selectedEmployeeName}
            onChange={(e) => setSelectedEmployeeName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer [&_option]:bg-slate-900"
          >
            <option value="all">ALL EMPLOYEES ({uniqueEmployees.length})</option>
            {uniqueEmployees.map((emp, idx) => (
              <option key={idx} value={emp.name}>
                {emp.name} {emp.id && emp.id !== "N/A" ? `(ID: ${emp.id})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Generate and trigger buttons */}
        <div className="md:col-span-2 flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => handleDownloadCSV("deliveries")}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
          >
            <Download className="h-3.5 w-3.5" />
            Download Receivers CSV
          </button>

          <button
            type="button"
            onClick={() => handleDownloadCSV("erections")}
            className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
          >
            <Download className="h-3.5 w-3.5" />
            Download Erections CSV
          </button>

          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Letterhead PDF
          </button>
        </div>
      </div>

      {/* Quick summary of filtered data inside UI */}
      <div className="bg-slate-950/40 rounded-2xl p-4.5 border border-slate-800 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span>
            Showing filtered summary for <strong>{selectedSite ? `Site No. ${selectedSite.siteNo}` : "all sites"}</strong> (
            <strong>{filterPeriod.toUpperCase()}</strong> records with element: <strong>{selectedElementType.toUpperCase()}</strong>)
          </span>
        </div>
        <div className="flex gap-4 flex-wrap font-semibold">
          <div>
            Received: <strong className="text-blue-400">{repDelWeight.toFixed(2)} T</strong> ({repDelQty} elements)
          </div>
          <div>
            Erected: <strong className="text-purple-400">{repEreWeight.toFixed(2)} T</strong> ({repEreQty} elements)
          </div>
        </div>
      </div>

      {/* Hidden layout specifically customized for PRINTING */}
      <div className="hidden printing-template absolute top-0 left-0 w-full bg-white text-black p-8 font-sans">
        {/* Print Only Styles will be in main index.css but we design the visual structure here */}
        <div className="border-b-4 border-blue-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              {/* Beautiful Styled Company Vector Logo */}
              <div className="flex items-center gap-3 mb-1.5">
                <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Upward pointed pyramid/arrow in Blue */}
                  <path d="M50 10 L90 80 H10 L50 10 Z" fill="#1e40af" />
                  {/* Inner design representing the stylish 'ARA' */}
                  <path d="M35 55 H65 L50 30 Z" fill="#ffffff" />
                  <path d="M25 75 H75 L50 62 Z" fill="#581c87" />
                </svg>
                <div>
                  <h1 className="text-xl font-black text-blue-900 leading-tight tracking-wider">
                    AL RASHID ABETONG
                  </h1>
                  <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-widest leading-none">
                    PRECAST CONCRETE BUILDINGS CONTRACTOR
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500">Precast Construction Receiving & Erection Field Office</p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <div className="font-bold text-sm text-blue-900 uppercase">
                {selectedEmployeeName !== "all" ? "Employee Progress Report" : "Field Audit Report"}
              </div>
              {selectedEmployeeName !== "all" && (
                <div className="font-black text-xs text-purple-900 mt-0.5">
                  EMPLOYEE: {selectedEmployeeName.toUpperCase()}
                </div>
              )}
              <div className="mt-1">Date Generated: {new Date().toLocaleDateString()}</div>
              <div>Project Site: No. {selectedSite?.siteNo} ({selectedSite?.name})</div>
              <div>Report Period: {filterPeriod.toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* Audit metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-xs text-center">
          <div className="border border-gray-200 rounded p-2.5">
            <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Total Precast Received</span>
            <span className="text-base font-black text-blue-900">{repDelWeight.toFixed(2)} Tons</span>
            <span className="block text-[9px] text-gray-400">({repDelQty} elements total)</span>
          </div>

          <div className="border border-gray-200 rounded p-2.5">
            <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Total Precast Erected</span>
            <span className="text-base font-black text-purple-900">{repEreWeight.toFixed(2)} Tons</span>
            <span className="block text-[9px] text-gray-400">({repEreQty} elements total)</span>
          </div>

          <div className="border border-gray-200 rounded p-2.5">
            <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Awaiting Erection (Good Only)</span>
            <span className="text-base font-black text-amber-700">{Math.max(0, repGoodDelWeight - repEreWeight).toFixed(2)} Tons</span>
            <span className="block text-[9px] text-gray-400">({Math.max(0, repGoodDelQty - repEreQty)} elements)</span>
          </div>

          <div className="border border-gray-200 rounded p-2.5">
            <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Damages / Rejects</span>
            <span className="text-base font-black text-red-600">
              {employeeFilteredData.deliveries.filter(d => d.status !== "good").length + employeeFilteredData.erections.filter(e => e.status !== "good").length}
            </span>
            <span className="block text-[9px] text-gray-400">reported exceptions</span>
          </div>
        </div>

        {/* Section A: Deliveries Received */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-blue-900 border-b border-blue-900 pb-1 mb-2 uppercase tracking-wide">
            1. Precast Deliveries Received Logs ({employeeFilteredData.deliveries.length} items)
          </h4>
          <table className="w-full text-left text-[9px] border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                <th className="p-1 px-2">MDR SLIP</th>
                <th className="p-1 px-2">TRAILER NO</th>
                <th className="p-1 px-2">ELEMENT CODE</th>
                <th className="p-1 px-2">TYPE</th>
                <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                <th className="p-1 px-2 text-center">QTY</th>
                <th className="p-1 px-2 text-right">TOTAL (T)</th>
                <th className="p-1 px-2">STATUS</th>
                <th className="p-1 px-2">CRANE NO</th>
                <th className="p-1 px-2">COORDINATES</th>
                <th className="p-1 px-2">DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {employeeFilteredData.deliveries.length > 0 ? (
                employeeFilteredData.deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="p-1 px-2 font-bold">{d.mdrNo}</td>
                    <td className="p-1 px-2 font-mono">{d.trailerNo || "-"}</td>
                    <td className="p-1 px-2 font-mono text-blue-800">{d.elementCode}</td>
                    <td className="p-1 px-2">{d.elementType}</td>
                    <td className="p-1 px-2 text-right">{d.weight.toFixed(3)}</td>
                    <td className="p-1 px-2 text-center">{d.quantity}</td>
                    <td className="p-1 px-2 text-right font-bold">{d.totalWeight.toFixed(3)}</td>
                    <td className="p-1 px-2 font-bold">{d.status.toUpperCase()}</td>
                    <td className="p-1 px-2 font-semibold">
                      {d.unloadingDetails?.equipmentPlateNo || d.unloadingDetails?.equipmentType || "-"}
                    </td>
                    <td className="p-1 px-2 text-gray-500">
                      {d.zone || "-"} / {d.villaType || "-"} / B:{d.buildingNo || "-"}
                    </td>
                    <td className="p-1 px-2 font-mono text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-2 text-center text-gray-400 italic">No delivery records matching parameters during this audit snapshot.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section B: Erections Log */}
        <div>
          <h4 className="text-xs font-bold text-purple-900 border-b border-purple-900 pb-1 mb-2 uppercase tracking-wide">
            2. Precast Assembly & Erection Logs ({employeeFilteredData.erections.length} items)
          </h4>
          <table className="w-full text-left text-[9px] border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                <th className="p-1 px-2">ELEMENT CODE</th>
                <th className="p-1 px-2">TYPE</th>
                <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                <th className="p-1 px-2 text-center">QTY</th>
                <th className="p-1 px-2 text-right">TOTAL (T)</th>
                <th className="p-1 px-2">STATUS</th>
                <th className="p-1 px-2">COORDINATES</th>
                <th className="p-1 px-2">EQUIPMENT CRANE</th>
                <th className="p-1 px-2">DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {employeeFilteredData.erections.length > 0 ? (
                employeeFilteredData.erections.map((e) => (
                  <tr key={e.id}>
                    <td className="p-1 px-2 font-mono text-purple-800 font-semibold">{e.elementCode}</td>
                    <td className="p-1 px-2">{e.elementType}</td>
                    <td className="p-1 px-2 text-right">{e.weight.toFixed(3)}</td>
                    <td className="p-1 px-2 text-center">{e.quantity}</td>
                    <td className="p-1 px-2 text-right font-bold">{e.totalWeight.toFixed(3)}</td>
                    <td className="p-1 px-2 font-bold">{e.status.toUpperCase()}</td>
                    <td className="p-1 px-2 text-gray-500">
                      {e.zone || "-"} / {e.villaType || "-"} / H:{e.houseNo || "-"}
                    </td>
                    <td className="p-1 px-2">
                      {e.erectionDetails?.equipmentPlateNo || e.erectionDetails?.equipmentType || "-"}
                    </td>
                    <td className="p-1 px-2 font-mono text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-2 text-center text-gray-400 italic">No erection records matching parameters during this audit snapshot.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Verification Stamp */}
        <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between text-[10px] text-gray-400">
          <div>AL RASHID ABETONG • Head Office: Riyadh, KSA • Precast Field Quality Operations</div>
          <div className="text-right">Receiver & Erector Digital Stamp Security Verified</div>
        </div>
      </div>
    </div>
  );
}
