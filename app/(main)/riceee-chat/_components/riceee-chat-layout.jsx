"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiceeeChatClient from "./riceee-chat-client";
import DigitalCourtroom from "./digital-courtroom";
import { Poppins } from "next/font/google";
import { Gavel, BrainCircuit, BarChart2, User, PanelLeft, Sparkles, MessageSquare, Clock, Star, X, Plus, Trash2 } from "lucide-react";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

import { getConversations, createConversation, deleteConversation, updateConversationTitle } from "@/actions/chat";

export default function RiceeeChatLayout({ partnerNames }) {
  const [activeTab, setActiveTab] = useState("solo-vent");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Conversation History State
  const [history, setHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load history on mount
  useEffect(() => {
    async function fetchHistory() {
      const res = await getConversations();
      if (res.success) {
        setHistory(res.data);
        if (res.data.length > 0) {
          setActiveChatId(res.data[0].id);
        }
      }
      setIsLoadingHistory(false);
    }
    fetchHistory();
  }, []);

  const handlePrepareNewChat = () => {
    // Only reset the UI state. 
    setActiveChatId(null);
  };

  const handlePerformCreateChat = async (titleArg = "New Conversation") => {
    try {
      const title = typeof titleArg === "string" ? titleArg : "New Conversation";
      const res = await createConversation(title);
      if (res.success) {
        setHistory(prev => [res.data, ...prev]);
        setActiveChatId(res.data.id);
        return res.data.id;
      }
    } catch (err) {
      console.error("Error creating chat:", err);
    }
    return null;
  };

  const handleDeleteChat = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await deleteConversation(id);
      if (res.success) {
        setHistory(prev => {
          const newHistory = prev.filter(chat => chat.id !== id);
          if (activeChatId === id) {
            if (newHistory.length > 0) {
              setActiveChatId(newHistory[0].id);
            } else {
              setActiveChatId(null);
            }
          }
          return newHistory;
        });
      }
    } catch (err) {
      console.error("Error in handleDeleteChat:", err);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleTitleUpdate = (id, newTitle) => {
    setHistory(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));
  };

  return (
    <div
      className={`fixed inset-0 pt-[84px] md:pt-[88px] bg-background text-foreground ${poppins.className} flex flex-col items-center overflow-hidden antialiased transition-all duration-300 ${isSidebarOpen ? "md:pl-[240px] lg:pl-[280px]" : "pl-0"}`}
      style={{ zIndex: 10 }}
    >

      {/* Floating Sidebar Toggle (Becomes a glassmorphic button) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-8 left-6 z-[60] p-2.5 rounded-xl transition-all duration-300 hidden md:flex items-center justify-center hover:scale-105 active:scale-95 border shadow-sm ${isSidebarOpen
          ? "bg-white border-stone-200 text-stone-900 shadow-md"
          : "bg-white/80 border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-white backdrop-blur-md"
          }`}
      >
        <PanelLeft size={22} className={`transition-transform duration-500 ${isSidebarOpen ? "rotate-180" : "rotate-0"}`} />
      </button>

      {/* Floating Sidebar Box - Mobile Friendly */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop for mobile/tablet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-[45]"
            />

            <motion.div
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-24 left-4 md:left-6 w-[320px] h-[calc(100vh-8rem)] z-50 flex flex-col bg-white/80 backdrop-blur-2xl border border-stone-200 shadow-2xl rounded-[32px] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <h2 className={`text-[11px] font-bold tracking-[0.2em] text-[#9d4867]/60 uppercase ${poppins.className}`}>
                  Conversations
                </h2>
              </div>

              {/* Action: New Chat */}
              <div className="px-4 mb-4">
                <button
                  onClick={handlePrepareNewChat}
                  className="flex items-center gap-3 w-full p-4 rounded-2xl bg-[#ffae88] text-[#9d4867] font-bold text-sm shadow-lg shadow-[#ffae88]/20 hover:scale-[1.02] active:scale-95 transition-all group"
                >
                  <Plus size={20} className="transition-transform group-hover:rotate-90" />
                  <span>Start New Chat</span>
                </button>
              </div>

              {/* Divider */}
              <div className="px-6 mb-2">
                <div className="h-px w-full bg-stone-100" />
              </div>

              {/* Recent Chats Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-6 py-2">
                  <span className={`text-[10px] font-bold text-stone-400 uppercase tracking-widest`}>Recent Chats</span>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                  {isLoadingHistory ? (
                    <div className="px-6 py-4 animate-pulse">
                      <div className="h-4 bg-stone-100 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-stone-100 rounded w-1/2" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <p className="text-xs text-stone-400 font-medium italic">No recent conversations</p>
                    </div>
                  ) : history.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setActiveChatId(chat.id)}
                      className={`flex items-center gap-3 w-full p-4 rounded-xl text-left transition-all group relative cursor-pointer ${
                        activeChatId === chat.id ? "bg-[#ffae88]/10 border border-[#ffae88]/20" : "hover:bg-stone-50 border border-transparent"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                        activeChatId === chat.id ? "bg-[#ffae88]/20 text-[#9d4867]" : "bg-stone-100 text-stone-400 group-hover:bg-[#ffae88]/20 group-hover:text-[#9d4867]"
                      }`}>
                        <MessageSquare size={16} />
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <p className={`text-[13px] font-medium truncate ${activeChatId === chat.id ? "text-[#9d4867]" : "text-stone-700"}`}>
                          {chat.title || "Untitled Chat"}
                        </p>
                        <p className="text-[10px] text-stone-400">{formatDate(chat.createdAt)}</p>
                      </div>
                      
                      {/* Trash Button */}
                      <button 
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="absolute right-3 p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Decoration */}
              <div className="p-6 bg-gradient-to-t from-stone-50 to-transparent">
                <p className="text-[10px] text-stone-400 text-center font-medium">Riceee AI v1.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center z-10 relative">

        {/* Premium Tab Switcher - Sticky at top with Sidebar Toggle */}
        <div className="w-fit min-w-[355px] mx-auto sticky top-0 md:top-2 mt-0 mb-6 flex items-center bg-[#ffae88]/10 backdrop-blur-md rounded-full p-1 z-30 shadow-inner border border-[#ffae88]/20">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2.5 rounded-full transition-all duration-300 ${isSidebarOpen ? "bg-white text-[#9d4867] shadow-sm" : "text-[#9d4867]/60 hover:text-[#9d4867] hover:bg-white/40"}`}
          >
            <PanelLeft size={20} className={`transition-transform duration-500 ${isSidebarOpen ? "rotate-180" : "rotate-0"}`} />
          </button>

          <div className="flex-1 flex relative h-full">
            <motion.div
              className="absolute top-0 bottom-0 w-1/2 bg-white rounded-full shadow-sm border border-[#ffae88]/20 z-0"
              initial={false}
              animate={{ left: activeTab === "solo-vent" ? "0%" : "50%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              onClick={() => setActiveTab("solo-vent")}
              className={`flex-1 py-3 text-center relative z-10 text-[12px] uppercase tracking-[0.1em] font-medium transition-colors ${activeTab === "solo-vent" ? "text-[#9d4867]" : "text-[#9d4867]/50 hover:text-[#9d4867]"
                } ${poppins.className}`}
            >
              CHAT
            </button>
            <button
              onClick={() => setActiveTab("digital-courtroom")}
              className={`flex-1 py-3 text-center relative z-10 text-[12px] uppercase tracking-[0.1em] font-medium transition-colors ${activeTab === "digital-courtroom" ? "text-[#9d4867]" : "text-[#9d4867]/50 hover:text-[#9d4867]"
                } ${poppins.className}`}
            >
              Courtroom
            </button>
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-32 lg:pb-6">
          {activeTab === "solo-vent" ? (
            <>
              {/* SOLO CHAT (Active Chat Area) */}
              <section className="lg:col-span-12 flex flex-col flex-1 w-full relative">
                <RiceeeChatClient
                  activeChatId={activeChatId}
                  poppins={poppins}
                  onTitleUpdate={handleTitleUpdate}
                  onCreateChat={handlePerformCreateChat}
                />
              </section>
            </>
          ) : (
            <>
              {/* Full Digital Courtroom */}
              <section className="lg:col-span-12 flex flex-col items-center overflow-visible">
                <div className="w-full max-w-6xl">
                  <DigitalCourtroom partnerNames={partnerNames} poppins={poppins} />
                </div>
              </section>
            </>
          )}
        </div>
      </main>



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