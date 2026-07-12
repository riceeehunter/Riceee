"use client";

import { useState, useEffect, useRef } from "react";
import { Gavel, PlusCircle, MessageSquare, Clock, CheckCircle2, ChevronRight, AlertCircle, Send, Trash2, Sparkles, User, ScrollText, Feather, Heart } from "lucide-react";
import {
  getCases,
  fileCase,
  submitResponse,
  deleteCase,
  generateHeartContract,
  signHeartContract,
} from "@/actions/courtroom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { plusJakarta, signature } from "@/lib/fonts";

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
    <div className={`flex-1 w-full max-w-5xl mx-auto flex flex-col gap-8 pb-4 px-4 md:px-6 ${poppins?.className}`}>
      
      {/* Premium Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        {view === "list" ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#9d4867]/10 flex items-center justify-center text-[#9d4867] flex-shrink-0">
                <Gavel size={20} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-stone-800 tracking-tight leading-none">Courtroom</h2>
                <p className="text-[11px] text-stone-400 font-medium mt-1.5 leading-none">Resolve disputes with AI neutrality</p>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-11 md:ml-0">
              {/* Minimalist Identity Switcher */}
              <div className="flex items-center bg-stone-100/50 backdrop-blur-sm rounded-full p-1 border border-stone-200/20">
                {partnerNames.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => setCurrentUserIdx(idx)}
                    className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all ${
                      currentUserIdx === idx 
                        ? "bg-white text-[#9d4867] shadow-sm" 
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setView("file")}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#ab4400] text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-[#ab4400]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <PlusCircle size={14} />
                New Case
              </button>
            </div>
          </>
        ) : (
          <>
            <button 
              onClick={() => setView("list")} 
              className="group text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:text-[#9d4867] flex items-center gap-2 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-[#9d4867]/10 group-hover:text-[#9d4867] transition-all">
                <ChevronRight size={14} className="rotate-180" /> 
              </div>
              Back to Courtroom
            </button>

            {view === "file" ? null : view === "respond" && activeCase?.sideAAuthor !== currentUserRole ? null : <div />}
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
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ab4400]" />
              </div>
            ) : cases.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-20">
                <div className="w-20 h-20 rounded-full bg-[#ab4400]/5 flex items-center justify-center border border-[#ab4400]/10 shadow-inner">
                  <Gavel size={40} className="text-[#ab4400]/30 stroke-[1.5]" />
                </div>
                <div className="space-y-2">
                  <p className="text-stone-800 text-lg font-bold">The courtroom is quiet</p>
                  <p className="text-sm text-stone-400 max-w-xs mx-auto leading-relaxed">Everything seems peaceful for now. Start a new case if you need help resolving a conflict fairly.</p>
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
                        rows={12}
                        placeholder="YOUR PERSPECTIVE: Describe what happened in detail..."
                        value={newPerspective}
                        onChange={(e) => setNewPerspective(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 outline-none text-stone-600 font-mono text-sm placeholder-stone-300 resize-none leading-relaxed scrollbar-hide"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center justify-center gap-3 w-full">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-stone-100" />
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-[#ffae88] animate-pulse" />
                      <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.2em]">Confidential Dispute Entry</p>
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-stone-100" />
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFileCase}
                    disabled={isSubmitting}
                    className="px-10 py-3 bg-[#ab4400] text-white rounded-full font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-[#ab4400]/20 hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Filing..." : "File Case"}
                    <Send size={12} />
                  </motion.button>
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
                            rows={12}
                            placeholder="YOUR PERSPECTIVE: Describe what happened in detail..."
                            value={newPerspective}
                            onChange={(e) => setNewPerspective(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 outline-none text-stone-600 font-mono text-sm placeholder-stone-300 resize-none leading-relaxed scrollbar-hide"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                      <div className="flex items-center justify-center gap-3 w-full">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-stone-100" />
                        <div className="flex items-center gap-2">
                          <Sparkles size={12} className="text-[#ffae88] animate-pulse" />
                          <p className="text-[9px] text-stone-400 font-bold uppercase tracking-[0.2em]">Confidential Dispute Entry</p>
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-stone-100" />
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubmitResponse(activeCase.id)}
                        disabled={isSubmitting}
                        className="px-10 py-3 bg-[#9d4867] text-white rounded-full font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg shadow-[#9d4867]/20 hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? "Judging..." : "Submit Response"}
                        <Gavel size={14} />
                      </motion.button>
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
              currentUserRole={currentUserRole}
              onCaseUpdate={(updated) => {
                setActiveCase(updated);
                setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
              }}
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

function JudgementView({ caseData, partnerNames, resolveName, currentUserRole, onCaseUpdate }) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const contractRef = useRef(null);

  let j = {};
  try {
    j = JSON.parse(caseData.judgement || "{}");
  } catch (e) {
    j = { summary: caseData.judgement };
  }

  let contract = null;
  try {
    contract = caseData.contract ? JSON.parse(caseData.contract) : null;
  } catch {
    contract = null;
  }

  const handleDraftContract = async () => {
    setIsDrafting(true);
    const loading = toast.loading("The Clerk is drawing up your terms...");
    const res = await generateHeartContract(caseData.id);
    setIsDrafting(false);

    if (res.success) {
      toast.success("Heart Contract drafted", { id: loading });
      onCaseUpdate(res.data);
      setTimeout(() => contractRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } else {
      toast.error(res.error || "The Clerk couldn't draft it", { id: loading });
    }
  };

  // You sign your own line only — whichever side you're currently acting as
  const mySide = currentUserRole === caseData.sideAAuthor ? "A" : "B";
  const myField = mySide === "A" ? "sideASignedAt" : "sideBSignedAt";
  const iHaveSigned = Boolean(caseData[myField]);
  const bothSigned = Boolean(caseData.sideASignedAt && caseData.sideBSignedAt);

  const handleSign = async () => {
    setIsSigning(true);
    const res = await signHeartContract(caseData.id, mySide);
    setIsSigning(false);

    if (res.success) {
      onCaseUpdate(res.data);
      const nowBoth = Boolean(res.data.sideASignedAt && res.data.sideBSignedAt);
      toast.success(nowBoth ? "Sealed. Both of you signed." : "Signed — waiting for your partner.");
    } else {
      toast.error(res.error || "Couldn't sign");
    }
  };

  const replacePlaceholders = (text) => {
    if (!text) return "";
    return text.replace(/{{P1}}/g, partnerNames[0]).replace(/{{P2}}/g, partnerNames[1]);
  };

  return (
    <div className="space-y-8 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 🏛️ CINEMATIC VERDICT HERO */}
      <div className="relative py-6 flex flex-col items-center text-center space-y-6 overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#ab4400]/10 blur-[100px] rounded-full animate-pulse" />
        
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ab4400] text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-[#ab4400]/20">
            <Sparkles size={12} className="animate-spin-slow" />
            Final Verdict
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            The Decision <br />
            <span className="text-[#ab4400]">Is Delivered</span>
          </h2>
        </div>

        <div className="flex flex-col items-center space-y-1">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.4em]">Case Reference</p>
          <div className="px-6 py-2 bg-stone-100 rounded-2xl border border-stone-200/50 text-xs font-mono font-bold text-stone-600 shadow-inner">
            #{caseData.id?.slice(-8).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ⚖️ BALANCE OF JUSTICE VISUALIZER */}
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-end px-2">
          <div className="text-left">
            <p className="text-[10px] font-black text-[#9d4867] uppercase tracking-widest mb-1">{resolveName(caseData.sideAAuthor)}</p>
            <div className="text-3xl font-black text-[#9d4867]">{j.balance?.sideA || 50}%</div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-[#ab4400] uppercase tracking-widest mb-1">{resolveName(caseData.sideBAuthor)}</p>
            <div className="text-3xl font-black text-[#ab4400]">{j.balance?.sideB || 50}%</div>
          </div>
        </div>
        
        <div className="h-4 w-full bg-stone-100 rounded-full p-1 border border-stone-200/50 shadow-inner overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${j.balance?.sideA || 50}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-full bg-gradient-to-r from-[#9d4867] to-[#9d4867]/80 rounded-l-full relative"
          >
             <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </motion.div>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${j.balance?.sideB || 50}%` }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
            className="h-full bg-gradient-to-l from-[#ab4400] to-[#ab4400]/80 rounded-r-full relative"
          >
             <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </motion.div>
        </div>
        
        <p className="text-center text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] italic">Neutrality Weight Distribution</p>
      </div>

      {/* 📖 SIDE-BY-SIDE TESTIMONIES */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-[2rem] p-6 border border-[#9d4867]/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-500">
             <MessageSquare size={48} className="text-[#9d4867]" />
          </div>
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-[#9d4867] uppercase tracking-widest px-2 py-0.5 bg-[#9d4867]/5 rounded-full">Side A Statement</span>
            </div>
            <h5 className="text-sm font-bold text-stone-800">{resolveName(caseData.sideAAuthor)}'s Perspective</h5>
            <p className="text-xs text-stone-500 leading-relaxed italic">
              "{caseData.sideAPerspective}"
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 border border-[#ab4400]/10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-500">
             <MessageSquare size={48} className="text-[#ab4400]" />
          </div>
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-[#ab4400] uppercase tracking-widest px-2 py-0.5 bg-[#ab4400]/5 rounded-full">Side B Statement</span>
            </div>
            <h5 className="text-sm font-bold text-stone-800">{resolveName(caseData.sideBAuthor)}'s Perspective</h5>
            <p className="text-xs text-stone-500 leading-relaxed italic">
              "{caseData.sideBPerspective}"
            </p>
          </div>
        </div>
      </div>

      {/* 💬 THE CORE VERDICT CARD */}
      <div className="bg-white rounded-[3rem] border-2 border-[#ab4400]/10 overflow-hidden shadow-2xl shadow-[#ab4400]/5 relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
          <Gavel size={120} />
        </div>
        
        <div className="p-8 md:p-12 space-y-10 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-[#ab4400]/10 flex items-center justify-center text-[#ab4400]">
                 <Gavel size={20} />
               </div>
               <h3 className="text-xs font-bold text-stone-400 uppercase tracking-[0.3em]">AI Summary</h3>
            </div>
            <h4 className="text-2xl md:text-3xl font-bold text-stone-800 leading-tight">
              {j.verdict || "The Court has spoken."}
            </h4>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#9d4867] rounded-full" />
                <h5 className="text-[10px] font-black uppercase tracking-widest text-stone-900">The Understanding</h5>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed font-medium">
                {replacePlaceholders(j.analysis?.understanding)}
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#ab4400] rounded-full" />
                <h5 className="text-[10px] font-black uppercase tracking-widest text-stone-900">Strategic Reasoning</h5>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed font-medium">
                {replacePlaceholders(j.analysis?.reasoning)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 PERSPECTIVE BREAKDOWN GRID */}
      <div className="grid lg:grid-cols-2 gap-8 items-stretch">
        {/* SIDE A CARD */}
        <div className="group relative">
           <div className="absolute inset-0 bg-[#9d4867]/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="relative h-full bg-white rounded-[2.5rem] p-8 border border-stone-100 flex flex-col gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="px-3 py-1 bg-[#9d4867]/10 text-[#9d4867] text-[9px] font-black rounded-full uppercase tracking-widest">Plaintiff Strengths</span>
                  <h4 className="text-lg font-bold text-stone-800">{resolveName(caseData.sideAAuthor)}</h4>
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-[#9d4867] border border-stone-100">
                  <User size={18} />
                </div>
              </div>
              
              <div className="space-y-4">
                {j.strengths?.sideA?.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-[#9d4867]/[0.02] border border-[#9d4867]/5">
                    <div className="w-5 h-5 rounded-full bg-[#9d4867] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-lg shadow-[#9d4867]/20">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed font-medium italic">"{replacePlaceholders(s)}"</p>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* SIDE B CARD */}
        <div className="group relative">
           <div className="absolute inset-0 bg-[#ab4400]/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="relative h-full bg-white rounded-[2.5rem] p-8 border border-stone-100 flex flex-col gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="px-3 py-1 bg-[#ab4400]/10 text-[#ab4400] text-[9px] font-black rounded-full uppercase tracking-widest">Defendant Strengths</span>
                  <h4 className="text-lg font-bold text-stone-800">{resolveName(caseData.sideBAuthor)}</h4>
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-[#ab4400] border border-stone-100">
                  <User size={18} />
                </div>
              </div>
              
              <div className="space-y-4">
                {j.strengths?.sideB?.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-[#ab4400]/[0.02] border border-[#ab4400]/5">
                    <div className="w-5 h-5 rounded-full bg-[#ab4400] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-lg shadow-[#ab4400]/20">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed font-medium italic">"{replacePlaceholders(s)}"</p>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* 📜 THE HEART CONTRACT */}
      <div ref={contractRef} className="w-full pt-12 border-t border-stone-100">
        {!contract ? (
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-stone-900 flex items-center justify-center shadow-lg">
                <div className="text-[11px] font-black text-white">N</div>
              </div>
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">Certified Neutral Outcome</span>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className={`${plusJakarta.className} text-2xl font-black tracking-tight text-stone-800`}>
                A verdict is just words.
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Turn it into terms you both actually sign — specific, checkable, and binding until the next fight.
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDraftContract}
              disabled={isDrafting}
              className="group px-10 py-4 bg-stone-900 text-white rounded-full text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-stone-900/20 disabled:opacity-60 flex items-center gap-3"
            >
              <Feather size={14} className={isDrafting ? "animate-pulse" : "group-hover:-rotate-12 transition-transform"} />
              {isDrafting ? "Drawing up terms…" : "Draft the Heart Contract"}
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-3xl"
          >
            {/* Parchment */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-[#e8ddc8] bg-gradient-to-b from-[#fffdf7] to-[#fdf6e8] shadow-[0_30px_80px_rgba(120,90,40,0.16)]">
              {/* Ruled margin line, like a real legal page */}
              <div className="pointer-events-none absolute inset-y-0 left-10 w-px bg-[#e2b98f]/30 hidden sm:block" />

              {bothSigned && (
                <div className="pointer-events-none absolute right-6 top-24 sm:right-12 z-20 -rotate-12">
                  <div className="flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-full border-[3px] border-dashed border-[#9d4867]/50 text-[#9d4867]/70">
                    <Heart size={16} className="fill-[#9d4867]/40" />
                    <span className="mt-1 text-[8px] font-black uppercase tracking-[0.18em]">Sealed</span>
                    <span className="text-[7px] font-bold tracking-[0.12em]">
                      {new Date(caseData.sideBSignedAt > caseData.sideASignedAt ? caseData.sideBSignedAt : caseData.sideASignedAt)
                        .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                        .toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              <div className="relative z-10 p-8 sm:p-12 space-y-8">
                {/* Letterhead */}
                <div className="text-center space-y-3 pb-6 border-b border-[#e8ddc8]">
                  <div className="inline-flex items-center gap-2 text-[#9d4867]">
                    <ScrollText size={14} />
                    <span className="text-[9px] font-black uppercase tracking-[0.35em]">The Heart Contract</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900 leading-tight px-2">
                    {contract.title}
                  </h2>
                  <p className="mx-auto max-w-xl text-[13px] italic leading-relaxed text-stone-500">
                    {contract.preamble}
                  </p>
                </div>

                {/* Clauses */}
                <div className="space-y-4">
                  {contract.clauses?.map((clause, idx) => {
                    const isBoth = clause.owner === "BOTH";
                    const ownerName = isBoth
                      ? "Both of us"
                      : clause.owner === "A"
                        ? resolveName(caseData.sideAAuthor)
                        : resolveName(caseData.sideBAuthor);
                    const accent = isBoth ? "#8a6d00" : clause.owner === "A" ? "#9d4867" : "#ab4400";
                    const wash = isBoth ? "#fff8e8" : clause.owner === "A" ? "#fff1f6" : "#fff4ec";

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + idx * 0.09 }}
                        className="flex gap-4 rounded-2xl border border-[#eee2cd] bg-white/70 p-5 hover:bg-white transition-colors"
                      >
                        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm"
                            style={{ backgroundColor: accent }}
                          >
                            {idx + 1}
                          </span>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-black tracking-tight text-stone-900">{clause.heading}</h4>
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]"
                              style={{ backgroundColor: wash, color: accent }}
                            >
                              {ownerName}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-stone-600">{clause.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Forfeit */}
                {contract.penalty && (
                  <div className="rounded-2xl border border-dashed border-[#e2b98f]/70 bg-[#fffaf0] p-5">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-[#8a6d00]">
                      Should a clause be broken
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-stone-700">{contract.penalty}</p>
                  </div>
                )}

                {/* Oath */}
                {contract.oath && (
                  <p className="px-4 text-center text-lg sm:text-xl font-bold italic leading-relaxed text-stone-800">
                    “{contract.oath}”
                  </p>
                )}

                {/* Signatures */}
                <div className="grid gap-5 pt-4 sm:grid-cols-2">
                  {[
                    { side: "A", name: resolveName(caseData.sideAAuthor), signedAt: caseData.sideASignedAt, accent: "#9d4867" },
                    { side: "B", name: resolveName(caseData.sideBAuthor), signedAt: caseData.sideBSignedAt, accent: "#ab4400" },
                  ].map((party) => {
                    const isMine = party.side === mySide;
                    return (
                      <div key={party.side} className="flex flex-col items-center gap-2">
                        <div className="flex h-14 w-full items-end justify-center border-b-2 border-stone-300 pb-1">
                          {party.signedAt ? (
                            <motion.span
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className={`${signature.className} -mb-1 text-4xl font-bold -rotate-2`}
                              style={{ color: party.accent }}
                            >
                              {party.name}
                            </motion.span>
                          ) : isMine ? (
                            <button
                              onClick={handleSign}
                              disabled={isSigning}
                              className="mb-1 rounded-full border border-stone-300 bg-white px-5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-stone-600 shadow-sm transition-all hover:border-stone-900 hover:text-stone-900 active:scale-95 disabled:opacity-50"
                            >
                              {isSigning ? "Signing…" : "Sign here"}
                            </button>
                          ) : (
                            <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-300">
                              Awaiting signature
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-700">{party.name}</p>
                          <p className="text-[9px] font-medium text-stone-400">
                            {party.signedAt
                              ? new Date(party.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Not yet signed"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {bothSigned && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-2 text-center text-[10px] font-black uppercase tracking-[0.28em] text-[#9d4867]"
                  >
                    In force until you both say otherwise
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}