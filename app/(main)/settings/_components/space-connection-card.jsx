"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Link2, Loader2, RefreshCw, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  createSpaceInvite,
  getSpaceStatus,
  joinSpaceWithCode,
  leaveSpace,
  previewSpaceInvite,
  removePartner,
} from "@/actions/space-invite";
import { CODE_LENGTH, formatCode, isCompleteCode, normalizeCode } from "@/lib/pairing";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MemberDisc({ name }) {
  return (
    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[#ffae88] to-[#ab4400] grid place-items-center text-white font-bold text-lg shadow-sm">
      {initialOf(name)}
    </div>
  );
}

/* ---------------------------------------------------------------- connected */

function ConnectedView({ status, onChanged }) {
  const [isPending, startTransition] = useTransition();
  const { members, isOwner, viewerClerkId } = status;

  const partner = members.find((member) => member.clerkUserId !== viewerClerkId);

  const disconnect = () => {
    startTransition(async () => {
      try {
        if (isOwner) {
          await removePartner(partner.clerkUserId);
          toast.success(`${partner.name} was removed from your space.`);
        } else {
          await leaveSpace();
          toast.success("You've left the space.");
        }
        onChanged();
      } catch (error) {
        toast.error(error.message || "Couldn't disconnect.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <p className="text-sm font-semibold text-emerald-700">Connected</p>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.clerkUserId}
            className="flex items-center gap-3 rounded-2xl border border-[#f0e4cd] bg-[#fffdf8] p-3"
          >
            <MemberDisc name={member.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#393832]">
                {member.name}
                {member.clerkUserId === viewerClerkId && (
                  <span className="ml-1.5 text-xs font-medium text-stone-400">(you)</span>
                )}
              </p>
              <p className="truncate text-xs text-stone-500">
                {member.isOwner
                  ? "Created this space"
                  : `Joined ${formatDate(member.joinedAt)}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {partner && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="text-stone-500 hover:text-red-600 hover:bg-red-50 -ml-2"
            >
              <UserMinus className="mr-1.5 h-4 w-4" />
              {isOwner ? "Remove partner" : "Leave this space"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isOwner ? `Remove ${partner.name}?` : "Leave this space?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isOwner
                  ? `${partner.name} will lose access to your journal, memories, and chat. Everything they wrote stays in the space. You can invite them back with a new code anytime.`
                  : "You'll lose access to this shared journal, and everything you wrote stays behind with your partner. You'll start over with an empty space of your own."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={disconnect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isOwner ? "Remove" : "Leave"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- share a code */

function ShareView({ status, onChanged }) {
  const [invite, setInvite] = useState(status.invite);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(null);

  const generate = () => {
    startTransition(async () => {
      try {
        setInvite(await createSpaceInvite());
      } catch (error) {
        toast.error(error.message || "Couldn't create a code.");
      }
    });
  };

  const copy = async (kind) => {
    const text =
      kind === "link"
        ? `${window.location.origin}/join/${invite.code}`
        : formatCode(invite.code);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  };

  // The partner joins in their own browser, so nothing tells this tab about it.
  // Poll while we're sitting on a live code, and refresh the moment they land.
  useEffect(() => {
    if (!invite) return undefined;

    const timer = setInterval(async () => {
      try {
        const next = await getSpaceStatus();
        if (next.isConnected) {
          toast.success("Your partner just connected!");
          onChanged();
        }
      } catch {
        // A failed poll is harmless — the next tick tries again.
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [invite, onChanged]);

  if (!invite) {
    return (
      <div className="space-y-4 text-center py-2">
        <p className="text-sm text-stone-500 max-w-sm mx-auto">
          Create a code, send it to your partner, and they type it in on their side.
          That&apos;s it — you&apos;ll share one journal.
        </p>
        <Button onClick={generate} disabled={isPending} className="bg-[#ab4400] hover:bg-[#8e3800]">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create pairing code"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-dashed border-[#e8d5b0] bg-[#fffdf8] px-4 py-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Your pairing code
        </p>
        <p className="mt-2 font-mono text-3xl sm:text-4xl font-bold tracking-[0.15em] text-[#ab4400] break-all">
          {formatCode(invite.code)}
        </p>
        <p className="mt-2 text-xs text-stone-400">
          Expires {formatDate(invite.expiresAt)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => copy("code")} className="border-[#e8d5b0]">
          {copied === "code" ? (
            <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="mr-1.5 h-4 w-4" />
          )}
          {copied === "code" ? "Copied" : "Copy code"}
        </Button>
        <Button variant="outline" onClick={() => copy("link")} className="border-[#e8d5b0]">
          {copied === "link" ? (
            <Check className="mr-1.5 h-4 w-4 text-emerald-600" />
          ) : (
            <Link2 className="mr-1.5 h-4 w-4" />
          )}
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Waiting for your partner...
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={generate}
          disabled={isPending}
          className="text-xs text-stone-500 hover:text-[#ab4400]"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          New code
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- enter a code */

function EnterView({ onChanged }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [isPending, startTransition] = useTransition();
  const latestCode = useRef("");

  const complete = isCompleteCode(code);

  // Check the code as soon as it's complete, so the partner sees whose space
  // they're about to walk into before they commit to anything.
  useEffect(() => {
    const clean = normalizeCode(code);
    latestCode.current = clean;

    if (clean.length !== CODE_LENGTH) {
      setPreview(null);
      return undefined;
    }

    let cancelled = false;
    setChecking(true);

    const timer = setTimeout(async () => {
      try {
        const result = await previewSpaceInvite(clean);
        // Ignore a slow response for a code the user has since edited.
        if (!cancelled && latestCode.current === clean) setPreview(result);
      } catch {
        if (!cancelled) setPreview({ ok: false, blocker: "Couldn't check that code." });
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code]);

  const connect = () => {
    startTransition(async () => {
      try {
        const result = await joinSpaceWithCode(code);
        toast.success(result.message || "Connected!");
        onChanged();
      } catch (error) {
        toast.error(error.message || "Couldn't connect.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 text-center max-w-sm mx-auto">
        Type the code your partner sent you.
      </p>

      <input
        value={formatCode(code)}
        onChange={(event) => setCode(normalizeCode(event.target.value))}
        placeholder="ABCD-EFGH"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        inputMode="text"
        aria-label="Pairing code"
        className="w-full rounded-2xl border-2 border-[#e8d5b0] bg-[#fffdf8] px-4 py-5 text-center font-mono text-2xl sm:text-3xl font-bold uppercase tracking-[0.15em] text-[#393832] placeholder:text-stone-300 placeholder:tracking-[0.15em] outline-none transition-colors focus:border-[#ab4400]"
      />

      {checking && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking code...
        </p>
      )}

      {!checking && preview && !preview.ok && (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-600">
          {preview.blocker}
        </p>
      )}

      {!checking && preview?.ok && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#f0e4cd] bg-[#fffdf8] p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              You&apos;re joining
            </p>
            <p className="mt-1 text-lg font-bold text-[#393832]">{preview.space.title}</p>
            <p className="mt-1 text-xs text-stone-500">
              {preview.space.entries} {preview.space.entries === 1 ? "entry" : "entries"}
              {" · "}
              {preview.space.memories} {preview.space.memories === 1 ? "memory" : "memories"}
              {" · "}
              since {formatDate(preview.space.since)}
            </p>
          </div>
          <Button
            onClick={connect}
            disabled={isPending}
            className="w-full bg-[#ab4400] hover:bg-[#8e3800]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              `Connect to ${preview.space.title}`
            )}
          </Button>
        </div>
      )}

      {!complete && code.length > 0 && (
        <p className="text-center text-xs text-stone-400">
          {CODE_LENGTH - normalizeCode(code).length} more{" "}
          {CODE_LENGTH - normalizeCode(code).length === 1 ? "character" : "characters"}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- shell */

export default function SpaceConnectionCard({ status }) {
  const router = useRouter();
  const [tab, setTab] = useState("share");

  const onChanged = useCallback(() => router.refresh(), [router]);

  return (
    <div className="rounded-3xl border border-[#f0e4cd] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#393832]">Your partner</h2>
        <p className="text-sm text-stone-500">
          {status.isConnected
            ? "You're sharing this journal with each other."
            : "Connect two accounts to share one journal."}
        </p>
      </div>

      {status.isConnected ? (
        <ConnectedView status={status} onChanged={onChanged} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-[#f6efe2] p-1">
            {[
              { id: "share", label: "Invite partner" },
              { id: "enter", label: "I have a code" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTab(option.id)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                  tab === option.id
                    ? "bg-white text-[#ab4400] shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {tab === "share" ? (
            <ShareView status={status} onChanged={onChanged} />
          ) : (
            <EnterView onChanged={onChanged} />
          )}
        </>
      )}
    </div>
  );
}
