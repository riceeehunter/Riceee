"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  BookOpen,
  Heart,
  Gamepad2,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const pathname = usePathname();

  const [isChatOpen, setIsChatOpen] = React.useState(false);

  React.useEffect(() => {
    const handleStatus = (e) => setIsChatOpen(e.detail.isOpen);
    window.addEventListener("riceee-chat-status", handleStatus);
    return () => window.removeEventListener("riceee-chat-status", handleStatus);
  }, []);

  // Hide bottom nav on pages where it might interfere with UI elements like chat inputs or editors
  const hideOnPaths = ["/journal/write", "/onboarding"];
  const shouldHide = hideOnPaths.some(path => pathname.startsWith(path)) || isChatOpen;

  if (shouldHide) return null;

  const navItems = [
    {
      label: "Home",
      icon: Home,
      href: "/",
    },
    {
      label: "Memories",
      icon: BookOpen,
      href: "/memories",
    },
    {
      label: "Chat",
      icon: Heart,
      href: "#chat", // We will handle this with an onClick
      isPrimary: true,
    },
    {
      label: "Games",
      icon: Gamepad2,
      href: "/games",
    },
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
  ];

  const handleChatToggle = (e) => {
    e.preventDefault();
    // Dispatch a custom event that FloatingChat can listen to
    window.dispatchEvent(new CustomEvent("toggle-riceee-chat"));
  };

  return (
    <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md z-[100]">
      <nav className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[1.75rem] shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-stretch justify-between px-1.5 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          if (item.isPrimary) {
            return (
              <button
                key={item.label}
                onClick={handleChatToggle}
                aria-label="Open Riceee chat"
                className="flex flex-1 flex-col items-center justify-center"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white flex items-center justify-center shadow-lg shadow-[#ab4400]/25 transition-transform active:scale-90",
                  isActive && "ring-2 ring-[#ab4400]/20"
                )}>
                  <Icon size={22} className="fill-white/20" />
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 py-1.5 active:scale-90 transition-transform"
            >
              {/* Springy pill that glides to the active tab */}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-[#fff0e8] border border-[#ffae88]/30"
                />
              )}
              <Icon
                size={20}
                className={cn(
                  "relative transition-all duration-300",
                  isActive ? "text-[#ab4400] scale-110" : "text-stone-400"
                )}
              />
              <span className={cn(
                "relative w-full truncate text-center text-[9px] font-bold uppercase tracking-tight transition-colors",
                isActive ? "text-[#ab4400]" : "text-stone-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
