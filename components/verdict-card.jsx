"use client";

import React from "react";
import { Poppins } from "next/font/google";
import { ShieldCheck, Brain, Scale, Heart, ArrowRight } from "lucide-react";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export function VerdictCard() {
  return (
    <div className={`w-full max-w-[800px] relative mx-auto pb-12 ${poppins.className}`}>
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[#ffae88]/10 blur-[80px] rounded-full pointer-events-none -z-10 animate-pulse"></div>

      {/* The Card Surface */}
      <div className="relative rounded-3xl overflow-hidden bg-white border border-[#ffae88]/20 shadow-xl p-6 md:p-10">
        {/* Left Accent Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#ffae88]"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 relative z-10 border-b border-stone-100 pb-8">
          <h1 className="text-[32px] font-bold text-stone-900 tracking-[-0.02em]">The Court's Ruling</h1>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffae88]/10 border border-[#ffae88]/20 w-fit">
            <ShieldCheck size={18} className="text-[#9d4867]" />
            <span className="text-[12px] font-bold tracking-[0.1em] uppercase text-[#9d4867]">Verified AI Verdict</span>
          </div>
        </div>

        {/* Section 1: The Root Cause */}
        <div className="mb-12 relative z-10">
          <h2 className="text-[12px] font-bold tracking-[0.1em] uppercase text-[#9d4867] mb-4 flex items-center gap-2">
            <Brain size={16} />
            The Root Cause
          </h2>
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100 relative overflow-hidden">
            <p className="text-[18px] text-stone-700 relative z-10 leading-[1.6]">
              The conflict stems from unexpressed expectations regarding domestic emotional labor, masquerading as arguments about scheduling. Both parties are operating from a place of defensive burnout rather than active malice.
            </p>
          </div>
        </div>

        {/* Section 2: Accountability */}
        <div className="mb-12 relative z-10">
          <h2 className="text-[12px] font-bold tracking-[0.1em] uppercase text-[#9d4867] mb-6 flex items-center gap-2">
            <Scale size={16} />
            Accountability
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Initiator's Role */}
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100 shadow-sm relative overflow-hidden group hover:border-[#ffae88]/30 transition-colors">
              <h3 className="text-[18px] font-bold text-stone-900 mb-6 tracking-[-0.01em]">Initiator's Role</h3>
              <ul className="space-y-4 text-[15px] text-stone-600 relative z-10">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffae88] mt-2 shrink-0"></span>
                  <span>Relying on absolute statements ("You always...", "You never...") which force the respondent into a defensive posture.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffae88] mt-2 shrink-0"></span>
                  <span>Expecting anticipation of needs without providing explicit, structured communication.</span>
                </li>
              </ul>
            </div>

            {/* Respondent's Role */}
            <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100 shadow-sm relative overflow-hidden group hover:border-[#ffae88]/30 transition-colors">
              <h3 className="text-[18px] font-bold text-stone-900 mb-6 tracking-[-0.01em]">Respondent's Role</h3>
              <ul className="space-y-4 text-[15px] text-stone-600 relative z-10">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffae88] mt-2 shrink-0"></span>
                  <span>Defaulting to immediate defensiveness instead of pausing to acknowledge the underlying frustration being expressed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffae88] mt-2 shrink-0"></span>
                  <span>Inconsistent follow-through on minor agreed-upon tasks, which incrementally erodes foundational trust.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 3: The Way Forward */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-[#ffae88]/10 flex items-center justify-center border border-[#ffae88]/20 shadow-sm">
              <Heart size={24} className="text-[#9d4867]" />
            </div>
            <h2 className="text-[24px] font-bold text-stone-900 tracking-[-0.02em]">The Way Forward</h2>
          </div>
          <div className="space-y-4">
            {[
              "Establish a mandatory 10-minute weekly \"sync\" on Sunday evenings to divide upcoming domestic tasks explicitly, removing the burden of assumption.",
              "Initiator must consciously replace all absolute statements (\"always/never\") with specific \"I feel\" statements starting immediately.",
              "Respondent commits to one specific, unprompted act of service per week to actively demonstrate engagement and rebuild trust."
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-5 p-6 rounded-2xl bg-white border border-stone-100 hover:border-[#ffae88]/30 hover:shadow-md transition-all duration-300">
                <div className="w-8 h-8 shrink-0 rounded-full bg-[#ffae88] text-[#9d4867] flex items-center justify-center text-[14px] font-bold shadow-sm">{i + 1}</div>
                <p className="text-[16px] text-stone-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action / Acknowledgment */}
        <div className="mt-12 pt-10 border-t border-stone-100 flex justify-end relative z-10">
          <button className="bg-[#ffae88] text-[#9d4867] text-[13px] font-bold tracking-[0.1em] uppercase px-10 py-4 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3">
            Accept Verdict
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
