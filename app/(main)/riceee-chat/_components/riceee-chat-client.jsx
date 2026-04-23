"use client";

import { useEffect, useRef, useState } from "react";
import AiChatInput from "./ai-chat-input";
import Notebook from "@/components/notebook";

export default function RiceeeChatClient({ poppins, activeChatId, onTitleUpdate, onCreateChat }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef(null);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const onSend = async () => {
    const content = newMessage.trim();
    if (!content) return;

    // Add user message
    const userMessage = { content, isOne: true };
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");
    setIsSending(true);

    // Simulate AI delay for now
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { content: "This is a simulated Riceee AI response. Backend integration coming soon!", isOne: false }
      ]);
      setIsSending(false);
    }, 1500);
  };

  return (
    <>

      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative">
        <div className="w-full flex justify-center pb-8 pt-4">
          <div className="w-full">
            <Notebook 
              activeChatId={activeChatId} 
              onTitleUpdate={onTitleUpdate} 
              onCreateChat={onCreateChat}
            />
          </div>
        </div>
      </div>
    </>
  );
}
