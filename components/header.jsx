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
    <header className={`${plusJakarta.className} fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-5xl z-50`}>
      <nav className="flex items-center gap-2 p-2 rounded-full bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)]">
        <Link href="/" className="flex items-center px-6 py-2 rounded-full bg-white/60 shadow-sm border border-white/40">
          <div className="text-xl font-semibold text-[#ab4400] tracking-tighter leading-none">Coupling</div>
        </Link>

        <div className="hidden md:flex flex-1 items-center justify-center gap-1 font-medium text-[13px] tracking-wide leading-none">
          <div className="flex items-center gap-1 p-1 bg-stone-100/30 rounded-full border border-stone-200/20">
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/memories">Memories</Link>
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/dashboard#collections">Collections</Link>
            <Link className="px-5 py-2 rounded-full text-stone-500 hover:text-[#ab4400] transition-colors font-medium text-[13px] tracking-wide" href="/games">Games</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/journal/write" className="relative group hidden sm:block">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ab4400] to-orange-400 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-[#ab4400] text-white px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-widest shadow-lg flex items-center gap-2">
              <PenBox size={16} />
              <span>Write your hearts out</span>
            </div>
          </Link>
          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline" className="rounded-full">Login</Button>
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
