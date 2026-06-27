import React, { useState, useEffect, useMemo, useRef } from "react";
import { Site, Delivery, Erection } from "../types";
import { 
  BarChart3, 
  Search, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Truck, 
  TrendingUp, 
  Layers, 
  Clock, 
  Filter,
  Activity,
  ArrowUpRight,
  Sparkles,
  Info
} from "lucide-react";


interface PerformanceChartsProps {
  sites: Site[];
  currentSite: Site | null;
  deliveries: Delivery[];
  erections: Erection[];
  onSelectSite?: (site: Site) => void;
}

const PRODUCT_COLORS: Record<string, { bg: string; fill: string; text: string; name: string }> = {
  "SOLID SLAB": { bg: "bg-blue-600/20", fill: "#2563eb", text: "text-blue-300", name: "Solid Slab" },
  "HC SLAB": { bg: "bg-cyan-500/20", fill: "#06b6d4", text: "text-cyan-400", name: "Hollowcore Slab" },
  "HOLLOWCORE SLAB": { bg: "bg-cyan-600/20", fill: "#0891b2", text: "text-cyan-300", name: "Hollowcore Slab" },
  SLAB: { bg: "bg-indigo-500/20", fill: "#6366f1", text: "text-indigo-400", name: "Slab" },
  WALL: { bg: "bg-emerald-500/20", fill: "#10b981", text: "text-emerald-400", name: "Wall Panel" },
  "WALL PANEL": { bg: "bg-emerald-600/20", fill: "#059669", text: "text-emerald-300", name: "Wall Panel" },
  BEAM: { bg: "bg-purple-500/20", fill: "#8b5cf6", text: "text-purple-400", name: "Beam" },
  LINTEL: { bg: "bg-orange-500/20", fill: "#f97316", text: "text-orange-400", name: "Lintel" },
  COLUMN: { bg: "bg-sky-500/20", fill: "#0ea5e9", text: "text-sky-400", name: "Column" },
  STAIRCASE: { bg: "bg-amber-500/20", fill: "#f59e0b", text: "text-amber-400", name: "Staircase" },
  STAIR: { bg: "bg-amber-600/20", fill: "#d97706", text: "text-amber-300", name: "Staircase" },
};

