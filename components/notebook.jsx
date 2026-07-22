"use client"
import React, { useEffect, useRef, useState } from "react";
import { saveChatCell, getConversation, updateConversationTitle } from "@/actions/chat";
import { useSpaceState } from "@/components/space-state-provider";

export default function Notebook({ activeChatId, onTitleUpdate, onCreateChat }) {
  // Past conversations stay readable in an archive; only new writing stops.
  const { status: spaceStatus } = useSpaceState();
  const isSealed = spaceStatus === "ARCHIVED";
  const [cells, setCells] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const nextId = useRef(2);
  const inputRefs = useRef({});
  const endRef = useRef(null);
  // Chat id this client just created via lazy creation — its cells are
  // already on screen, so the DB fetch for it can be skipped
  const justCreatedIdRef = useRef(null);

  // Load existing cells from DB
  useEffect(() => {
    async function loadChat() {
      if (activeChatId && justCreatedIdRef.current === activeChatId) {
        justCreatedIdRef.current = null;
        return;
      }

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

  // Auto-scroll to bottom — but not on the initial render: a smooth scroll
  // queued while the tab is backgrounded resumes on refocus and the page
  // visibly slides into place
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
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
    if (isSealed) return;
    const cell = cells.find((c) => c.id === id);
    if (!cell || !cell.content.trim() || cell.status !== "editing") return;

    // mark input submitted and set response to loading
    updateCell(id, {
      status: "submitted",
      response: { content: "", status: "loading" }
    });

    // Prior exchanges become the AI's memory of this conversation
    const history = cells
      .filter((c) => c.id !== id && c.status === "submitted" && c.response?.status === "done")
      .flatMap((c) => [
        { role: "user", content: c.content },
        { role: "model", content: c.response.content },
      ]);

    let answer;
    let aiSucceeded = false;
    try {
      const res = await fetch("/api/riceee-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cell.content.trim(), history }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        answer = data.reply;
        aiSucceeded = true;
      } else {
        answer = data.error || "I'm having a little trouble thinking right now — try me again in a moment 💛";
      }
    } catch (err) {
      console.error("AI request failed:", err);
      answer = "I couldn't reach my thoughts just now 🙈 — check your connection and try again.";
    }

    let currentChatId = activeChatId;

    // If no active chat, create one now
    if (!currentChatId && onCreateChat) {
      currentChatId = await onCreateChat(cell.content.trim());
      // Cells are already on screen; don't refetch when activeChatId updates
      justCreatedIdRef.current = currentChatId;
    }

    // Update UI immediately for responsiveness
    updateCell(id, {
      response: { content: answer, status: "done" }
    });

    // add a fresh input cell below immediately (isNew: earned its entrance)
    setCells((prev) => [
      ...prev,
      { id: Date.now(), content: "", status: "editing", response: null, isNew: true },
    ]);

    // Only persist real exchanges — error placeholders aren't worth saving
    if (currentChatId && aiSucceeded) {
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

  const isFreshConversation =
    cells.length === 1 && cells[0]?.status === "editing" && !cells[0]?.content;

  // label is what the chip shows (short, so it fits one row on a phone);
  // prompt is what actually gets typed for you
  const suggestionPrompts = [
    { label: "Weird dream 😴", prompt: "I had a weird dream last night" },
    { label: "We fought 😕", prompt: "We had a tiny fight today..." },
    { label: "Say something sweet 💗", prompt: "Tell me something sweet about us" },
    { label: "I'm stressed", prompt: "I'm a little stressed lately" },
  ];

  const handleSuggestion = (text) => {
    const firstCell = cells[0];
    if (!firstCell) return;
    handleChange(firstCell.id, text);
    const el = inputRefs.current[firstCell.id];
    setTimeout(() => el && el.focus(), 50);
  };

  return (
    <div className="w-full max-w-[100%] mx-auto space-y-3 sm:space-y-6 pb-6 sm:pb-20">
      {/* Warm welcome when the page is fresh — no entrance animation:
          throttled background tabs replay it late and the page jumps */}
      {isFreshConversation && (
        <div className="flex flex-col items-center text-center gap-3 sm:gap-5 pt-1 sm:pt-6 pb-1 sm:pb-4">
          {/* No glow behind the cat — the blurred gradient read as a grey box */}
          <img
            src="/cat-ai.png"
            alt="Riceee AI"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain animate-float"
            style={{ animationDuration: "5s" }}
          />
          <div className="space-y-1 sm:space-y-1.5">
            <h3 className="text-lg sm:text-2xl font-bold text-[#393832] tracking-tight">
              Hey, I&apos;m <span className="text-[#ab4400]">Riceee</span> 🐾
            </h3>
            {/* Long version only where there's room for it */}
            <p className="hidden sm:block text-sm text-[#66645e] max-w-sm mx-auto leading-relaxed">
              Your in-house listener. Vent, wonder, overthink — this notebook keeps it all between us.
            </p>
            <p className="sm:hidden text-[13px] text-[#66645e] leading-snug">
              Vent, wonder, overthink. Stays between us.
            </p>
          </div>
        </div>
      )}

      {/* Quick starts — desktop only. On a phone they crowded the input. */}
      {isFreshConversation && (
        <div className="hidden sm:flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
          {suggestionPrompts.map(({ label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSuggestion(prompt)}
              className="whitespace-nowrap rounded-full border border-[#ffdfcf] bg-white/80 px-4 py-2 text-xs font-semibold text-[#6a2700] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#ffba99] hover:bg-[#fff0e8] active:scale-95"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {cells.map((cell, index) => (
        <div key={cell.id} className={`${cell.isNew ? "fade-up-in" : ""} relative group`} data-purpose="code-cell">
          <div className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-cell-shadow relative z-0 transition-all ${cell.status === 'editing'
            ? 'border-action-yellow-border/50 focus-within:border-action-yellow-border focus-within:ring-2 focus-within:ring-action-yellow-border/20'
            : 'border-[#ffdfcf]'
            }`}>
            {/* Top Part: Input Area */}
            <div className="flex">
              <div className="w-12 flex-shrink-0 flex items-start justify-center border-r border-[#ffede2] bg-[#fff5f0]/60 pt-4">
                <span className="text-base font-bold font-mono text-cell-num-text">{index + 1}</span>
              </div>
              <div className="flex-grow flex items-center p-2 pl-4">
                {cell.status === "editing" ? (
                  <>
                    <textarea
                      ref={(el) => (inputRefs.current[cell.id] = el)}
                      className="flex-grow py-2 text-gray-800 bg-transparent border-none focus:ring-0 focus:outline-none outline-none placeholder-gray-500 font-mono text-sm resize-none overflow-hidden disabled:cursor-not-allowed"
                      placeholder={
                        isSealed
                          ? "This space is an archive — Riceee can't reply here anymore."
                          : index === 0
                            ? "What's on your mind today?"
                            : ""
                      }
                      value={cell.content}
                      disabled={isSealed}
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
                      disabled={isSealed}
                      className="w-8 h-8 bg-action-yellow border border-action-yellow-border rounded-full flex items-center justify-center text-yellow-700 hover:bg-yellow-300 shadow-sm ml-3 flex-shrink-0 self-end mb-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-action-yellow"
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
              <div className="fade-up-in border-t border-[#ffede2] bg-[#fffaf6] flex px-4 py-4 items-center">
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
                      <p className="text-[#9d4867]/60 font-medium italic">Riceee is thinking...</p>
                      <div className="flex space-x-1">
                        <span className="w-1.5 h-1.5 bg-[#ffae88] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#ffae88] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-[#ffae88] rounded-full animate-bounce"></span>
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
