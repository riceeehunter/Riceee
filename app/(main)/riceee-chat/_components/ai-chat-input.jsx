import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, MoreHorizontal, RotateCcw, Plus, Paperclip, Globe } from 'lucide-react';
import './ai-chat-input.css';

export default function AiChatInput({ value, onChange, onSend, isSending, inputRef, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const containerRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && value.trim()) onSend();
    }
    if (e.key === "Escape") {
      setIsExpanded(false);
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => {
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    }, 400);
  };

  useEffect(() => {
    if (isExpanded && inputRef && inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [value, isExpanded]);

  return (
    <div 
      ref={containerRef}
      className={`container-ai-input ${isExpanded ? 'is-expanded' : ''}`}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div 
            key="collapsed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="grid-tilt-container"
            onClick={handleExpand}
          >
            {/* The 15-area grid for the 3D tilt effect */}
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            <div className="area" />
            
            <div className="container-wrap">
              <div className="card">
                <div className="background-blur-balls">
                  <div className="balls">
                    <span className="ball rosa" />
                    <span className="ball violet" />
                    <span className="ball green" />
                    <span className="ball cyan" />
                  </div>
                </div>
                <div className="content-card">
                  <div className="background-blur-card">
                    <div className="eyes">
                      <span className="eye" />
                      <span className="eye" />
                    </div>
                    <div className="eyes happy">
                      <svg fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M8.28386 16.2843C8.9917 15.7665 9.8765 14.731 12 14.731C14.1235 14.731 15.0083 15.7665 15.7161 16.2843C17.8397 17.8376 18.7542 16.4845 18.9014 15.7665C19.4323 13.1777 17.6627 11.1066 17.3088 10.5888C16.3844 9.23666 14.1235 8 12 8C9.87648 8 7.61556 9.23666 6.69122 10.5888C6.33728 11.1066 4.56771 13.1777 5.09858 15.7665C5.24582 16.4845 6.16034 17.8376 8.28386 16.2843Z" />
                      </svg>
                      <svg fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M8.28386 16.2843C8.9917 15.7665 9.8765 14.731 12 14.731C14.1235 14.731 15.0083 15.7665 15.7161 16.2843C17.8397 17.8376 18.7542 16.4845 18.9014 15.7665C19.4323 13.1777 17.6627 11.1066 17.3088 10.5888C16.3844 9.23666 14.1235 8 12 8C9.87648 8 7.61556 9.23666 6.69122 10.5888C6.33728 11.1066 4.56771 13.1777 5.09858 15.7665C5.24582 16.4845 6.16034 17.8376 8.28386 16.2843Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ width: 80, height: 80, borderRadius: '50%', opacity: 0 }}
            animate={{ width: 'min(90vw, 800px)', height: 'auto', borderRadius: '16px', opacity: 1 }}
            exit={{ width: 80, height: 80, borderRadius: '50%', opacity: 0 }}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative group" data-purpose="code-cell">
              <div className="bg-white rounded-xl border border-action-yellow-border/50 flex overflow-hidden shadow-cell-shadow relative z-0 focus-within:border-action-yellow-border focus-within:ring-2 focus-within:ring-action-yellow-border/20 transition-all">
                <div className="w-12 flex-shrink-0 flex items-center justify-center border-r border-cell-border">
                  <span className="text-base font-bold font-mono text-cell-num-text">1</span>
                </div>
                <div className="flex-grow flex items-center p-2 pl-4">
                  <textarea
                    ref={inputRef}
                    className="flex-grow py-2 text-gray-700 bg-transparent border-none focus:ring-0 focus:outline-none outline-none placeholder-gray-400 font-mono text-sm resize-none overflow-hidden"
                    placeholder="What's on your mind today?"
                    value={value}
                    onChange={onChange}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    rows={1}
                  />
                  <button
                    aria-label="Run Cell"
                    className={`w-8 h-8 bg-action-yellow border border-action-yellow-border rounded-full flex items-center justify-center text-yellow-700 hover:bg-yellow-300 shadow-sm ml-3 flex-shrink-0 transition-all self-end mb-1 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={onSend}
                    disabled={isSending || !value.trim()}
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-yellow-700/30 border-t-yellow-700 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4l12 6-12 6z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
