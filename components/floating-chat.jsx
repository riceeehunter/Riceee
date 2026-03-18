"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage, getMessages, markMessagesAsRead, getUnreadCount } from "@/actions/message";
import { format } from "date-fns";
import { toast } from "sonner";
import Pusher from "pusher-js";

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sender, setSender] = useState("Hunter");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    if (isOpen) {
      fetchMessages();
      markMessagesAsRead(sender);
      setUnreadCount(0);
    } else {
      fetchUnreadCount();
    }
    // Update the ref whenever isOpen changes
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
      
      // Only update unread count if chat is closed
      if (!isOpenRef.current) {
        fetchUnreadCount();
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []); // Only create connection once on mount

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    console.log("🚀 Sending message:", newMessage);
    try {
      const result = await sendMessage({
        content: newMessage,
        sender,
        replyTo: replyingTo?.id,
        replyToContent: replyingTo?.content,
        replyToSender: replyingTo?.sender,
      });

      console.log("📬 Result from server:", result);

      if (result.success) {
        setNewMessage("");
        setReplyingTo(null);
        console.log("✅ Message sent successfully");
        // Pusher will handle adding the message in real-time
      } else {
        console.error("❌ Failed:", result.error);
        toast.error("Failed to send message: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error("💥 Send error:", error);
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

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 group"
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
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[32rem] sm:h-[36rem] bg-white rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Simple WhatsApp-style header */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 fill-white" />
              <div>
                <h3 className="font-semibold text-base">Hunter × Riceee</h3>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Clean WhatsApp-style messages */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-2 relative bg-[#fef3f0]"
            style={{
              backgroundImage: `
                url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
              `,
              backgroundSize: '200px 200px'
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-32 relative z-10">
                <Heart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === sender ? "justify-end" : "justify-start"} relative z-10 group`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative ${
                      message.sender === "Hunter"
                        ? "bg-blue-500 text-white rounded-tr-none"
                        : "bg-pink-500 text-white rounded-tl-none"
                    }`}
                  >
                    {/* Reply preview */}
                    {message.replyTo && (
                      <div className="bg-black/20 rounded px-2 py-1.5 mb-2 border-l-2 border-white/50">
                        <p className="text-[9px] opacity-70 font-medium">{message.replyToSender}</p>
                        <p className="text-[11px] opacity-80 line-clamp-1">{message.replyToContent}</p>
                      </div>
                    )}

                    <p className="text-[10px] font-medium mb-0.5 opacity-80">
                      {message.sender === "Hunter" ? "Hunter 💙" : "Riceee 💖"}
                    </p>
                    <p className="text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                    <p className="text-[10px] mt-1 opacity-70 text-right">
                      {format(new Date(message.createdAt), "h:mm a")}
                    </p>

                    {/* Reply button - only show on hover and for other person's messages */}
                    {message.sender !== sender && (
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-200 hover:bg-gray-300 rounded-full p-1.5 shadow-md"
                        title="Reply"
                      >
                        <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp-style input */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            {/* Reply preview bar */}
            {replyingTo && (
              <div className="mb-2 bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-gray-600">
                    Replying to {replyingTo.sender === "Hunter" ? "💙 Hunter" : "💖 Riceee"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Compact sender selection */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setSender("Hunter")}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                  sender === "Hunter"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-blue-600 border border-blue-300"
                }`}
              >
                💙 Hunter
              </button>
              <button
                onClick={() => setSender("Riceee")}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                  sender === "Riceee"
                    ? "bg-pink-500 text-white"
                    : "bg-white text-pink-600 border border-pink-300"
                }`}
              >
                💖 Riceee
              </button>
            </div>

            {/* Message input */}
            <div className="flex gap-2 items-end">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 resize-none text-sm border border-gray-300 rounded-3xl bg-white px-4 py-2 focus:border-pink-400"
                rows={1}
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 h-10 w-10 rounded-full shadow-md disabled:opacity-50 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
