"use client";

import { useState, useEffect } from "react";
import { Gavel, PlusCircle, MessageSquare, Clock, CheckCircle2, ChevronRight, AlertCircle, Send, Trash2, Sparkles, User } from "lucide-react";
import { getCases, fileCase, submitResponse, deleteCase } from "@/actions/courtroom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DigitalCourtroom({ partnerNames = ["User A", "User B"], poppins }) {
  const [cases, setCases] = useState([]);
  const [view, setView] = useState("list"); // list, file, respond, view
  const [activeCase, setActiveCase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newPerspective, setNewPerspective] = useState("");
  const [currentUserIdx, setCurrentUserIdx] = useState(0); // 0 or 1

  // Helper to resolve name from role or raw string
  const resolveName = (storedName) => {
    if (storedName === "P1") return partnerNames[0];
    if (storedName === "P2") return partnerNames[1];
    return storedName; // Fallback for old records
  };

  const currentUser = partnerNames[currentUserIdx];
  const currentUserRole = `P${currentUserIdx + 1}`;

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    setIsLoading(true);
    const res = await getCases();
    if (res.success) {
      setCases(res.data);
    }
    setIsLoading(false);
  }

  async function handleFileCase() {
    if (!newTitle || !newPerspective) return toast.error("Please fill all fields");
    setIsSubmitting(true);
    const res = await fileCase({ 
      title: newTitle, 
      perspective: newPerspective, 
      author: currentUserRole 
    });
    if (res.success) {
      toast.success("Case filed! Partner will be notified.");
      setNewTitle("");
      setNewPerspective("");
      setView("list");
      fetchCases();
    }
    setIsSubmitting(false);
  }

  async function handleSubmitResponse(caseId) {
    if (!newPerspective) return toast.error("Please describe your perspective");
    
    const loadingToast = toast.loading("AI Judge is analyzing both perspectives...");
    setIsSubmitting(true);
    
    try {
      const res = await submitResponse({ 
        caseId, 
        perspective: newPerspective, 
        author: currentUserRole 
      });

      if (res.success) {
        toast.success("Verdict delivered!", { id: loadingToast });
        setNewPerspective("");
        
        // Update local state immediately so user sees the result
        setActiveCase(res.data);
        setView("view");
        fetchCases(); // Refresh list in background
      } else {
        toast.error(res.error || "Failed to submit response", { id: loadingToast });
      }
    } catch (err) {
      toast.error("An unexpected error occurred", { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    const res = await deleteCase(id);
    if (res.success) {
      setCases(prev => prev.filter(c => c.id !== id));
      toast.success("Case removed");
    }
  }

  const openCases = cases.filter(c => c.status === "OPEN");
  const closedCases = cases.filter(c => c.status === "CLOSED");

  return (
    <div className={`bg-white rounded-3xl p-6 shadow-xl border border-stone-100 flex flex-col gap-6 h-auto min-h-[400px] overflow-hidden ${poppins?.className}`}>
      
      {/* STATIC NAVIGATION HEADER (Does not move) */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 min-h-[64px]">
        {view === "list" ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#9d4867]/10 flex items-center justify-center text-[#9d4867]">
                <Gavel size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-800">Digital Courtroom</h2>
                <p className="text-[11px] text-stone-400">Resolve disputes with AI-powered neutrality</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Dev Identity Switcher */}
              <div className="flex items-center bg-stone-50 rounded-xl p-1 border border-stone-100">
                {partnerNames.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => setCurrentUserIdx(idx)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                      currentUserIdx === idx 
                        ? "bg-white text-[#9d4867] shadow-sm ring-1 ring-stone-100" 
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setView("file")}
                className="flex items-center gap-2 px-4 py-2 bg-[#ffae88] text-[#9d4867] rounded-xl text-[11px] font-bold shadow-lg shadow-[#ffae88]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <PlusCircle size={16} />
                File New Case
              </button>
            </div>
          </>
        ) : (
          <>
            <button 
              onClick={() => setView("list")} 
              className="group text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-[#9d4867] flex items-center gap-2 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-[#9d4867]/10 group-hover:text-[#9d4867] transition-all">
                <ChevronRight size={12} className="rotate-180" /> 
              </div>
              Back to Dashboard
            </button>

            {view === "file" ? (
              <motion.button 
                whileHover={{ scale: 1.02, translateY: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFileCase}
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#ab4400] text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:shadow-2xl hover:shadow-[#ab4400]/30 active:scale-95 transition-all disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                {isSubmitting ? "Filing..." : "File Case"}
                <Send size={12} />
              </motion.button>
            ) : view === "respond" && activeCase?.sideAAuthor !== currentUserRole ? (
              <motion.button 
                whileHover={{ scale: 1.02, translateY: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSubmitResponse(activeCase.id)}
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#ab4400] text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:shadow-2xl hover:shadow-[#ab4400]/30 active:scale-95 transition-all disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                {isSubmitting ? "Judging..." : "Submit Response"}
                <Gavel size={14} />
              </motion.button>
            ) : <div />}
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col gap-6"
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#ffae88]" />
              </div>
            ) : cases.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
                <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center text-stone-200">
                  <Gavel size={30} />
                </div>
                <div className="max-w-xs">
                  <p className="text-stone-500 text-sm font-medium">The courtroom is quiet.</p>
                  <p className="text-[11px] text-stone-400 mt-1">Start a new case to resolve your conflict fairly.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Active Cases */}
                {openCases.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2 text-amber-500">
                      <Clock size={14} className="animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active Cases</span>
                    </div>
                    {openCases.map(c => (
                      <CaseCard 
                        key={c.id} 
                        caseData={c} 
                        onClick={() => {
                          setActiveCase(c);
                          setView("respond");
                        }}
                        onDelete={handleDelete}
                        resolveName={resolveName}
                      />
                    ))}
                  </div>
                )}

                {/* Closed Cases */}
                {closedCases.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2 text-emerald-500">
                      <CheckCircle2 size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Closed Cases</span>
                    </div>
                    {closedCases.map(c => (
                      <CaseCard 
                        key={c.id} 
                        caseData={c} 
                        onClick={() => {
                          setActiveCase(c);
                          setView("view");
                        }}
                        onDelete={handleDelete}
                        resolveName={resolveName}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : view === "file" ? (
          <motion.div 
            key="file"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col gap-6"
          >
             <div className="space-y-4">
                {/* Premium Notebook Style Form */}
                <div className="bg-white rounded-[2rem] border-2 border-[#ffae88]/40 overflow-hidden shadow-2xl shadow-stone-200/50 relative z-0 focus-within:ring-4 focus-within:ring-[#ffae88]/10 focus-within:border-[#ffae88]/60 transition-all duration-500">
                  <div className="flex border-b border-stone-100">
                    <div className="w-12 flex-shrink-0 bg-stone-50/50 flex items-center justify-center border-r border-stone-100">
                      <span className="text-[10px] font-bold font-mono text-[#ffae88]">01</span>
                    </div>
                    <div className="flex-1 p-5">
                      <input 
                        type="text"
                        placeholder="CASE TITLE: e.g. The Sunday Cleaning Dispute"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 outline-none text-stone-800 font-mono text-sm placeholder-stone-300 uppercase tracking-tight font-medium"
                      />
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="w-12 flex-shrink-0 bg-stone-50/50 flex items-center justify-center border-r border-stone-100">
                      <span className="text-[10px] font-bold font-mono text-[#ffae88]">02</span>
                    </div>
                    <div className="flex-1 p-5">
                      <textarea 
                        rows={6}
                        placeholder="YOUR PERSPECTIVE: Describe what happened in detail..."
                        value={newPerspective}
                        onChange={(e) => setNewPerspective(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 outline-none text-stone-600 font-mono text-sm placeholder-stone-300 resize-none leading-relaxed scrollbar-hide"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 px-1 py-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-stone-100" />
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-[#ffae88] animate-pulse" />
                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.2em]">Confidential Dispute Entry</p>
                  </div>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-stone-100" />
                </div>
             </div>
          </motion.div>
        ) : view === "respond" ? (
          <motion.div 
            key="respond"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col gap-6"
          >
             <div className="w-full space-y-4">
                {activeCase?.sideAAuthor === currentUserRole ? (
                  /* Waiting State for Author */
                  <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-stone-200 border-2 border-dashed border-stone-100">
                        <Clock size={24} className="animate-spin-slow" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#ffae88] text-white flex items-center justify-center shadow-lg">
                        <Sparkles size={12} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-stone-800">Waiting for Partner</h3>
                      <p className="text-xs text-stone-400 max-w-sm">
                        You've shared your side. We're now waiting for your partner to provide their independent perspective.
                      </p>
                    </div>
                    <div className="px-4 py-1.5 bg-stone-50 rounded-full border border-stone-100">
                       <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">Status: Pending Partner Input</span>
                    </div>
                  </div>
                ) : (
                  /* Input Form for Partner */
                  <div className="space-y-4">
                    <div className="bg-white rounded-[2rem] border-2 border-[#ffae88]/40 overflow-hidden shadow-2xl shadow-stone-200/50 relative z-0 focus-within:ring-4 focus-within:ring-[#ffae88]/10 focus-within:border-[#ffae88]/60 transition-all duration-500">
                      <div className="flex border-b border-stone-100">
                        <div className="w-12 flex-shrink-0 bg-stone-50/50 flex items-center justify-center border-r border-stone-100">
                          <span className="text-[10px] font-bold font-mono text-[#ffae88]">01</span>
                        </div>
                        <div className="flex-1 p-5">
                          <input 
                            type="text"
                            readOnly
                            value={`CASE TITLE: ${activeCase?.title}`}
                            className="w-full bg-transparent border-none focus:ring-0 outline-none text-stone-800 font-mono text-sm uppercase tracking-tight font-bold opacity-40 cursor-default"
                          />
                        </div>
                      </div>
                      <div className="flex">
                        <div className="w-12 flex-shrink-0 bg-stone-50/50 flex items-center justify-center border-r border-stone-100">
                          <span className="text-[10px] font-bold font-mono text-[#ffae88]">02</span>
                        </div>
                        <div className="flex-1 p-5">
                          <textarea 
                            rows={6}
                            placeholder="YOUR PERSPECTIVE: Describe what happened in detail..."
                            value={newPerspective}
                            onChange={(e) => setNewPerspective(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 outline-none text-stone-600 font-mono text-sm placeholder-stone-300 resize-none leading-relaxed scrollbar-hide"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 px-1 py-2">
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-stone-100" />
                      <div className="flex items-center gap-2">
                        <Sparkles size={12} className="text-[#ffae88] animate-pulse" />
                        <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.2em]">Confidential Dispute Entry</p>
                      </div>
                      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-stone-100" />
                    </div>
                  </div>
                )}
             </div>
          </motion.div>
        ) : (
          <motion.div 
            key="view"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col gap-6"
          >
            <JudgementView 
              caseData={activeCase} 
              partnerNames={partnerNames} 
              resolveName={resolveName} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CaseCard({ caseData, onClick, onDelete, resolveName }) {
  return (
    <div 
      onClick={onClick}
      className="p-5 bg-stone-50 border border-stone-100 rounded-2xl flex items-center justify-between hover:border-[#ffae88]/50 cursor-pointer transition-all hover:bg-white hover:shadow-lg group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          caseData.status === "OPEN" ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
        }`}>
          {caseData.status === "OPEN" ? <Clock size={18} /> : <CheckCircle2 size={18} />}
        </div>
        <div>
          <h4 className="font-bold text-stone-800 text-sm">{caseData.title}</h4>
          <p className="text-[10px] text-stone-400 mt-0.5">Filed by {resolveName(caseData.sideAAuthor)} • {new Date(caseData.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={(e) => onDelete(e, caseData.id)}
          className="p-2 text-stone-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={16} />
        </button>
        <ChevronRight size={18} className="text-stone-300 group-hover:text-[#ffae88] transition-colors" />
      </div>
    </div>
  );
}

function JudgementView({ caseData, partnerNames, resolveName }) {
  let j = {};
  try {
    j = JSON.parse(caseData.judgement || "{}");
  } catch (e) {
    j = { summary: caseData.judgement }; // Fallback for old cases
  }

  // Helper to replace placeholders in text
  const replacePlaceholders = (text) => {
    if (!text) return "";
    return text.replace(/{{P1}}/g, partnerNames[0]).replace(/{{P2}}/g, partnerNames[1]);
  };

  return (
    <div className="space-y-8 pb-6">
      {/* CASE HEADER */}
      <div className="text-center space-y-2">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em]">Case #{caseData.id?.slice(-6).toUpperCase()} • RESOLVED</div>
        <h2 className="text-2xl font-bold text-stone-800">{resolveName(caseData.sideAAuthor)} vs. {resolveName(caseData.sideBAuthor)}</h2>
        <p className="text-sm text-stone-400 italic">"{caseData.title}"</p>
      </div>

      {/* PERSPECTIVES SIDE BY SIDE */}
      <div className="grid lg:grid-cols-2 gap-6 relative items-stretch">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-400 z-10 hidden lg:flex shadow-sm">VS</div>
        
        <div className="bg-stone-50/50 rounded-[2rem] p-6 border border-stone-100 relative group hover:border-[#9d4867]/20 transition-all flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-bold text-stone-800">{resolveName(caseData.sideAAuthor)}</h4>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Plaintiff</span>
            </div>
            <div className="px-3 py-1 bg-[#9d4867]/10 text-[#9d4867] text-[9px] font-bold rounded-full">SIDE A</div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#9d4867] uppercase tracking-wider">The Perspective:</span>
              <p className="text-xs text-stone-600 leading-relaxed mt-1 italic">"{caseData.sideAPerspective}"</p>
            </div>
          </div>
          <div className="pt-4 border-t border-stone-200/50 mt-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider italic">Precedent: Heart-First Logic</span>
          </div>
        </div>

        <div className="bg-stone-50/50 rounded-[2rem] p-6 border border-stone-100 relative group hover:border-[#ffae88]/20 transition-all flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-bold text-stone-800">{resolveName(caseData.sideBAuthor)}</h4>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Defendant</span>
            </div>
            <div className="px-3 py-1 bg-[#ffae88]/20 text-[#ab4400] text-[9px] font-bold rounded-full">SIDE B</div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-[#ab4400] uppercase tracking-wider">The Perspective:</span>
              <p className="text-xs text-stone-600 leading-relaxed mt-1 italic">"{caseData.sideBPerspective}"</p>
            </div>
          </div>
          <div className="pt-4 border-t border-stone-200/50 mt-4">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider italic">Precedent: Practical Boundaries</span>
          </div>
        </div>
      </div>

      {/* AI VERDICT & ANALYSIS BANNER */}
      <div className="bg-[#fffbf8] rounded-[2.5rem] border border-[#ffdfcf] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-[#ffdfcf] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#ab4400] text-white flex items-center justify-center shadow-lg shadow-[#ab4400]/20">
               <Sparkles size={20} />
             </div>
             <div>
               <h3 className="text-lg font-bold text-stone-800">AI Verdict & Analysis</h3>
               <p className="text-[11px] text-stone-400 font-medium">Synthesized Neutral Recommendation</p>
             </div>
          </div>
          <div className="flex-1 max-w-xs space-y-2">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-stone-400">
               <span>{resolveName(caseData.sideAAuthor)} ({j.balance?.sideA || 50}%)</span>
               <span>{resolveName(caseData.sideBAuthor)} ({j.balance?.sideB || 50}%)</span>
            </div>
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden flex">
               <div style={{ width: `${j.balance?.sideA || 50}%` }} className="h-full bg-[#9d4867]" />
               <div style={{ width: `${j.balance?.sideB || 50}%` }} className="h-full bg-[#ab4400]" />
            </div>
          </div>
        </div>
        <div className="p-8">
           <h4 className="text-xl font-bold text-[#ab4400] mb-8">{j.verdict || "Evaluating..."}</h4>
           
           <div className="grid md:grid-cols-2 gap-12">
             <div className="space-y-4">
               <div className="flex items-center gap-2 text-stone-800">
                 <MessageSquare size={16} className="text-[#9d4867]" />
                 <h5 className="text-xs font-bold uppercase tracking-widest">Understanding</h5>
               </div>
               <p className="text-sm text-stone-600 leading-relaxed font-medium">
                 {replacePlaceholders(j.analysis?.understanding)}
               </p>
             </div>
             <div className="space-y-4">
               <div className="flex items-center gap-2 text-stone-800">
                 <Sparkles size={16} className="text-[#ab4400]" />
                 <h5 className="text-xs font-bold uppercase tracking-widest">Reasoning Analysis</h5>
               </div>
               <p className="text-sm text-stone-600 leading-relaxed font-medium">
                 {replacePlaceholders(j.analysis?.reasoning)}
               </p>
             </div>
           </div>

           <div className="mt-12 pt-12 border-t border-stone-100 grid md:grid-cols-2 gap-8">
             <div className="space-y-4">
               <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">{resolveName(caseData.sideAAuthor)}'s Strengths</h5>
               <ul className="space-y-3">
                 {j.strengths?.sideA?.map((s, idx) => (
                   <li key={idx} className="flex items-start gap-3 text-sm text-stone-600">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#9d4867] mt-1.5 flex-shrink-0" />
                     {replacePlaceholders(s)}
                   </li>
                 ))}
               </ul>
             </div>
             <div className="space-y-4">
               <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">{resolveName(caseData.sideBAuthor)}'s Strengths</h5>
               <ul className="space-y-3">
                 {j.strengths?.sideB?.map((s, idx) => (
                   <li key={idx} className="flex items-start gap-3 text-sm text-stone-600">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#ab4400] mt-1.5 flex-shrink-0" />
                     {replacePlaceholders(s)}
                   </li>
                 ))}
               </ul>
             </div>
           </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button className="px-6 py-2 border border-stone-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-50 transition-all">
          Download PDF Report
        </button>
        <button className="px-6 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all">
          Generate Heart Contract
        </button>
      </div>
    </div>
  );
}