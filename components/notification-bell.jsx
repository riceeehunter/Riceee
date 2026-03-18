"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
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

export default function NotificationBell({ partnerNames }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const nameOne = partnerNames?.partnerOneName || "Partner 1";
  const nameTwo = partnerNames?.partnerTwoName || "Partner 2";

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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications 💗</h3>
          {unreadCount > 0 && (
            <span className="text-sm text-gray-500">{unreadCount} unread</span>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No new notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="border-b last:border-b-0 p-4 hover:bg-gray-50"
              >
                <Link
                  href={`/journal/${notification.entryId}`}
                  onClick={() => setIsOpen(false)}
                  className="block"
                >
                  <p className="text-sm font-medium mb-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    {format(new Date(notification.createdAt), "MMM d 'at' h:mm a")}
                  </p>
                </Link>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 mr-2">Mark as read:</span>
                  <button
                    onClick={() => handleMarkAsRead(notification.id, PLAYER_IDS.ONE, nameOne)}
                    disabled={loading || notification.hunterRead}
                    className={`h-8 w-8 rounded-full font-bold text-sm transition-all ${
                      notification.hunterRead
                        ? "bg-blue-500 text-white"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                    title={notification.hunterRead ? `${nameOne} has read` : `Mark as read by ${nameOne}`}
                  >
                    {nameOne.charAt(0).toUpperCase()}
                  </button>
                  <button
                    onClick={() => handleMarkAsRead(notification.id, PLAYER_IDS.TWO, nameTwo)}
                    disabled={loading || notification.riceeeRead}
                    className={`h-8 w-8 rounded-full font-bold text-sm transition-all ${
                      notification.riceeeRead
                        ? "bg-pink-500 text-white"
                        : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                    }`}
                    title={notification.riceeeRead ? `${nameTwo} has read` : `Mark as read by ${nameTwo}`}
                  >
                    {nameTwo.charAt(0).toUpperCase()}
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
