import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { PenBox, FolderOpen, Camera, Gamepad2 } from "lucide-react";
import Image from "next/image";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import UserMenu from "./user-menu";
import NotificationBell from "./notification-bell";
import { checkUser } from "@/lib/checkUser";
import { APP_BRAND } from "@/lib/constants/branding";

async function Header() {
  await checkUser();

  return (
    <header className="container mx-auto">
      {/* Desktop Layout - Single Row */}
      <nav className="hidden md:flex py-6 px-4 justify-between items-center gap-6">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 bg-clip-text text-transparent whitespace-nowrap">
            {APP_BRAND.name} {APP_BRAND.logoSuffix}
          </h1>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <SignedIn>
            <NotificationBell />
            <Link href="/memories">
              <Button variant="outline" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <Camera size={18} />
                <span className="hidden md:inline">Memories</span>
              </Button>
            </Link>
            <Link href="/dashboard#collections">
              <Button variant="outline" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
                <FolderOpen size={18} />
                <span className="hidden md:inline">Collections</span>
              </Button>
            </Link>
            <Link href="/games">
              <Button variant="outline" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200">
                <Gamepad2 size={18} className="text-purple-600" />
                <span className="hidden md:inline text-purple-700 font-semibold">Games</span>
              </Button>
            </Link>
          </SignedIn>
          <Link href="/journal/write">
            <Button variant="journal" className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4">
              <PenBox size={18} />
              <span className="hidden md:inline">Write Your Heart</span>
            </Button>
          </Link>
          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline">Login</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserMenu />
          </SignedIn>
        </div>
      </nav>

      {/* Mobile Layout - Two Rows */}
      <nav className="md:hidden py-4 px-4">
        {/* Row 1: Logo + Bell on left, Icons + Profile on right */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 bg-clip-text text-transparent whitespace-nowrap">
                {APP_BRAND.name} {APP_BRAND.logoSuffix}
              </h1>
            </Link>
            <SignedIn>
              <NotificationBell />
            </SignedIn>
          </div>

          {/* Memories, Collections, Games + Profile */}
          <div className="flex items-center gap-2">
            <SignedIn>
              <Link href="/memories">
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Camera size={18} />
                </Button>
              </Link>
              <Link href="/dashboard#collections">
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <FolderOpen size={18} />
                </Button>
              </Link>
              <Link href="/games">
                <Button variant="outline" size="icon" className="h-10 w-10 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200">
                  <Gamepad2 size={18} className="text-purple-600" />
                </Button>
              </Link>
              <UserMenu />
            </SignedIn>
            <SignedOut>
              <SignInButton forceRedirectUrl="/dashboard">
                <Button variant="outline" size="sm">Login</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Row 2: Write Your Hearts - aligned with the 3 icons above */}
        <div className="flex justify-end">
          <Link href="/journal/write" style={{ width: '154px' }}>
            <Button variant="journal" className="w-full flex items-center justify-center gap-2 h-10">
              <PenBox size={16} />
              <span className="text-sm font-medium">Write Hearts</span>
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Header;
