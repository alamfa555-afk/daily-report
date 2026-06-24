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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto mb-4">
      {/* Received metric card */}
      <div className="backdrop-blur-md bg-slate-900/60 border border-emerald-500/25 p-3.5 rounded-xl shadow-xl hover:shadow-emerald-950/20 transition-all hover:translate-y-[-1px]">
        <div className="flex justify-between items-start mb-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
            <Download className="h-4 w-4" />
          </div>
          <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            MDR Receipts
          </span>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Received</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            {totalReceivedCount}
          </span>
          <span className="text-[10px] text-emerald-300 font-bold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-800/60 pt-2">
          <span>Weight:</span>
          <span className="font-bold text-slate-200">{totalReceivedWeight.toFixed(1)} T</span>
        </div>
      </div>

      {/* Erected metric card */}
      <div className="backdrop-blur-md bg-slate-900/60 border border-purple-500/25 p-3.5 rounded-xl shadow-xl hover:shadow-purple-950/20 transition-all hover:translate-y-[-1px]">
        <div className="flex justify-between items-start mb-2">
          <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Construction className="h-4 w-4" />
          </div>
          <span className="text-[9px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            Assembly
          </span>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Erected</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-black text-purple-400 tracking-tight drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]">
            {totalErectedCount}
          </span>
          <span className="text-[10px] text-purple-300 font-bold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-800/60 pt-2">
          <span>Weight:</span>
          <span className="font-bold text-slate-200">{totalErectedWeight.toFixed(1)} T</span>
        </div>
      </div>

      {/* Balance Sitting on site */}
      <div className="backdrop-blur-md bg-slate-900/60 border border-amber-500/25 p-3.5 rounded-xl shadow-xl hover:shadow-amber-950/20 transition-all hover:translate-y-[-1px]">
        <div className="flex justify-between items-start mb-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            Inventory
          </span>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Awaiting Erection</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-2xl font-black text-amber-400 tracking-tight drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            {balanceCount}
          </span>
          <span className="text-[10px] text-amber-300 font-bold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-800/60 pt-2">
          <span>Weight:</span>
          <span className="font-bold text-slate-200">{balanceWeight.toFixed(1)} T</span>
        </div>
      </div>

      {/* Defects / Rejects */}
      <div className={`backdrop-blur-md bg-slate-900/60 p-3.5 rounded-xl shadow-xl transition-all hover:translate-y-[-1px] border ${totalIssueCount > 0 ? 'border-rose-500/30' : 'border-slate-800'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className={`p-1.5 rounded-lg border ${totalIssueCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${totalIssueCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>
            Quality Issues
          </span>
        </div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Damaged/Rejected</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className={`text-2xl font-black tracking-tight drop-shadow-[0_0_8px_rgba(244,63,94,0.2)] ${totalIssueCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {totalIssueCount}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-800/60 pt-2 gap-1 flex-wrap">
          <span className="text-amber-400/90 font-medium">Damaged: {damagedReceived + damagedErected}</span>
          <span className="text-rose-400/90 font-medium">Rejected: {rejectedReceived + rejectedErected}</span>
        </div>
      </div>
    </div>
  );
}
