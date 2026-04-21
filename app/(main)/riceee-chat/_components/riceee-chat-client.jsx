"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Pusher from "pusher-js";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Bell, CirclePlus, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessage, getMessages, markMessagesAsRead } from "@/actions/message";
import { PLAYER_IDS } from "@/lib/constants/players";
import { plusJakarta, manrope } from "@/lib/fonts";

export default function RiceeeChatClient({ partnerNames }) {
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

  const onEnter = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className={`${manrope.className} px-4 pb-8`}>
      <div className="mx-auto w-full max-w-[430px] rounded-[2rem] border border-[#ffdfcf] bg-[#fff9f4] shadow-[0_20px_50px_rgba(57,56,50,0.12)] overflow-hidden">
        <div className="bg-gradient-to-r from-[#ab4400] to-[#9d4867] text-white px-4 py-6 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/40 bg-white/15 flex items-center justify-center text-2xl font-semibold mb-3">
            🤖
          </div>
          <p className={`${plusJakarta.className} text-2xl font-bold`}>Riceee AI</p>
          <p className="text-white/85 text-sm mt-1">Coming Soon</p>
        </div>

        <div className="px-4 py-8 flex flex-col items-center justify-center">
          <p className="text-[#7a3320] text-center">This feature is under development.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] text-white text-sm font-semibold hover:from-[#973b00] hover:to-[#ff8b57] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
