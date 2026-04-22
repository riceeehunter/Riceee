"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Pusher from "pusher-js";
import { format } from "date-fns";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { sendMessage, getMessages, markMessagesAsRead } from "@/actions/message";
import { PLAYER_IDS } from "@/lib/constants/players";

export default function RiceeeChatClient({ partnerNames, spaceGrotesk, inter }) {
  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sender, setSender] = useState(PLAYER_IDS.ONE);
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const endRef = useRef(null);

  const activeName = sender === PLAYER_IDS.ONE ? partnerOneName : partnerTwoName;

  const prettyMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isOne: message.sender === PLAYER_IDS.ONE || message.sender === "Partner 1",
      })),
    [messages]
  );

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const result = await getMessages();
      if (result.success) {
        setMessages(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    markMessagesAsRead(sender);
  }, [sender]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    const channel = pusher.subscribe("riceee-chat");
    channel.bind("new-message", (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  const onSend = async () => {
    const content = newMessage.trim();
    if (!content) return;

    setIsSending(true);
    try {
      const result = await sendMessage({ content, sender });
      if (!result.success) {
        toast.error(result.error || "Failed to send message");
      } else {
        setNewMessage("");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>

      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-3 pb-32 relative">
        {loading ? (
          <div className="flex justify-center items-center h-full opacity-50">
            <div className="w-6 h-6 border-2 border-[#dfd5ff]/20 border-t-[#dfd5ff] rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {messages.length === 0 && !isSending ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 -mt-24">
                 <h3 className={`text-[28px] text-[#e3e0f8] font-medium opacity-90 ${spaceGrotesk.className}`}>What's on your mind today?</h3>
                 
                 {/* Centered Input Area for Empty State */}
                 <div className="w-full max-w-2xl px-6">
                   <div className="relative group bg-[#333345]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] focus-within:border-[#c4b5fd]/50 transition-all duration-300">
                    <textarea 
                      className={`w-full bg-transparent border-none rounded-2xl px-5 py-4 pr-14 text-[16px] text-[#e3e0f8] placeholder-[#938f9a] focus:outline-none focus:ring-0 resize-none ${inter.className}`}
                      placeholder="Ask anything..." 
                      rows="1"
                      value={newMessage}
                      onChange={(e) => {
                         setNewMessage(e.target.value);
                         e.target.style.height = 'auto';
                         e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!isSending) onSend();
                        }
                      }}
                      style={{ minHeight: '56px', maxHeight: '200px' }}
                    />
                    <button 
                      onClick={onSend}
                      disabled={isSending || !newMessage.trim()}
                      className="absolute right-3 bottom-3 p-2 bg-[#e3e0f8] text-[#121222] rounded-full hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
                    >
                      <SendHorizonal size={16} />
                    </button>
                  </div>
                 </div>
              </div>
            ) : null}

            {prettyMessages.map((message, index) => (
              <div key={index} className={`flex ${message.isOne ? "justify-end" : "justify-start"} relative z-10`}>
                <div className={`
                  p-4 max-w-[80%] text-[16px] leading-[1.6] ${inter.className}
                  ${message.isOne 
                    ? "bg-[#333345] text-[#e3e0f8] rounded-xl rounded-tr-sm border border-white/5" 
                    : "bg-[rgba(30,30,47,0.6)] backdrop-blur-[24px] border border-white/15 shadow-[0_0_40px_rgba(196,181,253,0.05)] rounded-xl rounded-tl-sm border-l-2 border-l-[#c4b5fd] text-[#e7deff]"
                  }
                `}>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start opacity-70 relative z-10">
                <div className="bg-[rgba(30,30,47,0.6)] backdrop-blur-[24px] border border-white/15 shadow-[0_0_40px_rgba(196,181,253,0.05)] rounded-xl rounded-tl-sm border-l-2 border-l-[#c4b5fd] p-4 max-w-[80%]">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[#c4b5fd] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#c4b5fd] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#c4b5fd] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      {/* Floating Bottom Input Area (Visible only when chat is active) */}
      {(messages.length > 0 || isSending) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-20">

          <div className="relative group bg-[#333345]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] focus-within:border-[#c4b5fd]/50 transition-all duration-300">
            <textarea 
              className={`w-full bg-transparent border-none rounded-2xl px-5 py-4 pr-14 text-[16px] text-[#e3e0f8] placeholder-[#938f9a] focus:outline-none focus:ring-0 resize-none ${inter.className}`}
              placeholder="Ask anything..." 
              rows="1"
              value={newMessage}
              onChange={(e) => {
                 setNewMessage(e.target.value);
                 e.target.style.height = 'auto';
                 e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSending) onSend();
                }
              }}
              style={{ minHeight: '56px', maxHeight: '200px' }}
            />
            <button 
              onClick={onSend}
              disabled={isSending || !newMessage.trim()}
              className="absolute right-3 bottom-3 p-2 bg-[#e3e0f8] text-[#121222] rounded-full hover:bg-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center"
            >
              <SendHorizonal size={16} />
            </button>
          </div>
          <div className="text-center mt-2">
             <span className={`text-[10px] text-[#938f9a] ${inter.className}`}>Riceee AI can make mistakes. Consider verifying important information.</span>
          </div>
        </div>
      )}
    </>
  );
}
