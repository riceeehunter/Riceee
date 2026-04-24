"use client";

import { useState, useEffect, useRef } from "react";
import { CirclePlus, Heart, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage, getMessages, markMessagesAsRead, getUnreadCount } from "@/actions/message";
import { format } from "date-fns";
import { toast } from "sonner";
import Pusher from "pusher-js";
import { PLAYER_IDS } from "@/lib/constants/players";
import { plusJakarta } from "@/lib/fonts";

export default function FloatingChat({ partnerNames }) {
  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";

  // Single-side UI assumes each interface has its own sender identity.
  const [sender, setSender] = useState(PLAYER_IDS.ONE);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null); // For reply feature
  const messagesEndRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  const activePartnerName = sender === PLAYER_IDS.ONE ? partnerOneName : partnerTwoName;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const storedSender = localStorage.getItem("riceee-chat-sender");
    if (storedSender === PLAYER_IDS.ONE || storedSender === PLAYER_IDS.TWO) {
      setSender(storedSender);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const result = await getMessages();
      if (result.success) {
        setMessages(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const result = await getUnreadCount(sender);
      const count = result?.data || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  useEffect(() => {
    // Notify other components (like BottomNav) when chat state changes
    window.dispatchEvent(new CustomEvent("riceee-chat-status", { detail: { isOpen } }));
    
    if (isOpen) {
      fetchMessages();
      markMessagesAsRead(sender);
      setUnreadCount(0);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    } else {
      fetchUnreadCount();
      document.body.style.overflow = "";
    }
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe("riceee-chat");
    channel.bind("new-message", (data) => {
      setMessages((prev) => [...prev, data]);
      setTimeout(scrollToBottom, 100);
      
      if (!isOpenRef.current) {
        fetchUnreadCount();
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const result = await sendMessage({
        content: newMessage,
        sender,
        replyTo: replyingTo?.id || null,
        replyToContent: replyingTo?.content || null,
        replyToSender: replyingTo?.sender || null,
      });

      if (result.success) {
        setNewMessage("");
        setReplyingTo(null);
      } else {
        toast.error("Failed to send message: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("Failed to send message");
    }
    setIsSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener("toggle-riceee-chat", handleToggle);
    return () => window.removeEventListener("toggle-riceee-chat", handleToggle);
  }, []);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed hidden sm:flex bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-[#ab4400] to-[#9d4867] shadow-lg hover:shadow-xl transition-all hover:scale-105 items-center justify-center z-50 group"
        >
          <Heart className="h-7 w-7 sm:h-8 sm:w-8 text-white fill-white group-hover:scale-110 transition-transform" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shadow-md border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:top-24 sm:bottom-6 sm:right-6 w-full h-full sm:w-[26rem] sm:h-auto bg-[#fffbff] sm:rounded-[2rem] shadow-2xl flex flex-col z-[100] overflow-hidden border-0 sm:border border-[#ffdfcf]">
          <div className="bg-gradient-to-r from-[#ab4400] to-[#9d4867] text-white px-4 py-4 sm:py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-full border border-white/40 bg-white/15 flex items-center justify-center font-semibold text-lg">
                {activePartnerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3
                  className={`${plusJakarta.className} font-semibold text-[1.15rem] sm:text-[1.25rem] leading-tight truncate max-w-[120px] sm:max-w-[180px] bg-white/10 px-3 py-1 rounded-xl shadow-sm`}
                  title={activePartnerName}
                >
                  {activePartnerName.length > 16
                    ? activePartnerName.slice(0, 14) + "..."
                    : activePartnerName}
                </h3>
                <p className="text-xs sm:text-sm text-white/90 mt-1 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Active now
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto px-4 py-5 space-y-2 relative bg-[#fffaf6]"
            style={{
              backgroundImage: `
                url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
              `,
              backgroundSize: '200px 200px'
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-[#9f8f83] mt-24 relative z-10">
                <Heart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Start your first sweet note.</p>
              </div>
            ) : (
              // Group messages by date
              (() => {
                const groups = [];
                let lastDate = null;
                messages.forEach((message, idx) => {
                  const msgDate = new Date(message.createdAt);
                  const dateStr = msgDate.toDateString();
                  if (dateStr !== lastDate) {
                    groups.push({ type: "date", date: msgDate });
                    lastDate = dateStr;
                  }
                  groups.push({ type: "msg", message });
                });
                return groups.map((item, idx) => {
                  if (item.type === "date") {
                    // WhatsApp-style date label
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    let label = format(item.date, "MMMM d, yyyy");
                    if (item.date.toDateString() === today.toDateString()) label = "Today";
                    else if (item.date.toDateString() === yesterday.toDateString()) label = "Yesterday";
                    return (
                      <div key={"date-" + item.date} className="flex justify-center my-2">
                        <span className="bg-[#ffe8db] text-[#ab4400] text-xs px-3 py-1 rounded-full shadow-sm">{label}</span>
                      </div>
                    );
                  }
                  const { message } = item;
                  return (
                    <div
                      key={message.id}
                      className="flex justify-start relative z-10 group"
                      onMouseEnter={() => {}}
                    >
                      <div
                        className={`max-w-[82%] rounded-[1.25rem] px-4 py-3 shadow-sm relative ${
                          message.sender === PLAYER_IDS.ONE || message.sender === "Partner 1"
                            ? "bg-[#ffd9e2] text-[#8c4f68]"
                            : "bg-[#f9b187] text-[#6a3e2a]"
                        }`}
                      >
                        {/* Reply preview in bubble */}
                        {message.replyToContent && (
                          <div className="border-l-4 border-[#ab4400]/40 pl-2 mb-1 text-xs text-[#ab4400]/80 bg-[#fff7f2] rounded">
                            <span className="font-semibold">
                              {message.replyToSender === PLAYER_IDS.ONE || message.replyToSender === "Partner 1" ? partnerOneName : partnerTwoName}
                            </span>
                            {": "}{message.replyToContent.length > 60 ? message.replyToContent.slice(0, 60) + "..." : message.replyToContent}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed break-words">
                          {message.content}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-[11px] opacity-70">
                            {format(new Date(message.createdAt), "h:mm a")}
                          </p>
                          <button
                            className="text-xs text-[#ab4400]/70 hover:underline ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setReplyingTo(message)}
                            title="Reply"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 py-3 border-t border-[#ffe8db] bg-[#fff3e8]">
            {/* Reply preview above input */}
            {replyingTo && (
              <div className="flex items-center mb-2 bg-[#fff7f2] border-l-4 border-[#ab4400]/40 rounded px-2 py-1">
                <div className="flex-1 text-xs text-[#ab4400]/90">
                  <span className="font-semibold">
                    {replyingTo.sender === PLAYER_IDS.ONE || replyingTo.sender === "Partner 1" ? partnerOneName : partnerTwoName}
                  </span>
                  {": "}{replyingTo.content.length > 60 ? replyingTo.content.slice(0, 60) + "..." : replyingTo.content}
                </div>
                <button
                  className="ml-2 text-[#ab4400]/60 hover:text-[#ab4400] text-xs"
                  onClick={() => setReplyingTo(null)}
                  title="Cancel reply"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toast.info("Media upload in chat is coming soon")}
                className="h-9 w-9 rounded-full bg-white text-[#7a3320] border border-[#e7d4c3] flex items-center justify-center"
                aria-label="Add attachment"
              >
                <CirclePlus className="h-5 w-5" />
              </button>

              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Write a sweet note..."
                className="flex-1 h-10 rounded-full border border-[#e7d4c3] bg-white px-4 text-sm text-[#5a4a3d] placeholder:text-[#a49589] focus:outline-none focus:ring-2 focus:ring-[#ffb995]/40"
                disabled={isSending}
              />

              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className="h-9 w-9 rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] hover:from-[#973b00] hover:to-[#ff8b57] shadow-md disabled:opacity-50 p-0"
              >
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
