"use client";

import { useState } from "react";
import { Gavel, PlusCircle } from "lucide-react";
import { VerdictCard } from "@/components/verdict-card";

export default function DigitalCourtroom({ isPreview, setActiveTab, spaceGrotesk, inter }) {
  const [caseStatus, setCaseStatus] = useState("pending"); // pending, verdict

  return (
    <>
      {/* Status Dashboard */}
      <div className="bg-[rgba(30,30,47,0.4)] backdrop-blur-[24px] border border-white/10 rounded-xl p-6 flex flex-col gap-6" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(30,30,47,0.4)' }}>
        <div className="flex items-center gap-3 text-[#c4b5fd] border-b border-white/5 pb-4">
          <Gavel size={24} />
          <h3 className={`text-[24px] tracking-[-0.02em] font-semibold text-[#e7deff] ${spaceGrotesk.className}`}>Digital Courtroom</h3>
        </div>
        
        {caseStatus === "pending" ? (
          <div className="flex flex-col gap-2">
            <span className={`text-[12px] tracking-[0.1em] font-medium text-[#938f9a] uppercase ${spaceGrotesk.className}`}>Active Case Status</span>
            <div className="bg-[#1e1e2f] rounded-lg p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[12px] tracking-[0.1em] font-medium text-[#e3e0f8] ${spaceGrotesk.className}`}>Case #8492: The Sink Incident</span>
                <span className={`px-2 py-1 bg-[#38374a] text-[#dfd5ff] text-[10px] rounded uppercase tracking-wider font-bold ${spaceGrotesk.className}`}>Pending</span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="w-2 h-2 rounded-full bg-[#c6c4df] animate-pulse"></span>
                <p className={`text-[14px] text-[#c6c4df] ${inter.className}`}>Waiting for Partner's Perspective...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className={`text-[12px] tracking-[0.1em] font-medium text-[#c4b5fd] uppercase ${spaceGrotesk.className}`}>Verdict Ready</span>
            <div className="bg-[#1e1e2f] rounded-lg p-4 border border-[#c4b5fd]/30 shadow-[0_0_15px_rgba(196,181,253,0.1)]">
              <p className={`text-[14px] text-[#e3e0f8] mb-2 ${inter.className}`}>The AI has analyzed both testimonies and reached a conclusion.</p>
              <button 
                onClick={() => !isPreview && setCaseStatus("verdict")}
                className={`w-full py-2 bg-[#c4b5fd] text-[#332664] rounded-md text-[12px] font-bold uppercase tracking-widest ${spaceGrotesk.className}`}
              >
                View Verdict
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setCaseStatus("pending")}
          className={`w-full py-3 px-4 border border-white/20 rounded-lg text-[12px] tracking-[0.1em] font-medium text-[#e3e0f8] hover:bg-white/5 hover:border-[#c4b5fd]/50 hover:shadow-[0_0_15px_rgba(196,181,253,0.2)] transition-all flex items-center justify-center gap-2 mt-auto uppercase ${spaceGrotesk.className}`}
        >
          <PlusCircle size={18} />
          File a New Dispute
        </button>
      </div>

      {/* Recent Insights Bento Box (only show in preview or if no verdict) */}
      {(isPreview || caseStatus === "pending") && (
        <div className="bg-[rgba(30,30,47,0.4)] backdrop-blur-[24px] border border-white/10 rounded-xl p-6 flex-1" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(30,30,47,0.4)' }}>
          <h4 className={`text-[12px] tracking-[0.1em] font-medium text-[#938f9a] mb-4 uppercase ${spaceGrotesk.className}`}>AI Insight Summary</h4>
          <div className="space-y-4">
            <div className="p-3 bg-[#1a1a2b] rounded-lg border border-white/5">
              <p className={`text-[13px] text-[#cac4d1] ${inter.className}`}>Recurring theme detected: Communication breakdown regarding unspoken expectations.</p>
            </div>
            <div className="p-3 bg-[#1a1a2b] rounded-lg border border-white/5">
              <p className={`text-[13px] text-[#cac4d1] ${inter.className}`}>Your stress levels peak during evening transitions. Consider a brief cooldown period.</p>
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