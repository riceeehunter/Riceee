"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Download, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { beginClosure, cancelClosure, closeSpaceNow } from "@/actions/space-closure";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ export */

/**
 * Deliberately the first thing in this card, and present in every state. If
 * someone opens this page because they're thinking about leaving, the option
 * that costs them nothing should be the one they see first.
 */
function ExportRow() {
  const [isDownloading, setDownloading] = useState(false);

  const download = () => {
    setDownloading(true);
    // A plain navigation, not fetch: the zip streams straight to disk instead of
    // being assembled in the tab's memory first.
    window.location.href = "/api/export";
    setTimeout(() => setDownloading(false), 4000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-800">Download everything</p>
        <p className="text-xs text-stone-500">
          Entries, photos, messages and verdicts, as a zip you can open without Riceee.
        </p>
      </div>
      <Button variant="outline" onClick={download} disabled={isDownloading} className="shrink-0">
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isDownloading ? "Preparing…" : "Download"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------- ending */

function EndSpaceDialog({ state, onDone }) {
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const matches = typed.trim().toLowerCase() === state.confirmationPhrase.toLowerCase();

  const submit = () => {
    startTransition(async () => {
      try {
        await beginClosure(typed);
        setOpen(false);
        setTyped("");
        toast.success("This space will close in 14 days.");
        onDone();
      } catch (error) {
        toast.error(error.message || "Couldn't do that.");
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
          End this space
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="z-[111]">
        <AlertDialogHeader>
          <AlertDialogTitle>End this space</AlertDialogTitle>
          <AlertDialogDescription asChild>
            {/* Factual, not persuasive. Nobody arrives here casually, and a
                product that argues back at this moment is a product people
                resent. State what happens; let them decide. */}
            <div className="space-y-3 text-sm">
              <p>Here&apos;s exactly what happens:</p>
              <ul className="list-disc space-y-1 pl-5 text-stone-600">
                <li>
                  Everything here stays readable, but nothing new can be added — no entries,
                  photos, messages or cases.
                </li>
                <li>You can change your mind any time in the next {state.cooldownDays} days.</li>
                <li>Both of you can download everything, now and afterwards.</li>
                <li>
                  After {state.cooldownDays} days it becomes two private archives — one each,
                  readable forever, that neither of you can edit.
                </li>
              </ul>
              <p className="text-stone-600">
                Your partner will be told the space is closing. They won&apos;t be told why.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label className="text-xs font-medium text-stone-600">
            Type <span className="font-semibold text-stone-900">{state.confirmationPhrase}</span> to
            confirm
          </label>
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={state.confirmationPhrase}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Never mind</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches || isPending}
            onClick={submit}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start the {state.cooldownDays}-day countdown
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------------------------------------------------------------- cooldown */

function CoolingDownView({ state, onDone }) {
  const [isPending, startTransition] = useTransition();

  const run = (action, message) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(message);
        onDone();
      } catch (error) {
        toast.error(error.message || "Couldn't do that.");
      }
    });
  };

  const days = state.daysRemaining ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm font-semibold text-amber-900">
          {days === 0
            ? "This space closes today"
            : `This space closes in ${days} ${days === 1 ? "day" : "days"}`}
        </p>
        <p className="mt-1 text-xs text-amber-800/80">
          Everything here stays readable and you can download all of it, but nothing new can be
          added. On {formatDate(state.closesAt)} it becomes two private archives — one for each of
          you.
        </p>
      </div>

      <ExportRow />

      <div className="flex flex-wrap gap-2">
        {/* Only the initiator can call it off. If either of them could, the one
            trying to leave could be held here indefinitely by the other one
            cancelling every time — so the flow only ever moves forward. */}
        {state.isInitiator ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => run(cancelClosure, "This space is no longer closing.")}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="mr-2 h-4 w-4" />
            )}
            Keep this space
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                Close it now
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-[111]">
              <AlertDialogHeader>
                <AlertDialogTitle>Close this space now?</AlertDialogTitle>
                <AlertDialogDescription>
                  This skips the rest of the countdown. You&apos;ll both keep a private archive of
                  everything, and you can still download it all afterwards. This can&apos;t be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Wait it out</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => run(closeSpaceNow, "This space is now archived.")}
                >
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Close it now
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- archived */

function ArchivedView({ state }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-stone-500" />
          <p className="text-sm font-semibold text-stone-800">This is an archive</p>
        </div>
        <p className="mt-1 text-xs text-stone-600">
          Closed on {formatDate(state.archivedAt)}. This copy is yours alone — everything in it
          stays readable for as long as you want it, and nothing anyone else does can change or
          remove it.
        </p>
      </div>
      <ExportRow />
    </div>
  );
}

/* -------------------------------------------------------------------- card */

export default function SpaceClosureCard({ state }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">Your data</h2>
        <p className="text-xs text-stone-500">
          Everything you&apos;ve written here is yours, and it stays yours.
        </p>
      </div>

      {state.isArchived ? (
        <ArchivedView state={state} />
      ) : state.isCoolingDown ? (
        <CoolingDownView state={state} onDone={refresh} />
      ) : (
        <div className="space-y-4">
          <ExportRow />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-800">End this space</p>
              <p className="text-xs text-stone-500">
                {state.hasPartner
                  ? `A ${state.cooldownDays}-day countdown, then two private archives.`
                  : `Closes this space after ${state.cooldownDays} days. You'll keep a readable archive.`}
              </p>
            </div>
            <EndSpaceDialog state={state} onDone={refresh} />
          </div>
        </div>
      )}
    </div>
  );
}
