"use client";

import Link from "next/link";
import { PenBox } from "lucide-react";
import { useSpaceState } from "./space-state-provider";

/**
 * The header's write button, aware of whether the space still takes writing.
 *
 * Shown disabled rather than removed: a control that quietly disappears reads
 * as a bug, while a dimmed one with a reason attached reads as a decision.
 */
export default function WriteCta() {
  const { isWritable, status } = useSpaceState();

  if (!isWritable) {
    const reason =
      status === "ARCHIVED"
        ? "This is an archive — nothing new can be added."
        : "This space is closing, so nothing new can be added.";

    return (
      <div
        title={reason}
        aria-disabled="true"
        className="relative h-10 w-10 lg:h-auto lg:w-auto lg:px-5 lg:py-2.5 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center gap-2 cursor-not-allowed select-none"
      >
        <PenBox size={16} className="lg:w-4 lg:h-4" />
        <span className="hidden lg:inline text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">
          {status === "ARCHIVED" ? "ARCHIVED" : "CLOSING"}
        </span>
      </div>
    );
  }

  return (
    <Link href="/journal/write" className="relative group">
      <div className="absolute -inset-0.5 bg-[#ab4400] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000" />
      <div className="relative h-10 w-10 lg:h-auto lg:w-auto lg:px-5 lg:py-2.5 rounded-full bg-[#ab4400] text-white flex items-center justify-center gap-2 shadow-lg shadow-[#ab4400]/20 hover:scale-[1.02] active:scale-95 transition-all">
        <PenBox size={16} className="lg:w-4 lg:h-4" />
        <span className="hidden lg:inline text-[11px] font-bold uppercase tracking-[0.05em] whitespace-nowrap">
          WRITE YOUR HEARTS OUT
        </span>
      </div>
    </Link>
  );
}
