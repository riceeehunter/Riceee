"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { startFreshSpace, switchToSpace } from "@/actions/spaces";

/**
 * Only appears once there's more than one space to be in — which, for almost
 * everyone, is never. It exists for the case after a breakup, where someone
 * needs to be able to start again without that meaning their archive is gone.
 */
export default function MySpacesCard({ spaces, canStartFresh }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!spaces || spaces.length < 2) {
    if (!canStartFresh) return null;
  }

  const run = (action, message) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(message);
        router.refresh();
      } catch (error) {
        toast.error(error.message || "Couldn't do that.");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">Your spaces</h2>
        <p className="text-xs text-stone-500">
          Everything you&apos;ve been part of. Archives stay yours to open and download.
        </p>
      </div>

      <div className="space-y-2">
        {spaces.map((space) => {
          const archived = space.status === "ARCHIVED";
          return (
            <div
              key={space.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                space.isCurrent ? "border-[#ffae88] bg-[#fff6f0]" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    archived ? "bg-stone-100 text-stone-500" : "bg-[#ffae88]/20 text-[#ab4400]"
                  }`}
                >
                  {archived ? <Archive className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-800">{space.title}</p>
                  <p className="text-[11px] text-stone-500">
                    {archived ? "Archive" : "Active"}
                    {space.entries !== null ? ` · ${space.entries} entries` : ""}
                    {space.memories ? ` · ${space.memories} photos` : ""}
                  </p>
                </div>
              </div>

              {space.isCurrent ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#ab4400]">
                  <Check className="h-3 w-3" />
                  You&apos;re here
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(() => switchToSpace(space.id), `Opened ${space.title}.`)}
                >
                  {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Open
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {canStartFresh && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-800">Start a new space</p>
            <p className="text-xs text-stone-500">
              Begin again with someone new. This archive stays exactly as it is.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                Start fresh
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-[111]">
              <AlertDialogHeader>
                <AlertDialogTitle>Start a new space?</AlertDialogTitle>
                <AlertDialogDescription>
                  You&apos;ll get a fresh, empty space and can connect with someone new. Nothing in
                  this archive is deleted or changed — it stays listed here, and you can open or
                  download it whenever you want.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Not now</AlertDialogCancel>
                <Button
                  disabled={isPending}
                  onClick={() => run(startFreshSpace, "Your new space is ready.")}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start fresh
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
