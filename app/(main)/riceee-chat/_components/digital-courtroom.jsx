"use client";

import { useState } from "react";
import { Gavel, PlusCircle } from "lucide-react";
import { VerdictCard } from "@/components/verdict-card";

export default function DigitalCourtroom({ isPreview, setActiveTab, poppins }) {
  const [caseStatus, setCaseStatus] = useState("pending"); // pending, verdict

  return (
    <>
      {/* Status Dashboard */}
      <div className={`bg-white rounded-xl p-6 flex flex-col gap-6 ${poppins?.className || ''}`}>
        <div className="flex items-center gap-3 text-[#9d4867] border-b border-stone-100 pb-4">
          <Gavel size={24} />
          <h3 className="text-[24px] tracking-[-0.02em] font-semibold text-stone-900">Digital Courtroom</h3>
        </div>
        
        {caseStatus === "pending" ? (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] tracking-[0.1em] font-medium text-stone-400 uppercase">Active Case Status</span>
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-stone-900">Case #8492: The Sink Incident</span>
                <span className="px-2.5 py-1 bg-[#ffae88]/20 text-[#9d4867] text-[10px] rounded-full uppercase tracking-wider font-bold border border-[#ffae88]/30">Pending</span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="w-2 h-2 rounded-full bg-[#ffae88] animate-pulse"></span>
                <p className="text-[14px] text-stone-500">Waiting for Partner's Perspective...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] tracking-[0.1em] font-medium text-[#9d4867] uppercase">Verdict Ready</span>
            <div className="bg-stone-50 rounded-xl p-4 border border-[#ffae88]/30 shadow-sm">
              <p className="text-[14px] text-stone-600 mb-4">The AI has analyzed both testimonies and reached a conclusion.</p>
              <button 
                onClick={() => !isPreview && setCaseStatus("verdict")}
                className="w-full py-3 bg-[#ffae88] text-[#9d4867] rounded-xl text-[12px] font-bold uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                View Verdict
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setCaseStatus("pending")}
          className="w-full py-3 px-4 bg-white border border-[#ffae88]/30 rounded-xl text-[12px] tracking-[0.1em] font-bold text-[#9d4867] hover:bg-[#ffae88]/10 transition-all flex items-center justify-center gap-2 mt-auto uppercase"
        >
          <PlusCircle size={18} />
          File a New Dispute
        </button>
      </div>

      {/* Recent Insights Bento Box (only show in preview or if no verdict) */}
      {(isPreview || caseStatus === "pending") && (
        <div className={`bg-white border border-stone-100 rounded-xl p-6 flex-1 shadow-sm ${poppins?.className || ''}`}>
          <h4 className="text-[12px] tracking-[0.1em] font-bold text-stone-400 mb-6 uppercase">AI Insight Summary</h4>
          <div className="space-y-4">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-[13px] text-stone-600 leading-relaxed">Recurring theme detected: Communication breakdown regarding unspoken expectations.</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-[13px] text-stone-600 leading-relaxed">Your stress levels peak during evening transitions. Consider a brief cooldown period.</p>
            </div>
          </div>
        </div>
      )}

      {/* Render Verdict Card if not in preview and status is verdict */}
      {!isPreview && caseStatus === "verdict" && (
        <div className="mt-6">
           <VerdictCard />
        </div>
      )}
    </>
  );
}