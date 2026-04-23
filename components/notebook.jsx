"use client"
import React, { useEffect, useRef, useState } from "react";
import { saveChatCell, getConversation, updateConversationTitle } from "@/actions/chat";

export default function Notebook({ activeChatId, onTitleUpdate, onCreateChat }) {
  const [cells, setCells] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const prevChatIdRef = useRef(activeChatId);
  const nextId = useRef(2);
  const inputRefs = useRef({});
  const endRef = useRef(null);

  // Load existing cells from DB
  useEffect(() => {
    async function loadChat() {
      // If we just transitioned from null to a real ID, we likely already have the cells 
      // (from the lazy creation logic below). Skip the redundant DB fetch.
      if (!prevChatIdRef.current && activeChatId) {
        prevChatIdRef.current = activeChatId;
        return;
      }
      
      prevChatIdRef.current = activeChatId;

      if (!activeChatId) {
        setCells([{ id: 1, content: "", status: "editing", response: null }]);
        setIsInitialLoading(false);
        return;
      }

      setIsInitialLoading(true);
      const res = await getConversation(activeChatId);
      if (res.success && res.data) {
        if (res.data.cells && res.data.cells.length > 0) {
          const loadedCells = res.data.cells.map(c => ({
            id: c.id,
            content: c.content,
            status: "submitted",
            response: { content: c.response, status: "done" }
          }));
          setCells([...loadedCells, { id: "new-" + Date.now(), content: "", status: "editing", response: null }]);
        } else {
          setCells([{ id: 1, content: "", status: "editing", response: null }]);
        }
      }
      setIsInitialLoading(false);
    }
    loadChat();
  }, [activeChatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cells]);

  // Focus the latest editing input whenever cells change
  useEffect(() => {
    const lastEditing = [...cells].reverse().find((c) => c.status === "editing");
    if (lastEditing) {
      const el = inputRefs.current[lastEditing.id];
      setTimeout(() => el && el.focus(), 70);
    }
  }, [cells]);

  function updateCell(id, patch) {
    setCells((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function handleChange(id, val) {
    updateCell(id, { content: val });
  }

  async function handleRun(id) {
    const cell = cells.find((c) => c.id === id);
    if (!cell || !cell.content.trim() || cell.status !== "editing") return;

    // mark input submitted and set response to loading
    updateCell(id, { 
      status: "submitted",
      response: { content: "", status: "loading" }
    });

    // simulate AI work
    setTimeout(async () => {
      const answer = `This is a response for: ${cell.content.trim()}`;
      let currentChatId = activeChatId;

      // If no active chat, create one now
      if (!currentChatId && onCreateChat) {
        currentChatId = await onCreateChat(cell.content.trim());
      }

      // Update UI immediately for responsiveness
      updateCell(id, {
        response: { content: answer, status: "done" }
      });

      // add a fresh input cell below immediately
      setCells((prev) => [
        ...prev,
        { id: Date.now(), content: "", status: "editing", response: null },
      ]);

      if (currentChatId) {
        // Save to DB in background
        saveChatCell({
          conversationId: currentChatId,
          content: cell.content.trim(),
          response: answer,
          order: cells.length
        }).then((res) => {
          if (!res.success) console.error("Auto-save failed:", res.error);
        });

        // If it's the first cell, update the conversation title
        if (cells.length === 1) {
          const title = cell.content.trim().substring(0, 30) + (cell.content.length > 30 ? "..." : "");
          updateConversationTitle(currentChatId, title).then(() => {
            if (onTitleUpdate) onTitleUpdate(currentChatId, title);
          });
        }
      }
    }, 500 + Math.min(600, cell.content.length * 5));
  }

  function handleKeyDown(e, id) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRun(id);
    }
  }

  if (isInitialLoading) {
    return (
      <div className="w-[calc(100%-3rem)] max-w-5xl mx-auto space-y-6 pb-20 mt-10">
        <div className="animate-pulse bg-white rounded-xl h-24 border border-cell-border shadow-sm flex items-center px-10">
          <p className="text-stone-300 font-mono italic">Restoring your sanctuary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[calc(100%-3rem)] max-w-5xl mx-auto space-y-6 pb-20">
      {cells.map((cell, index) => (
        <div key={cell.id} className="relative group" data-purpose="code-cell">
          <div className={`bg-white rounded-xl border flex flex-col overflow-hidden shadow-cell-shadow relative z-0 transition-all ${
            cell.status === 'editing' 
              ? 'border-action-yellow-border/50 focus-within:border-action-yellow-border focus-within:ring-2 focus-within:ring-action-yellow-border/20' 
              : 'border-cell-border'
          }`}>
            {/* Top Part: Input Area */}
            <div className="flex">
              <div className="w-12 flex-shrink-0 flex items-start justify-center border-r border-cell-border pt-4">
                <span className="text-base font-bold font-mono text-cell-num-text">{index + 1}</span>
              </div>
              <div className="flex-grow flex items-center p-2 pl-4">
                {cell.status === "editing" ? (
                  <>
                    <textarea
                      ref={(el) => (inputRefs.current[cell.id] = el)}
                      className="flex-grow py-2 text-gray-700 bg-transparent border-none focus:ring-0 focus:outline-none outline-none placeholder-gray-400 font-mono text-sm resize-none overflow-hidden"
                      placeholder="What's on your mind today?"
                      value={cell.content}
                      onChange={(e) => {
                        handleChange(cell.id, e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => handleKeyDown(e, cell.id)}
                      rows={1}
                    />
                    <button
                      aria-label="Run Cell"
                      className="w-8 h-8 bg-action-yellow border border-action-yellow-border rounded-full flex items-center justify-center text-yellow-700 hover:bg-yellow-300 shadow-sm ml-3 flex-shrink-0 self-end mb-1"
                      onClick={() => handleRun(cell.id)}
                    >
                      <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4l12 6-12 6z" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <p className="font-mono text-sm text-gray-800 py-2 whitespace-pre-wrap">{cell.content}</p>
                )}
              </div>
            </div>

            {/* Bottom Part: Response Area (if exists) */}
            {cell.response && (
              <div className="border-t border-cell-border bg-gray-50/30 flex px-4 py-4 items-center">
                <div className="flex-shrink-0 mr-4">
                  <img
                    alt="AI Cat Icon"
                    className={`w-10 h-10 object-contain mix-blend-multiply brightness-[1.02] ${cell.response.status === 'loading' ? 'animate-pulse' : ''}`}
                    src="/cat-ai.png"
                  />
                </div>
                <div className="text-gray-800 text-[15px] leading-relaxed w-full">
                  {cell.response.status === "loading" ? (
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-400 font-medium italic">Thinking...</p>
                      <div className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatResponse(cell.response.content) }} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

// helper to format the response
function formatResponse(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}
