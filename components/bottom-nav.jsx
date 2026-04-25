"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    <div className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-md z-[100]">
      <nav className="bg-white/85 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] flex items-center justify-around p-1 sm:p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          if (item.isPrimary) {
            return (
              <button
                key={item.label}
                onClick={handleChatToggle}
                className="flex flex-col items-center justify-center"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ab4400] to-[#9d4867] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 mb-1",
                  isActive && "ring-2 ring-[#ab4400]/20"
                )}>
                  <Icon size={24} className="fill-white/20" />
                </div>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center px-1.5 min-[400px]:px-3 py-1 gap-1"
            >
              <Icon 
                size={22} 
                className={cn(
                  "transition-colors",
                  isActive ? "text-[#ab4400]" : "text-stone-400"
                )} 
              />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tight transition-colors",
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
