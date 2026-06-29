import React from "react";
import { Inbox, Construction, AlertTriangle, Boxes } from "lucide-react";
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

  // Balance sitting on site awaiting erection (Only good items should remain, exclude damaged and rejected)
  const goodReceivedCount = deliveries.filter(d => d.status === "good").reduce((sum, d) => sum + (d.quantity || 1), 0);
  const goodReceivedWeight = deliveries.filter(d => d.status === "good").reduce((sum, d) => sum + (d.totalWeight || 0), 0);

  const balanceCount = Math.max(0, goodReceivedCount - totalErectedCount);
  const balanceWeight = Math.max(0, goodReceivedWeight - totalErectedWeight);

  // Quality concerns
  const damagedReceived = deliveries.filter(d => d.status === "damage").reduce((sum, d) => sum + (d.quantity || 1), 0);
  const rejectedReceived = deliveries.filter(d => d.status === "reject").reduce((sum, d) => sum + (d.quantity || 1), 0);
  
  const damagedErected = erections.filter(e => e.status === "damage").reduce((sum, e) => sum + (e.quantity || 1), 0);
  const rejectedErected = erections.filter(e => e.status === "reject").reduce((sum, e) => sum + (e.quantity || 1), 0);

  const totalIssueCount = damagedReceived + rejectedReceived + damagedErected + rejectedErected;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto mb-4">
      {/* Received metric card */}
      <div className="bg-slate-900 border-2 border-emerald-500/45 p-3.5 rounded-xl shadow-xl hover:shadow-emerald-950/30 transition-all hover:translate-y-[-1px]">
        <div className="flex justify-between items-start mb-2">
          <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-300 border border-emerald-500/30">
            <Inbox className="h-4 w-4" />
          </div>
          <span className="text-[9.5px] uppercase font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
            MDR Receipts
          </span>
        </div>
        <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Total Received</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-black text-emerald-300 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {totalReceivedCount}
          </span>
          <span className="text-[11px] text-emerald-300 font-extrabold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-300 flex justify-between border-t border-slate-800 pt-2">
          <span>Weight:</span>
          <span className="font-extrabold text-slate-100">{totalReceivedWeight.toFixed(1)} T</span>
        </div>
      </div>

      {/* Erected metric card */}
      <div className="bg-slate-900 border-2 border-purple-500/45 p-3.5 rounded-xl shadow-xl hover:shadow-purple-950/30 transition-all hover:translate-y-[-1px]">
        <div className="flex justify-between items-start mb-2">
          <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-300 border border-purple-500/30">
            <Construction className="h-4 w-4" />
          </div>
          <span className="text-[9.5px] uppercase font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
            Assembly
          </span>
        </div>
        <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Total Erected</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-black text-purple-300 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {totalErectedCount}
          </span>
          <span className="text-[11px] text-purple-300 font-extrabold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-300 flex justify-between border-t border-slate-800 pt-2">
          <span>Weight:</span>
          <span className="font-extrabold text-slate-100">{totalErectedWeight.toFixed(1)} T</span>
        </div>
      </div>

      {/* Balance Sitting on site */}
      <div className="bg-slate-900 border-2 border-amber-500/45 p-3.5 rounded-xl shadow-xl hover:shadow-amber-950/30 transition-all hover:translate-y-[-1px]">
        <div className="flex justify-between items-start mb-2">
          <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-300 border border-amber-500/30">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-[9.5px] uppercase font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
            Inventory
          </span>
        </div>
        <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1">
          Awaiting Erection <span className="text-[8px] text-emerald-400 bg-emerald-500/15 px-1 py-0.2 rounded font-black font-mono border border-emerald-500/20">GOOD ONLY</span>
        </p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-black text-amber-300 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {balanceCount}
          </span>
          <span className="text-[11px] text-amber-300 font-extrabold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-300 flex justify-between border-t border-slate-800 pt-2">
          <span>Weight:</span>
          <span className="font-extrabold text-slate-100">{balanceWeight.toFixed(1)} T</span>
        </div>
      </div>

      {/* Defects / Rejects */}
      <div className={`bg-slate-900 p-3.5 rounded-xl shadow-xl transition-all hover:translate-y-[-1px] border-2 ${totalIssueCount > 0 ? 'border-rose-500/45' : 'border-slate-800'}`}>
        <div className="flex justify-between items-start mb-2">
          <div className={`p-1.5 rounded-lg border ${totalIssueCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <span className={`text-[9.5px] uppercase font-black px-2 py-0.5 rounded-full border ${totalIssueCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-800 text-slate-400 border-slate-700/50'}`}>
            Quality Issues
          </span>
        </div>
        <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">Damaged/Rejected</p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className={`text-3xl md:text-4xl font-black tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${totalIssueCount > 0 ? 'text-rose-300' : 'text-slate-100'}`}>
            {totalIssueCount}
          </span>
          <span className="text-[11px] text-slate-300 font-extrabold">PCS</span>
        </div>
        <div className="mt-2 text-[10px] text-slate-300 flex justify-between border-t border-slate-800 pt-2 gap-1 flex-wrap">
          <span className="text-amber-400 font-bold">Damaged: {damagedReceived + damagedErected}</span>
          <span className="text-rose-400 font-bold">Rejected: {rejectedReceived + rejectedErected}</span>
        </div>
      </div>
    </div>
  );
}
