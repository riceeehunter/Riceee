"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinSpaceWithCode } from "@/actions/space-invite";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AcceptInviteCard({ code, preview }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const connect = () => {
    startTransition(async () => {
      try {
        await joinSpaceWithCode(code);
        toast.success("You're connected!");
        router.push("/dashboard");
      } catch (error) {
        toast.error(error.message || "Couldn't connect.");
      }
    });
  };

  if (!preview?.ok) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-[#f0e4cd] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#393832]">Can&apos;t use this invite</h1>
        <p className="mt-2 text-sm text-stone-500">{preview?.blocker}</p>
        <Button asChild variant="outline" className="mt-6 border-[#e8d5b0]">
          <Link href="/settings">Go to settings</Link>
        </Button>
      </div>
    );
  }

  const { space } = preview;

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#f0e4cd] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#ffae88] to-[#ab4400] shadow-sm">
        <Heart className="h-7 w-7 text-white" fill="currentColor" />
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
        You&apos;ve been invited to
      </p>
      <h1 className="mt-1 text-2xl font-bold text-[#393832]">{space.title}</h1>
      <p className="mt-2 text-xs text-stone-500">
        {space.entries} {space.entries === 1 ? "entry" : "entries"}
        {" · "}
        {space.memories} {space.memories === 1 ? "memory" : "memories"}
        {" · "}
        since {formatDate(space.since)}
      </p>

      <p className="mt-5 text-sm text-stone-500">
        Connect and you&apos;ll share one journal — entries, memories, chat, and games,
        all in the same place.
      </p>

      <Button
        onClick={connect}
        disabled={isPending}
        className="mt-6 w-full bg-[#ab4400] hover:bg-[#8e3800]"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect"
        )}
      </Button>
    </div>
  );
}
