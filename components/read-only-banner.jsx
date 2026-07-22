"use client";

import Link from "next/link";
import { Archive, Clock } from "lucide-react";
import { useSpaceState } from "./space-state-provider";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

/**
 * Says once, at the top of every page, why nothing can be added.
 *
 * Deliberately not a dismissible toast: it's not an error the user caused, it's
 * the state the space is in, and it should still be explaining itself on the
 * fifth visit. The tone stays factual — someone reading this is likely having a
 * bad week, and the app editorialising about it would not help.
 */
export default function ReadOnlyBanner() {
  const { isWritable, status, closesAt, archivedAt } = useSpaceState();

  if (isWritable) return null;

  const archived = status === "ARCHIVED";

  return (
    <div className="mx-auto mb-4 max-w-4xl px-4">
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-4 py-3 text-xs ${
          archived
            ? "border-stone-200 bg-stone-50 text-stone-600"
            : "border-amber-200 bg-amber-50/70 text-amber-900"
        }`}
      >
        {archived ? (
          <Archive className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="font-semibold">
          {archived ? "This is an archive." : "This space is closing."}
        </span>
        <span className="opacity-90">
          {archived
            ? `Closed ${formatDate(archivedAt)}. Everything stays readable — nothing new can be added.`
            : `Everything stays readable until ${formatDate(closesAt)}, but nothing new can be added.`}
        </span>
        <Link
          href="/settings"
          className="font-semibold underline underline-offset-2 hover:opacity-80"
        >
          Download it all
        </Link>
      </div>
    </div>
  );
}
