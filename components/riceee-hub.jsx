"use client";

import React, { useState, useEffect, useRef } from "react";
import { VerdictCard } from "./verdict-card";

export function RiceeeHub() {
  const [activeTab, setActiveTab] = useState("vent");
  const [messages, setMessages] = useState([
    { id: 1, text: "It's completely valid to feel disrespected when an agreed-upon boundary is crossed, especially repeatedly. The dishes are likely a proxy for feeling unheard. Let's explore that feeling of disrespect further. Have you communicated how this specific action impacts your perception of their respect for you?", sender: "ai" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const [caseState, setCaseState] = useState("idle");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "vent") scrollToBottom();
  }, [messages, activeTab]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newMsg = { id: Date.now(), text: inputValue, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: "I hear you. Let's dig deeper into that.", sender: "ai" }]);
    }, 1200);
  };

  const handleFileDispute = () => {
    setCaseState("pending");
    setTimeout(() => {
      setCaseState("ready");
    }, 3500);
  };

  return (
    <div className="flex-grow w-full flex flex-col relative font-sans -mt-8">
      
      {/* Mode Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 sticky top-[88px] z-40 bg-[#faf8f5]/90 backdrop-blur-md py-4 rounded-b-3xl">
        <button 
          onClick={() => setActiveTab('vent')}
          className={`rounded-xl p-4 flex items-center justify-center gap-3 transition-all duration-300 ${
            activeTab === 'vent' 
              ? 'bg-white shadow-md border border-[#ab4400]/20 opacity-100 scale-100' 
              : 'bg-white/50 border border-transparent shadow-sm opacity-80 scale-95 hover:bg-white'
          }`}
        >
          <span className={`material-symbols-outlined ${activeTab === 'vent' ? 'text-[#ab4400]' : 'text-[#66645e]'}`} style={{ fontVariationSettings: activeTab === 'vent' ? "'FILL' 1" : "'FILL' 0" }}>chat_bubble</span>
          <span className={`text-[24px] font-medium ${activeTab === 'vent' ? 'text-[#ab4400]' : 'text-[#66645e]'}`}>SOLO CHAT</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('court');
            if (caseState === 'idle') handleFileDispute(); // auto-start for demo
          }}
          className={`rounded-xl p-4 flex items-center justify-center gap-3 transition-all duration-300 ${
            activeTab === 'court' 
              ? 'bg-white shadow-md border border-[#ab4400]/20 opacity-100 scale-100' 
              : 'bg-white/50 border border-transparent shadow-sm opacity-80 scale-95 hover:bg-white'
          }`}
        >
          <span className={`material-symbols-outlined ${activeTab === 'court' ? 'text-[#ab4400]' : 'text-[#66645e]'}`} style={{ fontVariationSettings: activeTab === 'court' ? "'FILL' 1" : "'FILL' 0" }}>balance</span>
          <span className={`text-[24px] font-medium ${activeTab === 'court' ? 'text-[#ab4400]' : 'text-[#66645e]'}`}>Digital Courtroom</span>
        </button>
      </div>

      {/* SOLO CHAT Canvas */}
      {activeTab === 'vent' && (
        <div className="flex-grow flex flex-col gap-6 relative z-10 animate-in fade-in duration-300">
          <div className="text-center py-4">
            <span className="text-[12px] font-bold text-[#ab4400]/50 uppercase tracking-widest">Today, 10:42 PM</span>
          </div>

          <div className="flex flex-col gap-8 flex-grow pb-48">
            {/* User message (Initial static) */}
            <div className="flex flex-col items-end w-full">
              <div className="p-5 max-w-[85%] md:max-w-[70%] border bg-white rounded-2xl rounded-tr-sm border-r-4 border-r-[#ab4400] border-[#e5e5e5] shadow-sm">
                <p className="text-[18px] text-[#393832] leading-relaxed">
                  I just can't believe they left the dishes in the sink AGAIN. We agreed on this. It feels like they just don't respect my time or the space we share. Am I overreacting?
                </p>
              </div>
              <span className="text-[12px] font-bold text-[#66645e] uppercase tracking-widest mt-2 mr-2">You</span>
            </div>

            {/* Render dynamically added messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col w-full animate-in slide-in-from-bottom-4 duration-500 ${msg.sender === 'user' ? 'items-end' : 'items-start relative'}`}>
                {msg.sender === 'ai' && (
                  <div className="absolute -left-12 top-2 hidden md:flex h-8 w-8 rounded-full bg-[#ab4400]/10 items-center justify-center border border-[#ab4400]/20">
                    <span className="material-symbols-outlined text-[#ab4400] text-[16px]">psychology</span>
                  </div>
                )}
                
                <div className={`p-5 max-w-[85%] md:max-w-[70%] border ${
                  msg.sender === 'user' 
                    ? 'bg-white rounded-2xl rounded-tr-sm border-r-4 border-r-[#ab4400] border-[#e5e5e5] shadow-sm' 
                    : 'bg-[#ab4400]/5 rounded-2xl rounded-tl-sm border-[#ab4400]/20 shadow-sm'
                }`}>
                  <p className="text-[18px] text-[#393832] leading-relaxed">
                    {msg.text}
                  </p>
                </div>
                <span className={`text-[12px] font-bold uppercase tracking-widest mt-2 ${msg.sender === 'user' ? 'mr-2 text-[#66645e]' : 'ml-2 text-[#ab4400]'}`}>
                  {msg.sender === 'user' ? 'You' : 'Riceee AI'}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Fixed bottom input container to ensure no overlapping */}
          <div className="fixed bottom-0 left-0 right-0 pt-6 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5]/95 to-transparent pb-8 z-40">
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 relative">
              <textarea 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-white text-[#393832] text-[18px] rounded-t-xl rounded-b-none border-0 border-b-2 border-[#e5e5e5] focus:border-[#ab4400] focus:ring-0 resize-none p-4 min-h-[120px] placeholder:text-[#66645e]/50 shadow-lg shadow-black/5 transition-colors outline-none" 
                placeholder="Speak your truth..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <div className="absolute bottom-8 right-8 md:right-12 flex gap-2">
                <button type="button" className="p-2 rounded-full hover:bg-black/5 transition-colors text-[#66645e]">
                  <span className="material-symbols-outlined">mic</span>
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="p-2 rounded-full bg-[#ab4400] text-white hover:bg-[#8f3900] transition-colors flex items-center justify-center shadow-[0_4px_15px_rgba(171,68,0,0.3)] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courtroom Canvas */}
      {activeTab === 'court' && (
        <div className="flex-col gap-6 mt-6 border-t border-[#e5e5e5] pt-12 animate-in fade-in duration-300 flex pb-12">
          <h2 className="text-[48px] font-bold text-[#ab4400] mb-4 tracking-tight">Case Docket #8492</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Status Dashboard */}
            <div className="md:col-span-8 flex flex-col gap-6">
              <div className="bg-white rounded-xl p-8 relative overflow-hidden border border-[#e5e5e5] shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ab4400]/10 blur-[40px] rounded-full pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[32px] font-semibold text-[#393832]">The Sink Dispute</h3>
                  <span className="px-3 py-1 rounded-full bg-[#faf8f5] border border-[#e5e5e5] text-[12px] font-bold tracking-widest uppercase text-[#66645e]">Pending</span>
                </div>
                
                <div className="bg-[#faf8f5] border border-[#e5e5e5] rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ab4400] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ab4400]"></span>
                    </div>
                    <p className="text-[16px] text-[#ab4400] font-medium">Waiting for Partner's Perspective...</p>
                  </div>
                  <div className="w-full bg-[#e5e5e5] rounded-full h-1.5 mt-4">
                    <div className="bg-[#ab4400] h-1.5 rounded-full w-1/2 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button className="px-6 py-3 rounded-lg bg-white border border-[#e5e5e5] text-[#393832] font-medium hover:bg-[#faf8f5] transition-colors flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined">edit_document</span>
                    Append Evidence
                  </button>
                  <button className="px-6 py-3 rounded-lg bg-[#ab4400]/10 text-[#ab4400] border border-[#ab4400]/30 font-medium hover:bg-[#ab4400]/20 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined">notifications_active</span>
                    Nudge Partner
                  </button>
                </div>
              </div>
            </div>

            {/* Ready Verdict Sidebar */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-xl p-6 flex flex-col items-center text-center justify-center min-h-[300px] border border-[#e5e5e5] opacity-60 grayscale shadow-sm">
                <span className="material-symbols-outlined text-[64px] text-[#938f9a] mb-4">verified</span>
                <h4 className="text-[24px] font-medium text-[#938f9a] mb-2">Seal of Justice</h4>
                <p className="text-[16px] text-[#938f9a]">Verdict will be sealed until both testimonies are submitted.</p>
              </div>
            </div>
          </div>
          
          {/* Verdict Card pops in when ready */}
          {caseState === 'ready' && (
            <div className="mt-12 animate-in slide-in-from-bottom-12 fade-in duration-1000">
              <VerdictCard />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