const getProductStyle = (productType: string) => {
  const clean = productType.trim().toUpperCase();
  for (const key in PRODUCT_COLORS) {
    if (clean.includes(key)) {
      return PRODUCT_COLORS[key];
    }
  }
  const colors = [
    { bg: "bg-rose-500/20", fill: "#f43f5e", text: "text-rose-400" },
    { bg: "bg-pink-500/20", fill: "#ec4899", text: "text-pink-400" },
    { bg: "bg-teal-500/20", fill: "#14b8a6", text: "text-teal-400" },
    { bg: "bg-sky-500/20", fill: "#0ea5e9", text: "text-sky-400" },
    { bg: "bg-violet-500/20", fill: "#8b5cf6", text: "text-violet-400" },
    { bg: "bg-yellow-500/20", fill: "#eab308", text: "text-yellow-400" },
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return { ...colors[index], name: productType };
};

export default function PerformanceCharts({ 
  sites, 
  currentSite, 
  deliveries = [], 
  erections = [],
  onSelectSite 
}: PerformanceChartsProps) {
  const [searchSiteNo, setSearchSiteNo] = useState("");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [metricType, setMetricType] = useState<"pcs" | "tons">("pcs");
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set default selected site on mount or when currentSite changes
  useEffect(() => {
    if (currentSite) {
      setSelectedSite(currentSite);
      setSearchSiteNo(currentSite.siteNo);
    } else if (sites.length > 0) {
      setSelectedSite(sites[0]);
      setSearchSiteNo(sites[0].siteNo);
    }
  }, [currentSite, sites]);

  // Handle site input change and filter matching sites
  const matchedSites = useMemo(() => {
    if (!searchSiteNo.trim()) return sites;
    return sites.filter(s => 
      s.siteNo.toLowerCase().includes(searchSiteNo.toLowerCase()) ||
      s.name.toLowerCase().includes(searchSiteNo.toLowerCase())
    );
  }, [searchSiteNo, sites]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSiteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selecting site from filtered list
  const selectSite = (site: Site) => {
    setSelectedSite(site);
    setSearchSiteNo(site.siteNo);
    setShowSiteDropdown(false);
    onSelectSite?.(site);
  };

  // Helper: Get start of ISO Week (Monday)
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Calculations for Daily, Weekly, Monthly groupings
  const trendData = useMemo(() => {
    const rawDataMap: Record<string, { label: string; received: number; erected: number }> = {};

    if (timeRange === "daily") {
      // Create past 10 active calendar slots or days
      const days: string[] = [];
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        days.push(key);
        rawDataMap[key] = {
          label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          received: 0,
          erected: 0,
        };
      }

      deliveries.forEach((d) => {
        if (!d.createdAt) return;
        const key = d.createdAt.split("T")[0];
        if (rawDataMap[key]) {
          rawDataMap[key].received += metricType === "pcs" ? (d.quantity || 1) : (d.totalWeight || d.weight || 0);
        }
      });

      erections.forEach((e) => {
        if (!e.createdAt) return;
        const key = e.createdAt.split("T")[0];
        if (rawDataMap[key]) {
          rawDataMap[key].erected += metricType === "pcs" ? (e.quantity || 1) : (e.totalWeight || e.weight || 0);
        }
      });

      return Object.values(rawDataMap);
    } 
    
    if (timeRange === "weekly") {
      // Create past 6 weeks slots
      const weekKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        const startOfWeek = getStartOfWeek(d);
        const key = startOfWeek.toISOString().split("T")[0];
        weekKeys.push(key);
        
        rawDataMap[key] = {
          label: `${startOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          received: 0,
          erected: 0,
        };
      }

      deliveries.forEach((d) => {
        if (!d.createdAt) return;
        const dateObj = new Date(d.createdAt);
        const start = getStartOfWeek(dateObj).toISOString().split("T")[0];
        if (rawDataMap[start]) {
          rawDataMap[start].received += metricType === "pcs" ? (d.quantity || 1) : (d.totalWeight || d.weight || 0);
        }
      });

      erections.forEach((e) => {
        if (!e.createdAt) return;
        const dateObj = new Date(e.createdAt);
        const start = getStartOfWeek(dateObj).toISOString().split("T")[0];
        if (rawDataMap[start]) {
          rawDataMap[start].erected += metricType === "pcs" ? (e.quantity || 1) : (e.totalWeight || e.weight || 0);
        }
      });

      return Object.values(rawDataMap);
    }

    // Monthly
    const monthsKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsKeys.push(key);
      rawDataMap[key] = {
        label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        received: 0,
        erected: 0,
      };
    }

    deliveries.forEach((d) => {
      if (!d.createdAt) return;
      const key = d.createdAt.substring(0, 7); // "YYYY-MM"
      if (rawDataMap[key]) {
        rawDataMap[key].received += metricType === "pcs" ? (d.quantity || 1) : (d.totalWeight || d.weight || 0);
      }
    });

    erections.forEach((e) => {
      if (!e.createdAt) return;
      const key = e.createdAt.substring(0, 7); // "YYYY-MM"
      if (rawDataMap[key]) {
        rawDataMap[key].erected += metricType === "pcs" ? (e.quantity || 1) : (e.totalWeight || e.weight || 0);
      }
    });

    return Object.values(rawDataMap);
  }, [deliveries, erections, timeRange, metricType]);

  // Product Wise Calculations (colors matching elements as required)
  const productData = useMemo(() => {
    const prodMap: Record<string, { name: string; received: number; erected: number; fill: string; text: string }> = {};

    deliveries.forEach((d) => {
      const pType = d.elementType ? d.elementType.trim() : "Unknown";
      const key = pType.toUpperCase();
      const style = getProductStyle(pType);

      if (!prodMap[key]) {
        prodMap[key] = {
          name: style.name,
          received: 0,
          erected: 0,
          fill: style.fill,
          text: style.text,
        };
      }
      prodMap[key].received += metricType === "pcs" ? (d.quantity || 1) : (d.totalWeight || d.weight || 0);
    });

    erections.forEach((e) => {
      const pType = e.elementType ? e.elementType.trim() : "Unknown";
      const key = pType.toUpperCase();
      const style = getProductStyle(pType);

      if (!prodMap[key]) {
        prodMap[key] = {
          name: style.name,
          received: 0,
          erected: 0,
          fill: style.fill,
          text: style.text,
        };
      }
      prodMap[key].erected += metricType === "pcs" ? (e.quantity || 1) : (e.totalWeight || e.weight || 0);
    });

    return Object.values(prodMap).sort((a, b) => b.received - a.received);
  }, [deliveries, erections, metricType]);

  // Calculate highest bounds for scaling trend chart
  const trendMaxVal = useMemo(() => {
    const maxVal = Math.max(...trendData.map(d => Math.max(d.received, d.erected)), 1);
    const exponent = Math.floor(Math.log10(maxVal));
    const step = Math.pow(10, exponent) / 2 || 1;
    return Math.ceil(maxVal / step) * step;
  }, [trendData]);

  // Calculate highest bounds for scaling product chart
  const productMaxVal = useMemo(() => {
    const maxVal = Math.max(...productData.map(d => Math.max(d.received, d.erected)), 1);
    return Math.ceil(maxVal / 5) * 5 || 5;
  }, [productData]);

  // Hover states for tooltips
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [hoveredProductIndex, setHoveredProductIndex] = useState<number | null>(null);

  // Overall Statistics for visual cards
  const totalDelCount = useMemo(() => deliveries.reduce((s, d) => s + (d.quantity || 1), 0), [deliveries]);
  const totalEreCount = useMemo(() => erections.reduce((s, e) => s + (e.quantity || 1), 0), [erections]);
  const totalDelWeight = useMemo(() => deliveries.reduce((s, d) => s + (d.totalWeight || d.weight || 0), 0), [deliveries]);
  const totalEreWeight = useMemo(() => erections.reduce((s, e) => s + (e.totalWeight || e.weight || 0), 0), [erections]);

  const progressPercentage = useMemo(() => {
    if (totalDelCount === 0) return 0;
    return Math.min(100, Math.round((totalEreCount / totalDelCount) * 100));
  }, [totalDelCount, totalEreCount]);

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-7xl mx-auto my-6 non-printable space-y-6">
      
      {/* 1. Header Filter Bar & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              Site Performance Progress Chart
              <span className="text-[10px] bg-blue-500/10 text-blue-300 font-extrabold px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest leading-none">
                Live Data Analytics
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Visualize precast concrete deliveries vs erection curves with smart product color segregation
            </p>
          </div>
        </div>

        {/* Dynamic site input/select search filter */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-blue-500 transition-all w-full md:w-72">
            <Search className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={searchSiteNo}
              placeholder="Type Site No. (e.g. 1002)..."
              onClick={() => setShowSiteDropdown(true)}
              onChange={(e) => {
                setSearchSiteNo(e.target.value);
                setShowSiteDropdown(true);
              }}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full font-bold"
            />
            {searchSiteNo && (
              <button 
                type="button" 
                onClick={() => {
                  setSearchSiteNo("");
                  setShowSiteDropdown(true);
                }}
                className="text-slate-500 hover:text-white text-xs cursor-pointer px-1 font-mono"
              >
                ×
              </button>
            )}
            <div className="text-[9px] font-extrabold bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5 flex items-center gap-1 uppercase tracking-wider flex-shrink-0 select-none">
              <Filter className="h-2.5 w-2.5" /> Site Filter
            </div>
          </div>

          {/* Autocomplete suggestions list */}
          {showSiteDropdown && (
            <div className="absolute top-full right-0 mt-2 w-full md:w-80 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-fade-in max-h-60 overflow-y-auto">
              <div className="p-2 border-b border-slate-800 bg-slate-900/40 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Select Construction Site
              </div>
              {matchedSites.length > 0 ? (
                matchedSites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => selectSite(site)}
                    className={`w-full text-left p-3 text-xs flex items-center justify-between hover:bg-blue-600/10 hover:text-white transition-all border-b border-slate-900/60 ${
                      selectedSite?.id === site.id ? "bg-blue-600/15 text-blue-400 font-black" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <div>
                        <span className="font-mono font-bold block">Site No. {site.siteNo}</span>
                        <span className="text-[10px] text-slate-500 font-medium block truncate max-w-[160px]">{site.name}</span>
                      </div>
                    </div>
                    {selectedSite?.id === site.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-4 text-xs text-center text-slate-500">
                  No registered site found matching "{searchSiteNo}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Key figures cards specific to fetched site data */}
      {selectedSite && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/45 border border-slate-850 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Total Precast Delivered</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-blue-400">{totalDelCount}</span>
                <span className="text-[10px] font-bold text-slate-400">PCS</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">({totalDelWeight.toFixed(1)} Tons total weight)</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-950/45 border border-slate-850 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Total Precast Erected</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-purple-400">{totalEreCount}</span>
                <span className="text-[10px] font-bold text-slate-400">PCS</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">({totalEreWeight.toFixed(1)} Tons total weight)</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-950/45 border border-slate-850 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Erection Completion</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-emerald-400">{progressPercentage}%</span>
                <span className="text-[10px] font-bold text-slate-400">Rate</span>
              </div>
              <div className="w-24 bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-slate-950/45 border border-slate-850 p-4 rounded-2xl flex items-center justify-between relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Stock Inventory Balance</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-amber-500">{Math.max(0, totalDelCount - totalEreCount)}</span>
                <span className="text-[10px] font-bold text-slate-400">PCS</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">({Math.max(0, totalDelWeight - totalEreWeight).toFixed(1)} Tons in yard)</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-500">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Chart Controls & Visualizations Grid */}
      {selectedSite ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMN LEFT: Time Trend received vs erected (Daily/Weekly/Monthly) */}
          <div className="lg:col-span-7 bg-slate-950/30 border border-slate-850 rounded-2xl p-4.5 space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Delivery & Erection Activity Trend
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Comparison timeline of precast elements</p>
              </div>

              {/* Sub controls: metric type (PCS vs Tons) and Interval Toggle */}
              <div className="flex items-center gap-2">
                {/* Metric Toggle */}
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMetricType("pcs")}
                    className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                      metricType === "pcs" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    PCS
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricType("tons")}
                    className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                      metricType === "tons" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    TONS
                  </button>
                </div>

                {/* Range Toggle */}
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTimeRange("daily")}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                      timeRange === "daily" ? "bg-slate-800 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange("weekly")}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                      timeRange === "weekly" ? "bg-slate-800 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeRange("monthly")}
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                      timeRange === "monthly" ? "bg-slate-800 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>

            {/* Trend Chart Drawing in SVG */}
            <div className="relative">
              {trendData.length > 0 ? (
                <div className="w-full">
                  <svg viewBox="0 0 540 280" className="w-full h-auto overflow-visible select-none">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const y = 20 + (1 - p) * 200;
                      const labelValue = Math.round(p * trendMaxVal);
                      return (
                        <g key={idx}>
                          <line x1="45" y1={y} x2="520" y2={y} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" className="opacity-40" />
                          <text x="35" y={y + 3} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                            {labelValue}
                          </text>
                        </g>
                      );
                    })}

                    {/* X and Y axes */}
                    <line x1="45" y1="20" x2="45" y2="220" stroke="#475569" strokeWidth="1" />
                    <line x1="45" y1="220" x2="520" y2="220" stroke="#475569" strokeWidth="1" />

                    {/* Bars and labels */}
                    {trendData.map((d, idx) => {
                      const stepX = 475 / trendData.length;
                      const x = 55 + idx * stepX;
                      const barWidth = Math.max(4, stepX * 0.28);
                      
                      // Heights calculations
                      const recHeight = (d.received / trendMaxVal) * 200;
                      const ereHeight = (d.erected / trendMaxVal) * 200;

                      const recY = 220 - recHeight;
                      const ereY = 220 - ereHeight;

                      return (
                        <g key={idx}>
                          {/* Received Bar (Blue) */}
                          <rect
                            x={x}
                            y={recY}
                            width={barWidth}
                            height={recHeight}
                            fill="url(#blueGrad)"
                            rx="2"
                            className="cursor-pointer hover:brightness-125 transition-all duration-300 ease-out"
                            style={{ transition: "height 0.3s ease-out, y 0.3s ease-out" }}
                            onMouseEnter={() => setHoveredTrendIndex(idx)}
                            onMouseLeave={() => setHoveredTrendIndex(null)}
                          />

                          {/* Erected Bar (Purple) */}
                          <rect
                            x={x + barWidth + 2}
                            y={ereY}
                            width={barWidth}
                            height={ereHeight}
                            fill="url(#purpleGrad)"
                            rx="2"
                            className="cursor-pointer hover:brightness-125 transition-all duration-300 ease-out"
                            style={{ transition: "height 0.3s ease-out, y 0.3s ease-out" }}
                            onMouseEnter={() => setHoveredTrendIndex(idx)}
                            onMouseLeave={() => setHoveredTrendIndex(null)}
                          />

                          {/* X Axis Labels */}
                          <text
                            x={x + barWidth + 1}
                            y="238"
                            fill="#94a3b8"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {d.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* SVG Gradients */}
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.4" />
                      </linearGradient>
                      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#6b21a8" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Interactive HTML Tooltip inside absolute overlay */}
                  {hoveredTrendIndex !== null && trendData[hoveredTrendIndex] && (
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl z-20 pointer-events-none min-w-[150px] space-y-1.5 animate-scale-in">
                      <div className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-900 pb-1 flex justify-between">
                        <span>Period</span>
                        <span className="text-white">{trendData[hoveredTrendIndex].label}</span>
                      </div>
                      <div className="text-xs space-y-1 font-semibold">
                        <div className="flex items-center justify-between gap-4 text-blue-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-blue-500"></span> Received:
                          </span>
                          <span>{trendData[hoveredTrendIndex].received.toFixed(metricType === "pcs" ? 0 : 2)} {metricType.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-purple-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-purple-500"></span> Erected:
                          </span>
                          <span>{trendData[hoveredTrendIndex].erected.toFixed(metricType === "pcs" ? 0 : 2)} {metricType.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs">
                  No time activity logs recorded for this range. Try logging deliveries or erections.
                </div>
              )}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-500/20 inline-block shadow-inner"></span>
                <span>Received Precast (MDR Deliveries)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-500/20 inline-block shadow-inner"></span>
                <span>Erected Precast (Progress logs)</span>
              </div>
            </div>
          </div>

          {/* COLUMN RIGHT: Product Wise breakdown with distinctive coloring (matching "product ke anusar color color") */}
          <div className="lg:col-span-5 bg-slate-950/30 border border-slate-850 rounded-2xl p-4.5 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Product-Wise Progress (Bar Model)
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Element quantities categorized by product type</p>
              </div>
              <div className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">
                Color Coded
              </div>
            </div>

            {/* Product Wise Chart - Grouped Vertical Bar Model */}
            <div className="relative min-h-[220px] flex flex-col justify-between">
              {productData.length > 0 ? (
                <div className="w-full">
                  <svg viewBox="0 0 380 240" className="w-full h-auto overflow-visible select-none">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                      const y = 20 + (1 - p) * 160;
                      const labelValue = Math.round(p * productMaxVal);
                      return (
                        <g key={idx}>
                          <line x1="40" y1={y} x2="360" y2={y} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" className="opacity-40" />
                          <text x="32" y={y + 3} fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                            {labelValue}
                          </text>
                        </g>
                      );
                    })}

                    {/* X and Y axes */}
                    <line x1="40" y1="20" x2="40" y2="180" stroke="#475569" strokeWidth="1" />
                    <line x1="40" y1="180" x2="360" y2="180" stroke="#475569" strokeWidth="1" />

                    {/* Grouped vertical bars */}
                    {productData.map((prod, idx) => {
                      const stepX = 310 / productData.length;
                      const x = 50 + idx * stepX;
                      const barWidth = Math.max(6, stepX * 0.25);
                      
                      // Heights calculations
                      const recHeight = (prod.received / productMaxVal) * 160;
                      const ereHeight = (prod.erected / productMaxVal) * 160;

                      const recY = 180 - recHeight;
                      const ereY = 180 - ereHeight;

                      return (
                        <g key={idx}>
                          {/* Received Bar (Solid Product Color) */}
                          <rect
                            x={x}
                            y={recY}
                            width={barWidth}
                            height={recHeight}
                            fill={prod.fill}
                            rx="1.5"
                            className="cursor-pointer hover:brightness-125 transition-all duration-300 ease-out"
                            style={{ transition: "height 0.3s ease-out, y 0.3s ease-out" }}
                            onMouseEnter={() => setHoveredProductIndex(idx)}
                            onMouseLeave={() => setHoveredProductIndex(null)}
                          />

                          {/* Erected Bar (Slightly transparent Product Color) */}
                          <rect
                            x={x + barWidth + 2}
                            y={ereY}
                            width={barWidth}
                            height={ereHeight}
                            fill={`${prod.fill}99`}
                            stroke={prod.fill}
                            strokeWidth="0.75"
                            rx="1.5"
                            className="cursor-pointer hover:brightness-125 transition-all duration-300 ease-out"
                            style={{ transition: "height 0.3s ease-out, y 0.3s ease-out" }}
                            onMouseEnter={() => setHoveredProductIndex(idx)}
                            onMouseLeave={() => setHoveredProductIndex(null)}
                          />

                          {/* Label */}
                          <text
                            x={x + barWidth + 1}
                            y="195"
                            fill="#94a3b8"
                            fontSize="8"
                            fontWeight="black"
                            textAnchor="middle"
                          >
                            {prod.name.length > 8 ? `${prod.name.substring(0, 8)}..` : prod.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Interactive HTML Tooltip inside absolute overlay for products */}
                  {hoveredProductIndex !== null && productData[hoveredProductIndex] && (
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl z-20 pointer-events-none min-w-[150px] space-y-1.5 animate-scale-in">
                      <div className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-900 pb-1 flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-white">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: productData[hoveredProductIndex].fill }}></span>
                          {productData[hoveredProductIndex].name}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 font-semibold">
                        <div className="flex items-center justify-between gap-4 text-blue-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded" style={{ backgroundColor: productData[hoveredProductIndex].fill }}></span> Received:
                          </span>
                          <span className="text-white">{productData[hoveredProductIndex].received.toFixed(metricType === "pcs" ? 0 : 2)} {metricType.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-purple-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded bg-slate-500 opacity-60" style={{ backgroundColor: productData[hoveredProductIndex].fill }}></span> Erected:
                          </span>
                          <span className="text-white">{productData[hoveredProductIndex].erected.toFixed(metricType === "pcs" ? 0 : 2)} {metricType.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                  <Info className="h-6 w-6 text-slate-600" />
                  <span>No precast element types found under this site yet.</span>
                </div>
              )}
            </div>

            {/* Product Wise Legend details */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-400 space-y-1.5">
              <span className="font-bold text-white uppercase tracking-wider block text-[9px]">Legend Indicator Details</span>
              <div className="flex justify-between text-[9px] font-bold">
                <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-slate-400 inline-block"></span> Solid Color = Received (MDR)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-1 rounded inline-block bg-slate-400 opacity-60"></span> Shaded Color = Erected on structure</span>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 text-xs">
          Please select or type a valid site number at the top filter dropdown to generate the analytics dashboards.
        </div>
      )}

      {/* 4. Help tooltip panel */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-400">
        <Sparkles className="h-5 w-5 text-yellow-500 flex-shrink-0 animate-pulse mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">How the Auto-calculating Performance Progress Dashboard works:</p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
            <li><strong>Interactive Filtering:</strong> Enter any Site Number in the search field above. The system automatically searches, finds the site metadata, and establishes live listeners to fetch that site's deliveries and erection progress logs in real-time.</li>
            <li><strong>Dynamic Time Intervals (Daily/Weekly/Monthly):</strong> Tap between Daily, Weekly, or Monthly trends to change aggregation calculations.</li>
            <li><strong>Color Segregation by Product:</strong> Unique precast element codes and classes (Slabs, Beams, Columns, Wall Panels, Stairs) automatically inherit distinct high-contrast colors dynamically so you can inspect visual progress with zero manual labeling!</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
