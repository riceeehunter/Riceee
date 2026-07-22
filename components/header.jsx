import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import UserMenu from "./user-menu";
import WriteCta from "./write-cta";
import NotificationBell from "./notification-bell";
import { checkUser } from "@/lib/checkUser";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import { plusJakarta } from "@/lib/fonts";

async function Header() {
  const user = await checkUser();
  const partnerNames = resolvePartnerNames(user);

  return (
    <header className={`${plusJakarta.className} fixed top-[calc(0.75rem+env(safe-area-inset-top))] md:top-[calc(1.5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 w-fit max-w-[calc(100vw-1rem)] z-50`}>
      {/* Near-opaque on mobile — at 40% the page text scrolled straight through it */}
      <nav className="flex items-center justify-between gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-full bg-white/95 md:bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.10)]">
        <Link href="/" className="flex items-center px-3.5 sm:px-6 py-2 rounded-full bg-white/70 shadow-sm border border-white/40">
          <div className="text-lg sm:text-xl font-semibold text-[#ab4400] tracking-tighter leading-none">Riceee</div>
        </Link>

        <div className="hidden md:flex flex-1 items-center justify-center gap-1 font-medium text-[13px] tracking-wide leading-none">
          <div className="flex items-center gap-1 p-1 bg-stone-100/30 rounded-full border border-stone-200/20">
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/dashboard">Dashboard</Link>
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/memories">Memories</Link>
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/games">Games</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <WriteCta />
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
