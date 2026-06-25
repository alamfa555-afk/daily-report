import React, { useState, useEffect, useMemo } from "react";
import { db, collection, query, orderBy, onSnapshot } from "../lib/firebase";
import { Site, Delivery, Erection } from "../types";
import { FileSpreadsheet, FileText, Loader2, Sparkles, Building2, Package, Boxes, Layers } from "lucide-react";
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

interface SiteInventoryProps {
  sites: Site[];
  initialSelectedSite: Site | null;
}

export default function SiteInventory({ sites, initialSelectedSite }: SiteInventoryProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [erections, setErections] = useState<Erection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Default to initialSelectedSite on mount or change
  useEffect(() => {
    if (initialSelectedSite && !selectedSiteId) {
      setSelectedSiteId(initialSelectedSite.id);
    }
  }, [initialSelectedSite]);

  const activeSite = useMemo(() => {
    return sites.find(s => s.id === selectedSiteId) || null;
  }, [sites, selectedSiteId]);

  // Real-time listener for selected site's deliveries and erections
  useEffect(() => {
    if (!selectedSiteId) {
      setDeliveries([]);
      setErections([]);
      return;
    }

    setLoading(true);
    const deliverQ = query(collection(db, "deliveries"), orderBy("createdAt", "desc"));
    const unsubDeliveries = onSnapshot(deliverQ, (snapshot) => {
      const loaded: Delivery[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as Delivery;
        if (item.siteId === selectedSiteId) {
          loaded.push({ ...item, id: doc.id });
        }
      });
      setDeliveries(loaded);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setErrorNotice("Failed to load deliveries.");
      setLoading(false);
    });

    const erectQ = query(collection(db, "erections"), orderBy("createdAt", "desc"));
    const unsubErections = onSnapshot(erectQ, (snapshot) => {
      const loaded: Erection[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as Erection;
        if (item.siteId === selectedSiteId) {
          loaded.push({ ...item, id: doc.id });
        }
      });
      setErections(loaded);
    }, (err) => {
      console.error(err);
      setErrorNotice("Failed to load erections.");
    });

    return () => {
      unsubDeliveries();
      unsubErections();
    };
  }, [selectedSiteId]);

  // Compute itemized inventory: Grouped by Element Code and Element Type
  const itemizedInventory = useMemo(() => {
    const map = new Map<string, {
      elementCode: string;
      elementType: string;
      receivedQty: number;
      receivedWeight: number;
      erectedQty: number;
      erectedWeight: number;
      goodReceivedQty: number;
      goodReceivedWeight: number;
      damagedCount: number;
      rejectedCount: number;
    }>();

    // Group Deliveries
    deliveries.forEach(d => {
      const code = (d.elementCode || "UNKNOWN").trim().toUpperCase();
      const type = (d.elementType || "Precast").trim().toUpperCase();
      const key = `${code}_${type}`;

      const existing = map.get(key) || {
        elementCode: d.elementCode || "UNKNOWN",
        elementType: d.elementType || "Precast",
        receivedQty: 0,
        receivedWeight: 0,
        erectedQty: 0,
        erectedWeight: 0,
        goodReceivedQty: 0,
        goodReceivedWeight: 0,
        damagedCount: 0,
        rejectedCount: 0
      };

      const qty = d.quantity || 1;
      const weight = d.totalWeight || d.weight || 0;

      existing.receivedQty += qty;
      existing.receivedWeight += weight;

      if (d.status === "good") {
        existing.goodReceivedQty += qty;
        existing.goodReceivedWeight += weight;
      } else if (d.status === "damage") {
        existing.damagedCount += qty;
      } else if (d.status === "reject") {
        existing.rejectedCount += qty;
      }

      map.set(key, existing);
    });

    // Group Erections
    erections.forEach(e => {
      const code = (e.elementCode || "UNKNOWN").trim().toUpperCase();
      const type = (e.elementType || "Precast").trim().toUpperCase();
      const key = `${code}_${type}`;

      const existing = map.get(key) || {
        elementCode: e.elementCode || "UNKNOWN",
        elementType: e.elementType || "Precast",
        receivedQty: 0,
        receivedWeight: 0,
        erectedQty: 0,
        erectedWeight: 0,
        goodReceivedQty: 0,
        goodReceivedWeight: 0,
        damagedCount: 0,
        rejectedCount: 0
      };

      const qty = e.quantity || 1;
      const weight = e.totalWeight || e.weight || 0;

      existing.erectedQty += qty;
      existing.erectedWeight += weight;

      map.set(key, existing);
    });

    return Array.from(map.values()).map(item => {
      // Balance is Good received minus Erected
      const balanceQty = Math.max(0, item.goodReceivedQty - item.erectedQty);
      const balanceWeight = Math.max(0, item.goodReceivedWeight - item.erectedWeight);
      return {
        ...item,
        balanceQty,
        balanceWeight
      };
    });
  }, [deliveries, erections]);

  // Totals for summary cards
  const summaryTotals = useMemo(() => {
    const totalRecQty = itemizedInventory.reduce((s, x) => s + x.receivedQty, 0);
    const totalRecWt = itemizedInventory.reduce((s, x) => s + x.receivedWeight, 0);
    const totalEreQty = itemizedInventory.reduce((s, x) => s + x.erectedQty, 0);
    const totalEreWt = itemizedInventory.reduce((s, x) => s + x.erectedWeight, 0);
    const totalBalQty = itemizedInventory.reduce((s, x) => s + x.balanceQty, 0);
    const totalBalWt = itemizedInventory.reduce((s, x) => s + x.balanceWeight, 0);
    const totalDmgQty = itemizedInventory.reduce((s, x) => s + x.damagedCount, 0);
    const totalRejQty = itemizedInventory.reduce((s, x) => s + x.rejectedCount, 0);

    return {
      totalRecQty,
      totalRecWt,
      totalEreQty,
      totalEreWt,
      totalBalQty,
      totalBalWt,
      totalDmgQty,
      totalRejQty
    };
  }, [itemizedInventory]);

  // CSV Exporter
  const handleDownloadCSV = () => {
    if (itemizedInventory.length === 0) {
      setErrorNotice("No inventory records found to export.");
      return;
    }

    let csvContent = `Site ID,Site No,Site Name,Element Code,Element Type,Total Received Qty,Total Received Weight (T),Total Erected Qty,Total Erected Weight (T),Good Received Qty,On-Site Balance Qty,On-Site Balance Weight (T),Damaged Received,Rejected Received\n`;

    itemizedInventory.forEach(item => {
      const row = [
        `"${activeSite?.id || ""}"`,
        `"${activeSite?.siteNo || ""}"`,
        `"${activeSite?.name || ""}"`,
        `"${item.elementCode}"`,
        `"${item.elementType}"`,
        item.receivedQty,
        item.receivedWeight.toFixed(2),
        item.erectedQty,
        item.erectedWeight.toFixed(2),
        item.goodReceivedQty,
        item.balanceQty,
        item.balanceWeight.toFixed(2),
        item.damagedCount,
        item.rejectedCount
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ARA_Inventory_Balance_Report_Site_${activeSite?.siteNo || "All"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Exporter
  const handleDownloadPDF = () => {
    if (itemizedInventory.length === 0) {
      setErrorNotice("No inventory records found to export.");
      return;
    }

    try {
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
      doc.text("SITE INVENTORY STOCK BALANCE REPORT", 105, 37, { align: "center" });

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
      const siteText = activeSite ? `Site No. ${activeSite.siteNo} - ${activeSite.name}` : "N/A";
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
      doc.text("LEDGER SOURCE:", 135, 49.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("REAL-TIME OPERATIONS", 165, 49.5);

      // Stat Boxes Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("KEY FIGURES & STOCK SUMMARY", 12, 59);

      // Stat Boxes starting at Y = 62
      const drawStatBox = (x: number, title: string, qty: number, wt: number, rgb: number[]) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(x, 62, 58, 20, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, 62, 58, 20, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(title, x + 3, 67);

        doc.setFontSize(9.5);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(`${qty} PCS / ${wt.toFixed(2)} T`, x + 3, 73);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("* Real-time ledger records", x + 3, 79);
      };

      drawStatBox(12, "TOTAL RECEIVED PRECAST", summaryTotals.totalRecQty, summaryTotals.totalRecWt, [16, 185, 129]);
      drawStatBox(76, "TOTAL ASSEMBLY ERECTED", summaryTotals.totalEreQty, summaryTotals.totalEreWt, [147, 51, 234]);
      drawStatBox(140, "ON-SITE STOCK BALANCE", summaryTotals.totalBalQty, summaryTotals.totalBalWt, [217, 119, 6]);

      // Table Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("ITEMIZED PRECAST STOCK BREAKDOWN", 12, 88);

      const tableRows = itemizedInventory.map(item => [
        item.elementCode,
        item.elementType,
        item.receivedQty,
        item.receivedWeight.toFixed(2),
        item.erectedQty,
        item.erectedWeight.toFixed(2),
        item.balanceQty,
        item.balanceWeight.toFixed(2),
        item.damagedCount,
        item.rejectedCount
      ]);

      autoTable(doc, {
        startY: 91,
        head: [["Element Code", "Type", "Rec Qty", "Rec Wt (T)", "Ere Qty", "Ere Wt (T)", "Bal Qty", "Bal Wt (T)", "Dmg", "Rej"]],
        body: tableRows,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount} - Site Inventory Report`, 12, 287);
        doc.text("AL RASHID ABETONG PRECAST OPERATIONS", 110, 287);
      }

      doc.save(`ARA_Site_Inventory_Report_Site_${activeSite?.siteNo || "All"}.pdf`);
    } catch (err) {
      console.error(err);
      setErrorNotice("Failed to download PDF.");
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-2xl animate-fade-in text-slate-200">
      
      {errorNotice && (
        <div className="mb-4 p-3 text-xs text-rose-200 bg-rose-500/15 border border-rose-500/25 rounded-xl flex justify-between items-center">
          <span>{errorNotice}</span>
          <button onClick={() => setErrorNotice(null)} className="text-rose-450 hover:text-rose-300 font-extrabold text-sm">×</button>
        </div>
      )}

      {/* Top Controller Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/50 p-4 border border-slate-850 rounded-2xl mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl">
            <Boxes className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider">
              Site Inventory Stock Balance Ledger
            </h4>
            <p className="text-xs text-slate-400">
              Select any project site below to query its real-time stock and print immediate reports.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Site Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Site No.</span>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer [&_option]:bg-slate-950"
            >
              <option value="">-- SELECT SITE --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  Site No. {s.siteNo} {s.name ? `- ${s.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer transition-all hover:scale-[1.01]"
              title="Download Stock inventory as CSV"
              disabled={loading || itemizedInventory.length === 0}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Download CSV
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 px-3.5 rounded-xl text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow cursor-pointer transition-all hover:scale-[1.01]"
              title="Download stock inventory as PDF Report"
              disabled={loading || itemizedInventory.length === 0}
            >
              <FileText className="h-3.5 w-3.5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-7 w-7 text-blue-500" />
          <span className="text-xs uppercase tracking-widest">Querying Site Stock Databases...</span>
        </div>
      ) : activeSite ? (
        <div className="space-y-4">
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-950/30 p-3.5 border border-slate-850/70 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">Total Received</span>
                <span className="text-xl font-black text-emerald-400">{summaryTotals.totalRecQty} PCS</span>
                <span className="block text-[9px] text-slate-500">{summaryTotals.totalRecWt.toFixed(2)} Tons weight</span>
              </div>
              <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <Package className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950/30 p-3.5 border border-slate-850/70 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">Total Erected</span>
                <span className="text-xl font-black text-purple-400">{summaryTotals.totalEreQty} PCS</span>
                <span className="block text-[9px] text-slate-500">{summaryTotals.totalEreWt.toFixed(2)} Tons weight</span>
              </div>
              <div className="text-purple-500 bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                <Layers className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-slate-950/30 p-3.5 border border-slate-850/70 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">On-Site Balance</span>
                <span className="text-xl font-black text-amber-400">{summaryTotals.totalBalQty} PCS</span>
                <span className="block text-[9px] text-slate-500">{summaryTotals.totalBalWt.toFixed(2)} Tons weight</span>
              </div>
              <div className="text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <Boxes className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-850 overflow-hidden">
            <div className="p-3 bg-slate-950/70 border-b border-slate-850 flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-black uppercase text-white tracking-wider">Itemized Stock Balance breakdown</span>
              <span className="text-[10px] text-slate-400">({itemizedInventory.length} precast elements catalogued)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/30 text-slate-450 border-b border-slate-850 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3 px-4">Element Code</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-center">Rec Qty</th>
                    <th className="p-3 text-right">Rec Wt (T)</th>
                    <th className="p-3 text-center text-purple-300">Ere Qty</th>
                    <th className="p-3 text-right text-purple-300">Ere Wt (T)</th>
                    <th className="p-3 text-center text-amber-300 font-bold">Bal Qty</th>
                    <th className="p-3 text-right text-amber-300 font-bold">Bal Wt (T)</th>
                    <th className="p-3 text-center text-red-400">Dmg</th>
                    <th className="p-3 text-center text-red-500">Rej</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-mono text-[11px]">
                  {itemizedInventory.length > 0 ? (
                    itemizedInventory.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-900/20 transition-all">
                        <td className="p-3 px-4 font-bold text-white">{item.elementCode}</td>
                        <td className="p-3 text-slate-300 font-sans">{item.elementType}</td>
                        <td className="p-3 text-center text-slate-300">{item.receivedQty}</td>
                        <td className="p-3 text-right text-slate-400">{item.receivedWeight.toFixed(2)}</td>
                        <td className="p-3 text-center text-purple-300">{item.erectedQty}</td>
                        <td className="p-3 text-right text-purple-400">{item.erectedWeight.toFixed(2)}</td>
                        <td className="p-3 text-center text-amber-300 font-bold bg-amber-500/5">{item.balanceQty}</td>
                        <td className="p-3 text-right text-amber-400 font-bold bg-amber-500/5">{item.balanceWeight.toFixed(2)}</td>
                        <td className="p-3 text-center text-red-400">{item.damagedCount || "-"}</td>
                        <td className="p-3 text-center text-red-500">{item.rejectedCount || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 italic font-sans text-xs">
                        No precast entries found on this project site to establish an inventory report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500 italic text-xs">
          Please select a valid site number to establish the live inventory ledger.
        </div>
      )}
    </div>
  );
}
