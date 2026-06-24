import React, { useState, useMemo, useEffect } from "react";
import { ListFilter, CalendarRange, FileSpreadsheet, FileText, Printer, Percent, Info, Sparkles, Search, UserCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Delivery, Erection, Site } from "../types";
import { db, collection, getDocs, onSnapshot } from "../lib/firebase";

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

  // New features state variables
  const [activeTab, setActiveTab] = useState<"standard" | "foreman" | "search">("standard");
  const [selectedForemanDetail, setSelectedForemanDetail] = useState<string | null>(null);
  
  const [searchEmpId, setSearchEmpId] = useState<string>("");
  const [searchSiteNo, setSearchSiteNo] = useState<string>("");
  const [searchDate, setSearchDate] = useState<string>("");
  const [searchElementCode, setSearchElementCode] = useState<string>("");
  const [searchTriggered, setSearchTriggered] = useState<boolean>(false);

  const [allSites, setAllSites] = useState<Site[]>([]);
  const [allDeliveries, setAllDeliveries] = useState<Delivery[]>([]);
  const [allErections, setAllErections] = useState<Erection[]>([]);
  const [loadingSearchData, setLoadingSearchData] = useState<boolean>(false);

  const [printSource, setPrintSource] = useState<"standard" | "foreman" | "search">("standard");
  const [printForemanName, setPrintForemanName] = useState<string | null>(null);
  const [printForemanSiteNo, setPrintForemanSiteNo] = useState<string | null>(null);

  useEffect(() => {
    setLoadingSearchData(true);

    // Real-time listener for sites
    const unsubSites = onSnapshot(collection(db, "sites"), (snapshot) => {
      const sitesList: Site[] = [];
      snapshot.forEach((doc) => {
        sitesList.push({ ...doc.data() as Site, id: doc.id });
      });
      setAllSites(sitesList);
    }, (err) => {
      console.error("Error loading sites in real-time:", err);
    });

    // Real-time listener for deliveries
    const unsubDeliveries = onSnapshot(collection(db, "deliveries"), (snapshot) => {
      const delList: Delivery[] = [];
      snapshot.forEach((doc) => {
        delList.push({ ...doc.data() as Delivery, id: doc.id });
      });
      setAllDeliveries(delList);
      setLoadingSearchData(false);
    }, (err) => {
      console.error("Error loading deliveries in real-time:", err);
      setLoadingSearchData(false);
    });

    // Real-time listener for erections
    const unsubErections = onSnapshot(collection(db, "erections"), (snapshot) => {
      const ereList: Erection[] = [];
      snapshot.forEach((doc) => {
        ereList.push({ ...doc.data() as Erection, id: doc.id });
      });
      setAllErections(ereList);
    }, (err) => {
      console.error("Error loading erections in real-time:", err);
    });

    return () => {
      unsubSites();
      unsubDeliveries();
      unsubErections();
    };
  }, []);

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

  // Dynamic foreman summaries (Sare Foreman/Supervisor ka summary grouped by Site)
  const foremanSummaries = useMemo(() => {
    const siteMap = new Map<string, string>();
    allSites.forEach((s) => {
      siteMap.set(s.id, s.siteNo);
    });

    const summaryMap = new Map<string, {
      name: string;
      id: string;
      siteNo: string;
      totalDelQty: number;
      totalDelWeight: number;
      totalEreQty: number;
      totalEreWeight: number;
      lastActive: string;
    }>();

    allDeliveries.forEach((d) => {
      const u = d.unloadingDetails;
      if (u && u.unloaderName) {
        const foremanName = u.unloaderName.trim();
        const siteNo = d.siteId ? (siteMap.get(d.siteId) || "N/A") : "N/A";
        const key = `${foremanName.toUpperCase()}_${siteNo.toUpperCase()}`;

        const existing = summaryMap.get(key) || {
          name: foremanName,
          id: u.unloaderId?.trim() || "N/A",
          siteNo: siteNo,
          totalDelQty: 0,
          totalDelWeight: 0,
          totalEreQty: 0,
          totalEreWeight: 0,
          lastActive: d.createdAt
        };

        existing.totalDelQty += d.quantity || 1;
        existing.totalDelWeight += d.totalWeight || d.weight || 0;
        if (new Date(d.createdAt) > new Date(existing.lastActive)) {
          existing.lastActive = d.createdAt;
        }
        if (u.unloaderId && existing.id === "N/A") {
          existing.id = u.unloaderId.trim();
        }
        summaryMap.set(key, existing);
      }
    });

    allErections.forEach((e) => {
      const er = e.erectionDetails;
      if (er && er.erectorName) {
        const foremanName = er.erectorName.trim();
        const siteNo = e.siteId ? (siteMap.get(e.siteId) || "N/A") : "N/A";
        const key = `${foremanName.toUpperCase()}_${siteNo.toUpperCase()}`;

        const existing = summaryMap.get(key) || {
          name: foremanName,
          id: er.erectorId?.trim() || "N/A",
          siteNo: siteNo,
          totalDelQty: 0,
          totalDelWeight: 0,
          totalEreQty: 0,
          totalEreWeight: 0,
          lastActive: e.createdAt
        };

        existing.totalEreQty += e.quantity || 1;
        existing.totalEreWeight += e.totalWeight || e.weight || 0;
        if (new Date(e.createdAt) > new Date(existing.lastActive)) {
          existing.lastActive = e.createdAt;
        }
        if (er.erectorId && existing.id === "N/A") {
          existing.id = er.erectorId.trim();
        }
        summaryMap.set(key, existing);
      }
    });

    return Array.from(summaryMap.values());
  }, [allDeliveries, allErections, allSites]);

  // Extract unique employees for advanced search
  const searchEmployees = useMemo(() => {
    const empMap = new Map<string, { name: string; id: string }>();
    
    allDeliveries.forEach((d) => {
      const u = d.unloadingDetails;
      if (u && u.unloaderName) {
        const key = u.unloaderName.trim().toUpperCase();
        empMap.set(key, { name: u.unloaderName.trim(), id: u.unloaderId?.trim() || "" });
      }
    });

    allErections.forEach((e) => {
      const er = e.erectionDetails;
      if (er && er.erectorName) {
        const key = er.erectorName.trim().toUpperCase();
        empMap.set(key, { name: er.erectorName.trim(), id: er.erectorId?.trim() || "" });
      }
    });

    return Array.from(empMap.values());
  }, [allDeliveries, allErections]);

  // Map siteId to siteNo
  const siteMap = useMemo(() => {
    const map = new Map<string, string>();
    allSites.forEach((s) => {
      map.set(s.id, s.siteNo);
    });
    return map;
  }, [allSites]);

  // Extract unique element codes/types for search dropdown
  const searchElements = useMemo(() => {
    const elSet = new Set<string>();
    allDeliveries.forEach((d) => {
      if (d.elementCode) elSet.add(d.elementCode.trim());
      if (d.elementType) elSet.add(d.elementType.trim());
    });
    allErections.forEach((e) => {
      if (e.elementCode) elSet.add(e.elementCode.trim());
      if (e.elementType) elSet.add(e.elementType.trim());
    });
    return Array.from(elSet).sort((a, b) => a.localeCompare(b));
  }, [allDeliveries, allErections]);

  // Extract unique dates for advanced search
  const searchDates = useMemo(() => {
    const datesSet = new Set<string>();
    
    allDeliveries.forEach((d) => {
      if (d.createdAt) {
        datesSet.add(d.createdAt.split("T")[0]);
      }
    });

    allErections.forEach((e) => {
      if (e.createdAt) {
        datesSet.add(e.createdAt.split("T")[0]);
      }
    });

    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [allDeliveries, allErections]);

  // Advanced search results
  const searchResults = useMemo(() => {
    if (!searchTriggered) return null;

    const normEmp = searchEmpId.trim().toLowerCase();
    const normSite = searchSiteNo.trim().toLowerCase();
    const normDate = searchDate.trim(); // YYYY-MM-DD
    const normElementCode = searchElementCode.trim().toLowerCase();

    // Map searchSiteNo to site ID(s)
    const matchingSites = allSites.filter(s => 
      !normSite || 
      s.siteNo.toLowerCase().includes(normSite) ||
      s.name.toLowerCase().includes(normSite)
    );
    const matchingSiteIds = new Set(matchingSites.map(s => s.id));

    const filteredDeliveries = allDeliveries.filter((d) => {
      const u = d.unloadingDetails;
      const matchesEmp = !normEmp || 
        (u?.unloaderName?.toLowerCase().includes(normEmp)) || 
        (u?.unloaderId?.toLowerCase().includes(normEmp));

      const matchesSite = !normSite || matchingSiteIds.has(d.siteId);

      let matchesDate = true;
      if (normDate) {
        const dDateStr = d.createdAt ? d.createdAt.split("T")[0] : "";
        matchesDate = dDateStr === normDate;
      }

      const matchesElement = !normElementCode || 
        d.elementCode?.toLowerCase().includes(normElementCode) || 
        d.elementType?.toLowerCase().includes(normElementCode);

      return matchesEmp && matchesSite && matchesDate && matchesElement;
    });

    const filteredErections = allErections.filter((e) => {
      const er = e.erectionDetails;
      const matchesEmp = !normEmp || 
        (er?.erectorName?.toLowerCase().includes(normEmp)) || 
        (er?.erectorId?.toLowerCase().includes(normEmp));

      const matchesSite = !normSite || matchingSiteIds.has(e.siteId);

      let matchesDate = true;
      if (normDate) {
        const eDateStr = e.createdAt ? e.createdAt.split("T")[0] : "";
        matchesDate = eDateStr === normDate;
      }

      const matchesElement = !normElementCode || 
        e.elementCode?.toLowerCase().includes(normElementCode) || 
        e.elementType?.toLowerCase().includes(normElementCode);

      return matchesEmp && matchesSite && matchesDate && matchesElement;
    });

    const totalDelWeight = filteredDeliveries.reduce((s, x) => s + (x.totalWeight || x.weight || 0), 0);
    const totalDelQty = filteredDeliveries.reduce((s, x) => s + (x.quantity || 1), 0);
    const totalEreWeight = filteredErections.reduce((s, x) => s + (x.totalWeight || x.weight || 0), 0);
    const totalEreQty = filteredErections.reduce((s, x) => s + (x.quantity || 1), 0);

    return {
      deliveries: filteredDeliveries,
      erections: filteredErections,
      totalDelWeight,
      totalDelQty,
      totalEreWeight,
      totalEreQty
    };
  }, [allSites, allDeliveries, allErections, searchEmpId, searchSiteNo, searchDate, searchElementCode, searchTriggered]);

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

  // CSV download for advanced search results
  const handleDownloadSearchCSV = () => {
    if (!searchResults) return;
    const { deliveries = [], erections = [] } = searchResults;
    if (deliveries.length === 0 && erections.length === 0) {
      setErrorNotice("No search results found to export.");
      return;
    }

    let csvContent = "Type,MDR No / Erection,Element Code,Element Type,Weight (Ton),Quantity,Total Weight (Ton),Status,Zone,Villa Type,Building,House,Flat,Employee Name,Equipment,Date\n";

    deliveries.forEach((d) => {
      const row = [
        "RECEIVED",
        `"${d.mdrNo || "N/A"}"`,
        `"${d.elementCode || ""}"`,
        `"${d.elementType || ""}"`,
        d.weight || 0,
        d.quantity || 1,
        d.totalWeight || 0,
        `"${d.status || ""}"`,
        `"${d.zone || ""}"`,
        `"${d.villaType || ""}"`,
        `"${d.buildingNo || ""}"`,
        `"${d.houseNo || ""}"`,
        `"${d.flatNo || ""}"`,
        `"${d.unloadingDetails?.unloaderName || ""}"`,
        `"${d.unloadingDetails?.equipmentType || ""}"`,
        `"${new Date(d.createdAt).toLocaleDateString()}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    erections.forEach((e) => {
      const row = [
        "ERECTED",
        `"Erection Progress"`,
        `"${e.elementCode || ""}"`,
        `"${e.elementType || ""}"`,
        e.weight || 0,
        e.quantity || 1,
        e.totalWeight || 0,
        `"${e.status || ""}"`,
        `"${e.zone || ""}"`,
        `"${e.villaType || ""}"`,
        `"${e.buildingNo || ""}"`,
        `"${e.houseNo || ""}"`,
        `"${e.flatNo || ""}"`,
        `"${e.erectionDetails?.erectorName || ""}"`,
        `"${e.erectionDetails?.equipmentType || ""}"`,
        `"${new Date(e.createdAt).toLocaleDateString()}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ARA_Search_Report_${searchEmpId || "All"}_Site_${searchSiteNo || "All"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF download for advanced search results
  const handleDownloadSearchPDF = () => {
    if (!searchResults) return;
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const primaryColor = [30, 41, 59]; // Slate 800
      const blueColor = [37, 99, 235]; // Blue 600
      const purpleColor = [126, 34, 206]; // Purple 700
      const textDark = [15, 23, 42]; // Slate 900

      // Header band
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 0, 210, 32, "F");

      // Left border accent
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 4, 32, "F");

      // Header details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("ARA SEARCH & PERFORMANCE REPORT", 12, 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("AL RASHID ABETONG Precast Concrete Buildings Contractor", 12, 18);
      doc.text(`Search Criteria: Emp: ${searchEmpId || "ALL"} | Site: ${searchSiteNo || "ALL"} | Date: ${searchDate || "ALL"} | Element: ${searchElementCode || "ALL"}`, 12, 23);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 130, 12);

      // Section 1: Summary Stats
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("QUERY METRICS SUMMARY", 12, 38);

      // Draw two boxes
      doc.setFillColor(248, 250, 252);
      doc.rect(12, 42, 90, 20, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, 42, 90, 20, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL DELIVERIES RECEIVED", 16, 47);
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text(`${searchResults.totalDelQty} PCS (${searchResults.totalDelWeight.toFixed(2)} Tons)`, 16, 54);

      doc.setFillColor(248, 250, 252);
      doc.rect(108, 42, 90, 20, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(108, 42, 90, 20, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL ASSEMBLY ERECTED", 112, 47);
      doc.setFontSize(11);
      doc.setTextColor(126, 34, 206);
      doc.text(`${searchResults.totalEreQty} PCS (${searchResults.totalEreWeight.toFixed(2)} Tons)`, 112, 54);

      // Section 2: Deliveries Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("1. MATCHED DELIVERIES RECEIVED", 12, 70);

      const delData = searchResults.deliveries.map(d => [
        d.createdAt ? d.createdAt.split("T")[0] : "N/A",
        d.mdrNo || "N/A",
        d.elementCode || "",
        d.elementType || "",
        d.quantity || 1,
        (d.totalWeight || 0).toFixed(2),
        d.unloadingDetails?.unloaderName || ""
      ]);

      autoTable(doc, {
        startY: 73,
        head: [["Date", "MDR No", "Element Code", "Type", "Qty", "Weight (T)", "Receiver/Unloader"]],
        body: delData.length > 0 ? delData : [["-", "-", "No deliveries match criteria", "-", "-", "-", "-"]],
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59] }
      });

      // Section 3: Erections Table
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("2. MATCHED ASSEMBLY ERECTIONS", 12, finalY);

      const ereData = searchResults.erections.map(e => [
        e.createdAt ? e.createdAt.split("T")[0] : "N/A",
        e.elementCode || "",
        e.elementType || "",
        e.quantity || 1,
        (e.totalWeight || 0).toFixed(2),
        e.erectionDetails?.erectorName || ""
      ]);

      autoTable(doc, {
        startY: finalY + 3,
        head: [["Date", "Element Code", "Type", "Qty", "Weight (T)", "Erector/Supervisor"]],
        body: ereData.length > 0 ? ereData : [["-", "No erections match criteria", "-", "-", "-", "-"]],
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [126, 34, 206] }
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount} - ARA Search Results Report`, 12, 287);
        doc.text("CONFIDENTIAL - AL RASHID ABETONG PRECAST OPERATIONS", 110, 287);
      }

      doc.save(`ARA_Search_Report_${searchEmpId || "All"}_Site_${searchSiteNo || "All"}.pdf`);
    } catch (err) {
      console.error("PDF generation for search results failed:", err);
      setErrorNotice("Search PDF download failed. Please try again.");
    }
  };

  // Modern Document PDF Print
  const handlePrintPDF = (
    source: "standard" | "foreman" | "search" = "standard", 
    foremanName: string | null = null,
    foremanSiteNo: string | null = null
  ) => {
    setPrintSource(source);
    setPrintForemanName(foremanName);
    setPrintForemanSiteNo(foremanSiteNo);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Modern PDF Download Generator using jsPDF and jspdf-autotable
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const primaryColor = [30, 41, 59]; // Slate 800
      const blueColor = [37, 99, 235]; // Blue 600
      const purpleColor = [126, 34, 206]; // Purple 700
      const textDark = [15, 23, 42]; // Slate 900
      
      // Header band
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.rect(0, 0, 210, 32, "F");
      
      // Left border accent
      doc.setFillColor(37, 99, 235); // Blue 600
      doc.rect(0, 0, 4, 32, "F");
      
      // Header details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("ARA PRECAST CONSTRUCTION SYSTEM", 12, 13);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Precast Construction Receiving & Erection Field Office System", 12, 19);
      doc.text(`Project Site No. ${selectedSite?.siteNo || "N/A"} (${selectedSite?.name || "N/A"})`, 12, 24);
      
      // Right header info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.text(selectedEmployeeName !== "all" ? "EMPLOYEE PROGRESS REPORT" : "FIELD AUDIT SUMMARY REPORT", 130, 13, { align: "left" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 130, 19);
      doc.text(`Period: ${filterPeriod.toUpperCase()}`, 130, 24);
      
      if (selectedEmployeeName !== "all") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(purpleColor[0], purpleColor[1], purpleColor[2]);
        doc.text(`Employee: ${selectedEmployeeName.toUpperCase()}`, 130, 29);
      }
      
      // Key Performance Metrics section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("KEY FIGURES & STOCK SUMMARY", 12, 42);
      
      // Draws 3 boxes for statistics
      const drawStatBox = (x: number, title: string, value: string, sub: string, titleColor: number[]) => {
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(x, 46, 58, 24, "F");
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.setLineWidth(0.2);
        doc.rect(x, 46, 58, 24, "S");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(title, x + 4, 51);
        
        doc.setFontSize(10.5);
        doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
        doc.text(value, x + 4, 58);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(sub, x + 4, 65);
      };
      
      drawStatBox(12, "TOTAL DELIVERIES RECEIVED", `${repDelQty} PCS / ${repDelWeight.toFixed(2)} T`, "* Includes damage/rejected logs", [16, 185, 129]);
      drawStatBox(76, "TOTAL ASSEMBLY ERECTED", `${repEreQty} PCS / ${repEreWeight.toFixed(2)} T`, "* Registered final installations", [147, 51, 234]);
      
      const awaitingQty = Math.max(0, repGoodDelQty - repEreQty);
      const awaitingWeight = Math.max(0, repGoodDelWeight - repEreWeight);
      drawStatBox(140, "AWAITING ERECTION (GOOD)", `${awaitingQty} PCS / ${awaitingWeight.toFixed(2)} T`, "* Excludes damage/rejections", [217, 119, 6]);
      
      // Deliveries table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`1. PRECAST DELIVERIES RECEIVED LOGS (${employeeFilteredData.deliveries.length} ITEMS)`, 12, 80);
      
      const deliveriesRows = employeeFilteredData.deliveries.map(d => [
        d.mdrNo || "",
        d.trailerNo || "",
        d.elementCode || "",
        d.elementType || "",
        Number(d.weight).toFixed(2),
        d.quantity || 1,
        (d.status || "").toUpperCase(),
        d.unloadingDetails?.equipmentPlateNo || d.unloadingDetails?.equipmentType || "",
        new Date(d.createdAt).toLocaleDateString()
      ]);
      
      autoTable(doc, {
        startY: 84,
        head: [["MDR Slip", "Trailer No", "Element Code", "Type", "Weight (T)", "Qty", "Status", "Crane/Equip", "Date"]],
        body: deliveriesRows,
        styles: { fontSize: 7, cellPadding: 1.5, font: "helvetica" },
        headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 12, right: 12 }
      });
      
      const nextY = (doc as any).lastAutoTable.finalY + 10;
      
      // Erections table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`2. PRECAST ASSEMBLY & ERECTION LOGS (${employeeFilteredData.erections.length} ITEMS)`, 12, nextY);
      
      const erectionsRows = employeeFilteredData.erections.map(e => [
        e.elementCode || "",
        e.elementType || "",
        Number(e.weight).toFixed(2),
        e.quantity || 1,
        Number(e.totalWeight).toFixed(2),
        (e.status || "").toUpperCase(),
        `${e.zone || ""}-${e.buildingNo || ""}`,
        e.erectionDetails?.equipmentPlateNo || e.erectionDetails?.equipmentType || "",
        new Date(e.createdAt).toLocaleDateString()
      ]);
      
      autoTable(doc, {
        startY: nextY + 4,
        head: [["Element Code", "Type", "Weight (T)", "Qty", "Total (T)", "Status", "Zone/Bldg", "Equip/Plate", "Date"]],
        body: erectionsRows,
        styles: { fontSize: 7, cellPadding: 1.5, font: "helvetica" },
        headStyles: { fillColor: [126, 34, 206], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 12, right: 12 }
      });
      
      // Footer text on the last page
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pageCount} - ARA Precast Field Audit System`, 12, 287);
        doc.text("CONFIDENTIAL - FOR INTERNAL PRECAST CONSTRUCTION RECORD KEEPING ONLY", 110, 287);
      }
      
      // Save PDF Document
      const siteNo = selectedSite?.siteNo || "All";
      doc.save(`ARA_Precast_Report_Site_${siteNo}_${filterPeriod}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setErrorNotice("Direct PDF download failed. Please try the Print Letterhead PDF option.");
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-800/60 pb-4">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <ListFilter className="h-4.5 w-4.5 text-blue-400" />
          Precast Performance, Reports & Searches
        </h3>

        {/* Dynamic Tab Switchers */}
        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === "standard"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Site Summary
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("foreman");
            }}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === "foreman"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Foreman summary
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("search");
            }}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === "search"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Advanced search
          </button>
        </div>
      </div>

      {activeTab === "standard" && (
        <div className="space-y-4">
          {/* Control Box: Filter Period, Element Type & Employee */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="md:col-span-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDownloadCSV("deliveries")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-2.5 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
                title="Download deliveries received as CSV file"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Receivers CSV
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCSV("erections")}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-2.5 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
                title="Download erections log as CSV file"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Erections CSV
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-2.5 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
                title="Download complete high-fidelity PDF report"
              >
                <FileText className="h-3.5 w-3.5" />
                Download PDF Report
              </button>

              <button
                type="button"
                onClick={() => handlePrintPDF("standard")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-2.5 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md text-center"
                title="Open browser print interface"
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
                Received: <strong className="text-blue-400">{repDelQty} pcs</strong> ({repDelWeight.toFixed(2)} T)
              </div>
              <div>
                Erected: <strong className="text-purple-400">{repEreQty} pcs</strong> ({repEreWeight.toFixed(2)} T)
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "foreman" && (
        <div className="space-y-4 text-slate-200">
          <div className="flex justify-between items-center flex-wrap gap-4 bg-slate-950/40 p-4 border border-slate-800 rounded-2xl">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Foreman & Supervisor summary directory
              </h4>
              <p className="text-xs text-slate-400">
                Track precast progress metrics completed by each active supervisor across all construction sites.
              </p>
            </div>
          </div>

          {loadingSearchData ? (
            <div className="text-center py-12 text-slate-400 font-bold flex flex-col items-center gap-2">
              <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Loading supervisor metrics from Firestore database...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Foremen Grid List */}
              <div className="lg:col-span-6 space-y-3">
                <div className="text-xs font-black uppercase text-blue-400 tracking-wider">
                  Select Supervisor to Check Record & Print
                </div>
                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {foremanSummaries.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 italic bg-slate-950/20 border border-slate-850 rounded-xl">
                      No foreman activity records found in the database.
                    </div>
                  ) : (
                    foremanSummaries.map((f, idx) => {
                      const selectionKey = `${f.name}_${f.siteNo}`;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedForemanDetail(selectionKey)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                            selectedForemanDetail === selectionKey
                              ? "bg-blue-500/15 border-blue-500 shadow-md"
                              : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-xs text-white">{f.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">ID: {f.id}</div>
                            </div>
                            <span className="text-[9px] font-bold text-amber-400 bg-slate-850 px-2 py-0.5 rounded uppercase">
                              Site: {f.siteNo}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/50 p-2 rounded-lg font-mono">
                            <div>
                              <span className="text-slate-500">Received:</span>{" "}
                              <strong className="text-blue-400">{f.totalDelQty} pcs</strong> ({f.totalDelWeight.toFixed(2)} T)
                            </div>
                            <div>
                              <span className="text-slate-500">Erected:</span>{" "}
                              <strong className="text-purple-400">{f.totalEreQty} pcs</strong> ({f.totalEreWeight.toFixed(2)} T)
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Foreman Detailed Panel */}
              <div className="lg:col-span-6 bg-slate-950/20 border border-slate-850 rounded-2xl p-4.5 space-y-4">
                {selectedForemanDetail ? (
                  (() => {
                    const foremanKey = selectedForemanDetail;
                    const foreman = foremanSummaries.find(f => `${f.name}_${f.siteNo}` === foremanKey);
                    if (!foreman) return null;
                    
                    const delList = allDeliveries.filter(d => 
                      d.unloadingDetails?.unloaderName?.trim().toUpperCase() === foreman.name.toUpperCase() &&
                      (d.siteId ? siteMap.get(d.siteId) : "N/A") === foreman.siteNo
                    );
                    const ereList = allErections.filter(e => 
                      e.erectionDetails?.erectorName?.trim().toUpperCase() === foreman.name.toUpperCase() &&
                      (e.siteId ? siteMap.get(e.siteId) : "N/A") === foreman.siteNo
                    );

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4 flex-wrap border-b border-slate-800 pb-3">
                          <div>
                            <h5 className="text-sm font-black text-blue-400 uppercase tracking-tight">{foreman.name}</h5>
                            <p className="text-[10px] text-slate-500 font-mono">Site No: {foreman.siteNo} | ID: {foreman.id}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePrintPDF("foreman", foreman.name, foreman.siteNo)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 shadow"
                          >
                            <Printer className="h-3 w-3" />
                            Print Foreman Record
                          </button>
                        </div>

                        {/* Stats card with compact font size 8/10 for density */}
                        <div className="grid grid-cols-2 gap-3 text-[10px] leading-[13px]">
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
                            <span className="block text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Total Deliveries</span>
                            <span className="text-xs font-bold text-blue-400">{foreman.totalDelQty} pcs</span>
                            <span className="block text-[9px] text-slate-400">({foreman.totalDelWeight.toFixed(2)} Tons)</span>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-center">
                            <span className="block text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Total Erections</span>
                            <span className="text-xs font-bold text-purple-400">{foreman.totalEreQty} pcs</span>
                            <span className="block text-[9px] text-slate-400">({foreman.totalEreWeight.toFixed(2)} Tons)</span>
                          </div>
                        </div>

                        {/* Mini Logs */}
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] font-extrabold uppercase text-blue-400 mb-1.5 tracking-wider">
                              Recent Deliveries Handled ({delList.length})
                            </div>
                            <div className="max-h-[120px] overflow-y-auto space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-850 scrollbar-thin">
                              {delList.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic">No unloading records found.</p>
                              ) : (
                                delList.slice(0, 8).map((d, i) => (
                                  <div key={i} className="text-[9px] flex justify-between border-b border-slate-900 pb-1 font-mono">
                                    <span className="text-slate-300 font-bold">{d.elementCode}</span>
                                    <span className="text-slate-400">{d.totalWeight.toFixed(2)} T</span>
                                    <span className="text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-extrabold uppercase text-purple-400 mb-1.5 tracking-wider">
                              Recent Erections Handled ({ereList.length})
                            </div>
                            <div className="max-h-[120px] overflow-y-auto space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-850 scrollbar-thin">
                              {ereList.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic">No erection records found.</p>
                              ) : (
                                ereList.slice(0, 8).map((e, i) => (
                                  <div key={i} className="text-[9px] flex justify-between border-b border-slate-900 pb-1 font-mono">
                                    <span className="text-slate-300 font-bold">{e.elementCode}</span>
                                    <span className="text-slate-400">{e.totalWeight.toFixed(2)} T</span>
                                    <span className="text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 py-16 text-slate-500 italic text-xs">
                    <UserCheck className="h-8 w-8 text-slate-600 mb-2" />
                    Select a foreman from the left directory list to view, review details, and trigger high-fidelity prints.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-4 text-slate-200">
          <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl">
            <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">
              Employee Progress Advanced Search Center
            </h4>
            <p className="text-xs text-slate-400">
              Input specific employee IDs/names, site numbers, and dates to compute total progress reports and trigger prints.
            </p>
          </div>

          {/* Form Fields row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-slate-950/50 border border-slate-850 rounded-2xl p-4 items-end animate-fade-in">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                1. Employee No. or Name
              </label>
              <select
                value={searchEmpId}
                onChange={(e) => {
                  setSearchEmpId(e.target.value);
                  setSearchTriggered(true);
                }}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 [&_option]:bg-slate-950 cursor-pointer"
              >
                <option value="">ALL EMPLOYEES ({searchEmployees.length})</option>
                {searchEmployees.map((emp, i) => (
                  <option key={i} value={emp.name}>
                    {emp.name} {emp.id ? `(ID: ${emp.id})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                2. Site No. / Name
              </label>
              <select
                value={searchSiteNo}
                onChange={(e) => {
                  setSearchSiteNo(e.target.value);
                  setSearchTriggered(true);
                }}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 [&_option]:bg-slate-950 cursor-pointer"
              >
                <option value="">ALL SITES ({allSites.length})</option>
                {allSites.map((s, i) => (
                  <option key={i} value={s.siteNo}>
                    Site No. {s.siteNo} {s.name ? `- ${s.name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                3. Element Code / Type
              </label>
              <select
                value={searchElementCode}
                onChange={(e) => {
                  setSearchElementCode(e.target.value);
                  setSearchTriggered(true);
                }}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 [&_option]:bg-slate-950 cursor-pointer"
              >
                <option value="">ALL ELEMENTS ({searchElements.length})</option>
                {searchElements.map((el, i) => (
                  <option key={i} value={el}>
                    {el}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                4. Select Specific Date
              </label>
              <select
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  setSearchTriggered(true);
                }}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 [&_option]:bg-slate-950 cursor-pointer"
              >
                <option value="">ALL DATES ({searchDates.length})</option>
                {searchDates.map((dateStr, i) => (
                  <option key={i} value={dateStr}>
                    {dateStr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTriggered(true);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-4 rounded-xl text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                Search Record
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchEmpId("");
                  setSearchSiteNo("");
                  setSearchDate("");
                  setSearchElementCode("");
                  setSearchTriggered(false);
                }}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2 px-3 rounded-xl text-xs uppercase tracking-wide cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {loadingSearchData ? (
            <div className="text-center py-12 text-slate-400 font-bold flex flex-col items-center gap-2">
              <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Searching Firestore database records...</span>
            </div>
          ) : searchTriggered && searchResults ? (
            <div className="space-y-4 animate-fade-in">
              {/* Header metrics card */}
              <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-2xl flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h5 className="text-xs font-black text-blue-400 uppercase tracking-widest">
                    TOTAL PROGRESS REPORT FOR FILTERED QUERY
                  </h5>
                  <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                    <div>Employee: <strong className="text-white">{searchEmpId || "ALL"}</strong></div>
                    <div>Site No.: <strong className="text-white">{searchSiteNo || "ALL"}</strong></div>
                    {searchElementCode && <div>Element Filter: <strong className="text-white">{searchElementCode}</strong></div>}
                    <div>Date: <strong className="text-white">{searchDate || "ALL"}</strong></div>
                  </div>
                </div>

                <div className="flex gap-4 items-center flex-wrap">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Total received</div>
                    <div className="text-sm font-bold text-blue-400">{searchResults.totalDelQty} pcs <span className="text-xs text-slate-400">({searchResults.totalDelWeight.toFixed(2)} T)</span></div>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800 hidden sm:block" />
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase font-mono">Total erected</div>
                    <div className="text-sm font-bold text-purple-400">{searchResults.totalEreQty} pcs <span className="text-xs text-slate-400">({searchResults.totalEreWeight.toFixed(2)} T)</span></div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDownloadSearchCSV}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      Download CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSearchPDF}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow cursor-pointer"
                    >
                      <FileText className="h-3 w-3" />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintPDF("search")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Printer className="h-3 w-3" />
                      Print
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Deliveries matching search */}
                <div className="border border-slate-850 p-4 rounded-2xl bg-slate-950/10">
                  <h6 className="text-[11px] font-black text-blue-400 uppercase tracking-wider mb-2">
                    Matched precast deliveries received ({searchResults.deliveries.length})
                  </h6>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-[10px] font-mono">
                    {searchResults.deliveries.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-6">No matching unloading deliveries found.</p>
                    ) : (
                      searchResults.deliveries.map((d, i) => (
                        <div key={i} className="bg-slate-950/40 p-2 border border-slate-850/60 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white text-[11px]">{d.elementCode} ({d.elementType})</div>
                            <div className="text-slate-500 text-[9px]">MDR: {d.mdrNo} | Receiver: {d.unloadingDetails?.unloaderName}</div>
                          </div>
                          <div className="text-right font-bold text-blue-400">
                            {d.totalWeight.toFixed(2)} T
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Erections matching search */}
                <div className="border border-slate-850 p-4 rounded-2xl bg-slate-950/10">
                  <h6 className="text-[11px] font-black text-purple-400 uppercase tracking-wider mb-2">
                    Matched precast erections ({searchResults.erections.length})
                  </h6>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-[10px] font-mono">
                    {searchResults.erections.length === 0 ? (
                      <p className="text-slate-500 italic text-center py-6">No matching erection records found.</p>
                    ) : (
                      searchResults.erections.map((e, i) => (
                        <div key={i} className="bg-slate-950/40 p-2 border border-slate-850/60 rounded-lg flex justify-between items-center">
                          <div>
                            <div className="font-bold text-white text-[11px]">{e.elementCode} ({e.elementType})</div>
                            <div className="text-slate-500 text-[9px]">Erector: {e.erectionDetails?.erectorName}</div>
                          </div>
                          <div className="text-right font-bold text-purple-400">
                            {e.totalWeight.toFixed(2)} T
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-xs border border-dashed border-slate-800 rounded-2xl">
              Fill in Employee ID/Name, Site No., or Date above, and click "Search Record" to populate and print the total progress report.
            </div>
          )}
        </div>
      )}

      {/* Hidden layout specifically customized for PRINTING */}
      <div className="hidden printing-template absolute top-0 left-0 w-full bg-white text-black p-8 font-sans">
        {printSource === "standard" && (
          <>
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
          </>
        )}

        {printSource === "foreman" && printForemanName && (
          (() => {
            const foremanKey = `${printForemanName}_${printForemanSiteNo}`;
            const foreman = foremanSummaries.find(f => `${f.name}_${f.siteNo}` === foremanKey);
            const delList = allDeliveries.filter(d => 
              d.unloadingDetails?.unloaderName?.trim().toUpperCase() === printForemanName.toUpperCase() &&
              (d.siteId ? siteMap.get(d.siteId) : "N/A") === printForemanSiteNo
            );
            const ereList = allErections.filter(e => 
              e.erectionDetails?.erectorName?.trim().toUpperCase() === printForemanName.toUpperCase() &&
              (e.siteId ? siteMap.get(e.siteId) : "N/A") === printForemanSiteNo
            );
            
            return (
              <>
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
                        Supervisor performance summary
                      </div>
                      <div className="font-black text-xs text-blue-800 mt-0.5 uppercase">
                        FOREMAN: {printForemanName}
                      </div>
                      <div className="font-black text-xs text-indigo-900 mt-0.5 uppercase">
                        SITE NO: {printForemanSiteNo || "N/A"}
                      </div>
                      <div className="mt-1">Date Generated: {new Date().toLocaleDateString()}</div>
                      <div>Scope: Site {printForemanSiteNo || "N/A"}</div>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-center">
                  <div className="border border-gray-200 rounded p-2.5">
                    <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Total Precast Unloaded/Received</span>
                    <span className="text-base font-black text-blue-900">{foreman ? foreman.totalDelWeight.toFixed(2) : "0.00"} Tons</span>
                    <span className="block text-[9px] text-gray-400">({foreman ? foreman.totalDelQty : 0} elements)</span>
                  </div>

                  <div className="border border-gray-200 rounded p-2.5">
                    <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Total Precast Installed/Erected</span>
                    <span className="text-base font-black text-purple-900">{foreman ? foreman.totalEreWeight.toFixed(2) : "0.00"} Tons</span>
                    <span className="block text-[9px] text-gray-400">({foreman ? foreman.totalEreQty : 0} elements)</span>
                  </div>
                </div>

                {/* Logs lists with requested 8/10 font-size */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-blue-900 border-b border-blue-900 pb-1 mb-2 uppercase tracking-wide">
                    1. Deliveries Received & Managed By {printForemanName} | Site: {printForemanSiteNo} ({delList.length} items)
                  </h4>
                  <table className="w-full text-left text-[8px] leading-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                        <th className="p-1 px-2">MDR SLIP</th>
                        <th className="p-1 px-2">ELEMENT CODE</th>
                        <th className="p-1 px-2">TYPE</th>
                        <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                        <th className="p-1 px-2">STATUS</th>
                        <th className="p-1 px-2">COORDINATES</th>
                        <th className="p-1 px-2">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {delList.length > 0 ? (
                        delList.map((d) => (
                          <tr key={d.id}>
                            <td className="p-1 px-2 font-bold">{d.mdrNo}</td>
                            <td className="p-1 px-2 font-mono text-blue-800">{d.elementCode}</td>
                            <td className="p-1 px-2">{d.elementType}</td>
                            <td className="p-1 px-2 text-right">{d.totalWeight.toFixed(3)}</td>
                            <td className="p-1 px-2 font-bold">{d.status.toUpperCase()}</td>
                            <td className="p-1 px-2 text-gray-500">
                              {d.zone || "-"} / {d.villaType || "-"} / B:{d.buildingNo || "-"}
                            </td>
                            <td className="p-1 px-2 font-mono text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-2 text-center text-gray-400 italic">No unloading records found for this supervisor at this site.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-purple-900 border-b border-purple-900 pb-1 mb-2 uppercase tracking-wide">
                    2. Precast Erections Handled By {printForemanName} | Site: {printForemanSiteNo} ({ereList.length} items)
                  </h4>
                  <table className="w-full text-left text-[8px] leading-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                        <th className="p-1 px-2">ELEMENT CODE</th>
                        <th className="p-1 px-2">TYPE</th>
                        <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                        <th className="p-1 px-2">STATUS</th>
                        <th className="p-1 px-2">COORDINATES</th>
                        <th className="p-1 px-2">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {ereList.length > 0 ? (
                        ereList.map((e) => (
                          <tr key={e.id}>
                            <td className="p-1 px-2 font-mono text-purple-800 font-semibold">{e.elementCode}</td>
                            <td className="p-1 px-2">{e.elementType}</td>
                            <td className="p-1 px-2 text-right">{e.totalWeight.toFixed(3)}</td>
                            <td className="p-1 px-2 font-bold">{e.status.toUpperCase()}</td>
                            <td className="p-1 px-2 text-gray-500">
                              {e.zone || "-"} / {e.villaType || "-"} / H:{e.houseNo || "-"}
                            </td>
                            <td className="p-1 px-2 font-mono text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-2 text-center text-gray-400 italic">No erection records found for this supervisor at this site.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()
        )}

        {printSource === "search" && searchResults && (
          <>
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
                    Employee Search & Progress Report
                  </div>
                  <div className="font-black text-xs text-purple-900 mt-0.5">
                    CRITERIA: {searchEmpId ? `Employee: ${searchEmpId.toUpperCase()}` : "Any Employee"}
                    {searchSiteNo && ` | Site: ${searchSiteNo.toUpperCase()}`}
                    {searchDate && ` | Date: ${searchDate}`}
                  </div>
                  <div className="mt-1">Date Generated: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-xs text-center">
              <div className="border border-gray-200 rounded p-2.5">
                <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Total Precast Received</span>
                <span className="text-base font-black text-blue-900">{searchResults.totalDelWeight.toFixed(2)} Tons</span>
                <span className="block text-[9px] text-gray-400">({searchResults.totalDelQty} elements total)</span>
              </div>

              <div className="border border-gray-200 rounded p-2.5">
                <span className="block text-gray-500 uppercase font-bold text-[8px] tracking-wider mb-1">Total Precast Erected</span>
                <span className="text-base font-black text-purple-900">{searchResults.totalEreWeight.toFixed(2)} Tons</span>
                <span className="block text-[9px] text-gray-400">({searchResults.totalEreQty} elements total)</span>
              </div>
            </div>

            {/* Logs lists */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-blue-900 border-b border-blue-900 pb-1 mb-2 uppercase tracking-wide">
                1. Deliveries Received matching query criteria ({searchResults.deliveries.length} items)
              </h4>
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                    <th className="p-1 px-2">MDR SLIP</th>
                    <th className="p-1 px-2">ELEMENT CODE</th>
                    <th className="p-1 px-2">TYPE</th>
                    <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                    <th className="p-1 px-2">STATUS</th>
                    <th className="p-1 px-2">RECEIVER</th>
                    <th className="p-1 px-2">COORDINATES</th>
                    <th className="p-1 px-2">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {searchResults.deliveries.length > 0 ? (
                    searchResults.deliveries.map((d) => (
                      <tr key={d.id}>
                        <td className="p-1 px-2 font-bold">{d.mdrNo}</td>
                        <td className="p-1 px-2 font-mono text-blue-800">{d.elementCode}</td>
                        <td className="p-1 px-2">{d.elementType}</td>
                        <td className="p-1 px-2 text-right">{d.totalWeight.toFixed(3)}</td>
                        <td className="p-1 px-2 font-bold">{d.status.toUpperCase()}</td>
                        <td className="p-1 px-2">{d.unloadingDetails?.unloaderName || "-"}</td>
                        <td className="p-1 px-2 text-gray-500">
                          {d.zone || "-"} / {d.villaType || "-"} / B:{d.buildingNo || "-"}
                        </td>
                        <td className="p-1 px-2 font-mono text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-2 text-center text-gray-400 italic">No unloading records matching query found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold text-purple-900 border-b border-purple-900 pb-1 mb-2 uppercase tracking-wide">
                2. Erections matching query criteria ({searchResults.erections.length} items)
              </h4>
              <table className="w-full text-left text-[9px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200">
                    <th className="p-1 px-2">ELEMENT CODE</th>
                    <th className="p-1 px-2">TYPE</th>
                    <th className="p-1 px-2 text-right">WEIGHT (T)</th>
                    <th className="p-1 px-2">STATUS</th>
                    <th className="p-1 px-2">ERECTOR</th>
                    <th className="p-1 px-2">COORDINATES</th>
                    <th className="p-1 px-2">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {searchResults.erections.length > 0 ? (
                    searchResults.erections.map((e) => (
                      <tr key={e.id}>
                        <td className="p-1 px-2 font-mono text-purple-800 font-semibold">{e.elementCode}</td>
                        <td className="p-1 px-2">{e.elementType}</td>
                        <td className="p-1 px-2 text-right">{e.totalWeight.toFixed(3)}</td>
                        <td className="p-1 px-2 font-bold">{e.status.toUpperCase()}</td>
                        <td className="p-1 px-2">{e.erectionDetails?.erectorName || "-"}</td>
                        <td className="p-1 px-2 text-gray-500">
                          {e.zone || "-"} / {e.villaType || "-"} / H:{e.houseNo || "-"}
                        </td>
                        <td className="p-1 px-2 font-mono text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-2 text-center text-gray-400 italic">No erection records matching query found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer Verification Stamp */}
        <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between text-[10px] text-gray-400">
          <div>AL RASHID ABETONG • Head Office: Riyadh, KSA • Precast Field Quality Operations</div>
          <div className="text-right">Receiver & Erector Digital Stamp Security Verified</div>
        </div>
      </div>
    </div>
  );
}
