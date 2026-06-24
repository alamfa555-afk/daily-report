import React from "react";
import { Download, Construction, AlertTriangle, Boxes } from "lucide-react";
import { Delivery, Erection } from "../types";

interface StatsGridProps {
  deliveries: Delivery[];
  erections: Erection[];
}

export default function StatsGrid({ deliveries = [], erections = [] }: StatsGridProps) {
  // Compute metrics
  const totalReceivedCount = deliveries.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const totalReceivedWeight = deliveries.reduce((sum, d) => sum + (d.totalWeight || 0), 0);

  const totalErectedCount = erections.reduce((sum, e) => sum + (e.quantity || 1), 0);
  const totalErectedWeight = erections.reduce((sum, e) => sum + (e.totalWeight || 0), 0);

  // Balance sitting on site awaiting erection
  const balanceCount = Math.max(0, totalReceivedCount - totalErectedCount);
  const balanceWeight = Math.max(0, totalReceivedWeight - totalErectedWeight);

  // Quality concerns
  const damagedReceived = deliveries.filter(d => d.status === "damage").reduce((sum, d) => sum + (d.quantity || 1), 0);
  const rejectedReceived = deliveries.filter(d => d.status === "reject").reduce((sum, d) => sum + (d.quantity || 1), 0);
  
  const damagedErected = erections.filter(e => e.status === "damage").reduce((sum, e) => sum + (e.quantity || 1), 0);
  const rejectedErected = erections.filter(e => e.status === "reject").reduce((sum, e) => sum + (e.quantity || 1), 0);

  const totalIssueCount = damagedReceived + rejectedReceived + damagedErected + rejectedErected;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-7xl mx-auto mb-6">
      {/* Received metric card */}
      <div className="backdrop-blur-md bg-slate-900/60 border border-emerald-500/25 p-5 rounded-2xl shadow-xl hover:shadow-emerald-950/20 transition-all hover:translate-y-[-2px]">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            MDR Receipts
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total Received</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-4xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            {totalReceivedCount}
          </span>
          <span className="text-sm text-emerald-300 font-bold">PCS</span>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex justify-between border-t border-slate-800/60 pt-2.5">
          <span>Total Precast Weight:</span>
          <span className="font-bold text-slate-200">{totalReceivedWeight.toFixed(2)} Tons</span>
        </div>
      </div>

      {/* Erected metric card */}
      <div className="backdrop-blur-md bg-slate-900/60 border border-purple-500/25 p-5 rounded-2xl shadow-xl hover:shadow-purple-950/20 transition-all hover:translate-y-[-2px]">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
            <Construction className="h-5 w-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            Assembly Progress
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Total Erected</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-4xl font-black text-purple-400 tracking-tight drop-shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            {totalErectedCount}
          </span>
          <span className="text-sm text-purple-300 font-bold">PCS</span>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex justify-between border-t border-slate-800/60 pt-2.5">
          <span>Installed Weight:</span>
          <span className="font-bold text-slate-200">{totalErectedWeight.toFixed(2)} Tons</span>
        </div>
      </div>

      {/* Balance Sitting on site */}
      <div className="backdrop-blur-md bg-slate-900/60 border border-amber-500/25 p-5 rounded-2xl shadow-xl hover:shadow-amber-950/20 transition-all hover:translate-y-[-2px]">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            On-Site Inventory
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Awaiting Erection</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-4xl font-black text-amber-400 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            {balanceCount}
          </span>
          <span className="text-sm text-amber-300 font-bold">PCS</span>
        </div>
        <div className="mt-3 text-xs text-slate-400 flex justify-between border-t border-slate-800/60 pt-2.5">
          <span>Stored Weight:</span>
          <span className="font-bold text-slate-200">{balanceWeight.toFixed(2)} Tons</span>
        </div>
      </div>

      {/* Defects / Rejects */}
      <div className={`backdrop-blur-md bg-slate-900/60 p-5 rounded-2xl shadow-xl transition-all hover:translate-y-[-2px] border ${totalIssueCount > 0 ? 'border-rose-500/30' : 'border-slate-800'}`}>
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2.5 rounded-xl border ${totalIssueCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${totalIssueCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>
            Quality Concerns
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Damaged/Rejected</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={`text-4xl font-black tracking-tight drop-shadow-[0_0_12px_rgba(244,63,94,0.2)] ${totalIssueCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {totalIssueCount}
          </span>
          <span className="text-sm text-slate-400 font-bold">PCS</span>
        </div>
        <div className="mt-3 text-[10px] text-slate-400 flex justify-between border-t border-slate-800/60 pt-2.5 gap-1.5 flex-wrap">
          <span className="text-amber-400/90">Minor: {damagedReceived + damagedErected}</span>
          <span className="text-rose-400/90">Rejected: {rejectedReceived + rejectedErected}</span>
        </div>
      </div>
    </div>
  );
}
