import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { PenBox } from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import UserMenu from "./user-menu";
import NotificationBell from "./notification-bell";
import { checkUser } from "@/lib/checkUser";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import { plusJakarta } from "@/lib/fonts";

async function Header() {
  const user = await checkUser();
  const partnerNames = resolvePartnerNames(user);

  return (
    <header className={`${plusJakarta.className} fixed top-6 left-1/2 -translate-x-1/2 w-fit max-w-[90vw] z-50`}>
      <nav className="flex items-center justify-between gap-2 p-2 rounded-full bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <Link href="/" className="flex items-center px-6 py-2 rounded-full bg-white/60 shadow-sm border border-white/40">
          <div className="text-xl font-semibold text-[#ab4400] tracking-tighter leading-none">Riceee</div>
        </Link>

        <div className="hidden md:flex flex-1 items-center justify-center gap-1 font-medium text-[13px] tracking-wide leading-none">
          <div className="flex items-center gap-1 p-1 bg-stone-100/30 rounded-full border border-stone-200/20">
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/memories">Memories</Link>
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/dashboard#collections">Collections</Link>
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/games">Games</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/journal/write" className="relative group">
            <div className="absolute -inset-0.5 bg-[#ab4400] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000" />
            <div className="relative h-10 w-10 md:h-auto md:w-auto md:px-5 md:py-2.5 rounded-full bg-[#ab4400] text-white flex items-center justify-center gap-2 shadow-lg shadow-[#ab4400]/20 hover:scale-[1.02] active:scale-95 transition-all">
              <PenBox size={16} className="md:w-4 md:h-4" />
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">WRITE YOUR HEARTS OUT</span>
            </div>
          </Link>
          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline" className="rounded-full px-8 py-2.5 h-auto text-[11px] font-extrabold uppercase tracking-[0.15em] border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-[#ab4400] hover:border-[#ab4400]/30 transition-all">Login</Button>
            </SignInButton>
          </SignedOut>
          <div className="h-8 w-[1px] bg-stone-200/50 mx-1 hidden md:block" />
          <SignedIn>
            <div className="flex items-center gap-2 pr-1">
              <NotificationBell partnerNames={partnerNames} />
              <UserMenu />
            </div>
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}

export default Header;
