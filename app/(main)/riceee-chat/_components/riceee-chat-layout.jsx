"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiceeeChatClient from "./riceee-chat-client";
import DigitalCourtroom from "./digital-courtroom";
import { Space_Grotesk, Inter } from "next/font/google";
import { Gavel, BrainCircuit, BarChart2, User, PanelLeft, Sparkles, MessageSquare, Clock, Star, X, Plus } from "lucide-react";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["400"] });

export default function RiceeeChatLayout({ partnerNames }) {
  const [activeTab, setActiveTab] = useState("solo-vent");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div
      className={`relative -mt-28 md:-mt-32 pt-[84px] md:pt-[88px] min-h-[100dvh] bg-[#121222] text-[#e3e0f8] ${inter.className} flex flex-col items-center overflow-x-hidden antialiased`}
      style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
    >

      {/* Floating Sidebar Toggle (Becomes a glassmorphic button) */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-8 left-6 z-[60] p-2.5 rounded-xl transition-all duration-300 hidden md:flex items-center justify-center hover:scale-105 active:scale-95 border shadow-[0_4px_24px_rgba(0,0,0,0.2)] ${
          isSidebarOpen 
            ? "bg-[#c4b5fd]/20 border-[#c4b5fd]/30 text-[#c4b5fd] backdrop-blur-xl" 
            : "bg-white/5 border-white/10 text-[#938f9a] hover:text-[#e3e0f8] hover:bg-white/10 backdrop-blur-md"
        }`}
      >
        <PanelLeft size={22} className={`transition-transform duration-500 ${isSidebarOpen ? "rotate-180" : "rotate-0"}`} />
      </button>

      {/* Floating Sidebar Box - Crazy Design Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Sidebar Container */}
            <motion.div
              initial={{ x: -320, opacity: 0, scale: 0.95, rotateY: 15 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ x: -320, opacity: 0, scale: 0.95, rotateY: -15 }}
              transition={{ ease: "easeOut", duration: 0.3 }}
              className="fixed top-24 left-6 w-[280px] h-[calc(100vh-8rem)] z-50 hidden md:flex flex-col bg-[#161626]/80 backdrop-blur-[32px] border border-white/10 rounded-[32px] shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden"
              style={{ transformPerspective: 1200 }}
            >
              {/* Sidebar Header */}
              <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c4b5fd]/10 blur-3xl rounded-full" />
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c4b5fd] to-[#818cf8] flex items-center justify-center shadow-[0_0_20px_rgba(196,181,253,0.4)]">
                      <Sparkles size={16} className="text-[#1e1e2f]" />
                    </div>
                    <span className={`font-bold text-[15px] tracking-widest uppercase text-white ${spaceGrotesk.className}`}>Workspace</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#938f9a] font-medium tracking-wide uppercase mt-1 relative z-10">Your personal sanctuary</p>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2 relative z-10">
                {/* Menu Items */}
                <div className="flex flex-col gap-1.5 mb-6">
                  <span className="text-[10px] text-[#6b6776] font-bold uppercase tracking-widest mb-2 px-2 mt-2">Quick Navigation</span>
                  
                  <button className="flex items-center gap-3 w-full p-3 rounded-2xl text-left transition-all duration-300 hover:bg-[#c4b5fd] hover:shadow-[0_0_20px_rgba(196,181,253,0.4)] text-white group relative overflow-hidden bg-gradient-to-r from-[#c4b5fd]/20 to-[#c4b5fd]/5 border border-[#c4b5fd]/30">
                    <div className="absolute inset-0 bg-[#c4b5fd] translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-300 ease-out z-0" />
                    <Plus size={18} className="text-[#c4b5fd] group-hover:text-[#121222] transition-colors relative z-10" />
                    <span className="text-sm font-bold relative z-10 group-hover:text-[#121222] transition-colors">New Chat</span>
                  </button>

                  <div className="h-px w-full bg-white/5 my-1" />

                  <button className="flex items-center gap-3 w-full p-3 rounded-2xl text-left transition-all duration-300 hover:bg-white/10 text-[#e3e0f8] group relative overflow-hidden bg-white/5 border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c4b5fd]/0 via-[#c4b5fd]/10 to-[#c4b5fd]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <MessageSquare size={18} className="text-[#c4b5fd] group-hover:text-white transition-colors relative z-10" />
                    <span className="text-sm font-medium relative z-10">Recent Vents</span>
                  </button>

                  <button className="flex items-center gap-3 w-full p-3 rounded-2xl text-left transition-all duration-300 hover:bg-white/10 text-[#cac4d1] group">
                    <Clock size={18} className="text-[#938f9a] group-hover:text-[#c4b5fd] transition-colors" />
                    <span className="text-sm font-medium">Memory Timeline</span>
                  </button>
                </div>


              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dynamic Header Contrast Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
        header nav { 
          background-color: rgba(30, 30, 47, 0.6) !important; 
          border-color: rgba(255, 255, 255, 0.1) !important; 
        }
        header nav a[href="/"] {
          background-color: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
        }
        header nav .bg-stone-100\\/30 {
          background-color: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
        }
        header nav .bg-stone-100\\/30 a {
          color: #ab4400 !important;
          font-weight: 700 !important;
        }
      `}} />

      {/* Radial Gradient Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(196, 181, 253, 0.08) 0%, transparent 50%)' }} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col items-center z-10 relative">

        {/* Premium Tab Switcher */}
        <div className="w-full max-w-[400px] mx-auto mb-10 flex bg-[#1e1e2f] rounded-full p-1 relative shadow-inner border border-white/5">
          <motion.div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#c4b5fd] rounded-full shadow-[0_0_15px_rgba(196,181,253,0.3)] z-0"
            initial={false}
            animate={{ left: activeTab === "solo-vent" ? "4px" : "calc(50%)" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            onClick={() => setActiveTab("solo-vent")}
            className={`flex-1 py-3 text-center relative z-10 text-[12px] uppercase tracking-[0.1em] font-medium transition-colors ${activeTab === "solo-vent" ? "text-[#332664]" : "text-[#cac4d1] hover:text-[#e3e0f8]"
              } ${spaceGrotesk.className}`}
          >
            SOLO CHAT
          </button>
          <button
            onClick={() => setActiveTab("digital-courtroom")}
            className={`flex-1 py-3 text-center relative z-10 text-[12px] uppercase tracking-[0.1em] font-medium transition-colors ${activeTab === "digital-courtroom" ? "text-[#332664]" : "text-[#cac4d1] hover:text-[#e3e0f8]"
              } ${spaceGrotesk.className}`}
          >
            Digital Courtroom
          </button>
        </div>

        {/* Dashboard Layout */}
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 lg:pb-12">
          {activeTab === "solo-vent" ? (
            <>
              {/* SOLO CHAT (Active Chat Area) */}
              <section className="lg:col-span-12 flex flex-col flex-1 w-full relative">
                <RiceeeChatClient partnerNames={partnerNames} spaceGrotesk={spaceGrotesk} inter={inter} />
              </section>
            </>
          ) : (
            <>
              {/* Full Digital Courtroom */}
              <section className="lg:col-span-12 flex flex-col min-h-[716px] bg-[rgba(30,30,47,0.4)] backdrop-blur-[24px] border border-white/10 rounded-xl relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%), rgba(30,30,47,0.4)' }}>
                <DigitalCourtroom isPreview={false} setActiveTab={setActiveTab} spaceGrotesk={spaceGrotesk} inter={inter} />
              </section>
            </>
          )}
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-20 pb-safe bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setActiveTab("solo-vent")}
          className={`flex flex-col items-center justify-center transition-colors ${activeTab === "solo-vent" ? "text-violet-200 drop-shadow-[0_0_12px_rgba(196,181,253,0.5)] scale-110" : "text-slate-600 opacity-60 hover:text-violet-400"}`}
        >
          <BrainCircuit className="w-6 h-6 mb-1" />
          <span className={`text-[10px] uppercase tracking-widest font-bold ${spaceGrotesk.className}`}>Hub</span>
        </button>
        <button
          onClick={() => setActiveTab("digital-courtroom")}
          className={`flex flex-col items-center justify-center transition-colors ${activeTab === "digital-courtroom" ? "text-violet-200 drop-shadow-[0_0_12px_rgba(196,181,253,0.5)] scale-110" : "text-slate-600 opacity-60 hover:text-violet-400"}`}
        >
          <Gavel className="w-6 h-6 mb-1" />
          <span className={`text-[10px] uppercase tracking-widest font-bold ${spaceGrotesk.className}`}>Verdicts</span>
        </button>
      </nav>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .custom-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}