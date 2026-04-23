"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Heart, Sparkles, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getUnreadNotifications, markNotificationAsRead } from "@/actions/notification";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { PLAYER_IDS } from "@/lib/constants/players";
import { plusJakarta, manrope } from "@/lib/fonts";

export default function NotificationBell({ partnerNames }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const nameOne = partnerNames?.partnerOneName || "Partner 1";
  const nameTwo = partnerNames?.partnerTwoName || "Partner 2";
  const initials = (name) => (name || "?").trim().charAt(0).toUpperCase();

  const fetchNotifications = async () => {
    try {
      const data = await getUnreadNotifications();
      setNotifications(data);
      setUnreadCount(data.length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Only fetch when popover is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId, readerId, readerLabel) => {
    setLoading(true);
    const result = await markNotificationAsRead(notificationId, readerId);
    
    if (result.success) {
      await fetchNotifications();
      toast.success(`Marked as read by ${readerLabel}!`);
    } else {
      toast.error("Failed to mark as read");
    }
    setLoading(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-[#ffae88]/45 bg-white/85 text-[#6a2700] hover:bg-[#fff2ea] hover:text-[#ab4400] transition-all"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] text-white text-[10px] px-1.5 flex items-center justify-center font-bold shadow-[0_6px_14px_rgba(171,68,0,0.35)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={`${manrope.className} w-[20rem] p-0 rounded-3xl border border-[#ffdfcf] bg-[#fffbff] shadow-[0_24px_56px_rgba(57,56,50,0.2)] overflow-hidden`}
        align="end"
        sideOffset={12}
      >
        <div className="relative overflow-hidden border-b border-[#ffdfcf] px-4 py-2.5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,174,136,0.35),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(255,217,226,0.32),transparent_55%)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className={`${plusJakarta.className} font-bold text-[1.45rem] leading-none text-[#ab4400] tracking-tight flex items-center gap-2`}>
                Notifications
                <Heart className="h-4 w-4 text-[#d3567f]" />
              </h3>
              <p className="text-[11px] text-[#7a7871] mt-0.5">Your shared moments and updates</p>
            </div>
            <Sparkles className="h-4 w-4 text-[#d3567f]" />
          </div>
          {unreadCount > 0 && (
            <span className="relative inline-flex mt-1.5 rounded-full border border-[#ffb995] bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[#863655]">
              {unreadCount} unread
            </span>
          )}
        </div>
        
        <div className="max-h-[15rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-5 text-center text-[#66645e]">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#fff0e8] to-[#fff1f6] border border-[#ffd9e2]/70">
                <Bell className="h-6 w-6 text-[#ab4400]/65" />
              </div>
              <p className={`${plusJakarta.className} text-[1.25rem] leading-none font-semibold text-[#393832]`}>No new notifications</p>
              <p className="mt-1.5 text-xs text-[#828079]">You are all caught up for now.</p>
            </div>
          ) : (
            notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`px-4 py-2.5 ${index !== notifications.length - 1 ? "border-b border-[#ffede2]" : ""}`}
              >
                <Link
                  href={notification.type?.startsWith("COURTROOM") ? "/riceee-chat" : `/journal/${notification.entryId}`}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-2xl border border-[#ffdfcf] bg-white/80 px-4 py-3 shadow-[0_8px_16px_rgba(57,56,50,0.05)] hover:border-[#ffba99] hover:bg-[#fff7f2] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {notification.type === "COURTROOM_CASE" ? (
                      <Gavel className="h-3.5 w-3.5 text-[#9d4867]" />
                    ) : notification.type === "COURTROOM_JUDGEMENT" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Heart className="h-3.5 w-3.5 text-[#d3567f]" />
                    )}
                    <span className="text-[10px] font-bold text-[#9d4867]/60 uppercase tracking-widest">
                      {notification.type === "COURTROOM_CASE" ? "New Dispute" : notification.type === "COURTROOM_JUDGEMENT" ? "AI Verdict" : "Journal Update"}
                    </span>
                  </div>
                  <p className={`${plusJakarta.className} text-sm font-semibold text-[#393832] mb-1 leading-snug`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-[#7a7871]">
                    {format(new Date(notification.createdAt), "MMM d 'at' h:mm a")}
                  </p>
                </Link>
                
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] text-[#6d6a64] mr-1">Read by:</span>
                  <button
                    onClick={() => handleMarkAsRead(notification.id, PLAYER_IDS.ONE, nameOne)}
                    disabled={loading || notification.hunterRead}
                    className={`h-8 min-w-8 px-2 rounded-full font-bold text-xs transition-all border ${
                      notification.hunterRead
                        ? "bg-[#ab4400] text-white border-[#ab4400]"
                        : "bg-[#fff0e8] text-[#ab4400] border-[#ffb995] hover:bg-[#ffe3d4]"
                    }`}
                    title={notification.hunterRead ? `${nameOne} has read` : `Mark as read by ${nameOne}`}
                  >
                    {notification.hunterRead ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      initials(nameOne)
                    )}
                  </button>
                  <button
                    onClick={() => handleMarkAsRead(notification.id, PLAYER_IDS.TWO, nameTwo)}
                    disabled={loading || notification.riceeeRead}
                    className={`h-8 min-w-8 px-2 rounded-full font-bold text-xs transition-all border ${
                      notification.riceeeRead
                        ? "bg-[#9d4867] text-white border-[#9d4867]"
                        : "bg-[#fff1f6] text-[#9d4867] border-[#f3bfd0] hover:bg-[#ffe3ec]"
                    }`}
                    title={notification.riceeeRead ? `${nameTwo} has read` : `Mark as read by ${nameTwo}`}
                  >
                    {notification.riceeeRead ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      initials(nameTwo)
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
