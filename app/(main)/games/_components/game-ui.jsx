"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { plusJakarta } from "@/lib/fonts";

// Shared visual system for every game: lobby, result, headers.
// Identity discs replace emoji avatars — same language as the app header.
const PLAYER_STYLES = {
  local: {
    disc: "bg-gradient-to-br from-[#ffae88] to-[#ab4400]",
    accent: "#ab4400",
    wash: "#fff4ec",
    edge: "#ffdfcf",
  },
  remote: {
    disc: "bg-gradient-to-br from-[#d3567f] to-[#9d4867]",
    accent: "#9d4867",
    wash: "#fff1f6",
    edge: "#ffd9e2",
  },
};

export function PlayerDisc({ name, kind = "local", size = "md", dim = false }) {
  const style = PLAYER_STYLES[kind];
  const sizes = {
    sm: "h-9 w-9 text-sm",
    md: "h-12 w-12 text-lg",
    lg: "h-16 w-16 text-2xl",
  };
  return (
    <div
      className={`${sizes[size]} ${style.disc} flex items-center justify-center rounded-full font-bold text-[#fff5f0] shadow-md transition-opacity ${dim ? "opacity-40" : ""}`}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function BackToArena({ label = "Arena" }) {
  return (
    <Link
      href="/games"
      className="group inline-flex items-center gap-2 rounded-full border border-[#efe9e2] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#66645e] shadow-sm transition-all hover:border-[#ffba99] hover:text-[#ab4400]"
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}

export function GameFrame({ children, size = "max-w-xl" }) {
  // The layout already pads for the floating header and the mobile bottom nav,
  // so the frame only claims what's left — no phantom scroll on either
  return (
    <div className="flex min-h-[calc(100dvh-15rem)] md:min-h-[calc(100dvh-10rem)] flex-col items-center justify-center py-2 md:pb-8">
      <div className={`mx-auto w-full ${size}`}>{children}</div>
    </div>
  );
}

// Mirrors LobbyScreen's layout exactly so the swap to real data is seamless
export function LobbySkeleton({ gameTitle }) {
  const Bar = ({ className = "" }) => (
    <div className={`animate-pulse rounded-full bg-[#f0ebe4] ${className}`} />
  );

  return (
    <GameFrame>
      <div className="mb-6 flex items-center justify-between">
        <BackToArena />
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9d4867]/60">
          Riceee Arcade
        </span>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
        <div className="border-b border-[#f5f2ee] px-7 pb-6 pt-7 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">The Lobby</p>
          <h1 className={`${plusJakarta.className} mt-2 text-3xl font-extrabold tracking-tight text-[#393832] sm:text-4xl`}>
            {gameTitle}
          </h1>
          <Bar className="mx-auto mt-3 h-3.5 w-56" />
        </div>

        <div className="space-y-6 p-6 sm:p-7">
          <div className="flex items-stretch gap-3 sm:gap-4">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-3 rounded-3xl border border-[#efe9e2] bg-white p-5"
              >
                <div className="h-16 w-16 animate-pulse rounded-full bg-[#f0ebe4]" />
                <Bar className="h-3.5 w-20" />
                <Bar className="h-2.5 w-12" />
                <Bar className="h-6 w-24" />
              </div>
            ))}
          </div>

          <div className="h-[68px] w-full animate-pulse rounded-2xl bg-[#f0ebe4]" />

          <p className="text-center text-[11px] font-medium text-[#a09d95]">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffae88] align-middle" />
            Setting up the table…
          </p>
        </div>
      </div>
    </GameFrame>
  );
}

function PlayerLobbyPanel({ name, kind, ready, connected = true, roleLabel }) {
  const style = PLAYER_STYLES[kind];
  return (
    <div
      className="flex flex-1 flex-col items-center gap-3 rounded-3xl border bg-white p-5 transition-all duration-300"
      style={{
        borderColor: ready ? style.accent : "#efe9e2",
        boxShadow: ready ? `0 12px 28px ${style.accent}22` : "none",
      }}
    >
      <PlayerDisc name={name} kind={kind} size="lg" dim={!connected} />
      <div className="min-w-0 text-center">
        <p className={`${plusJakarta.className} truncate text-sm font-bold text-[#393832]`}>{name}</p>
        {roleLabel && (
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: style.accent, opacity: 0.75 }}>
            {roleLabel}
          </p>
        )}
      </div>
      <span
        className="rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] transition-all"
        style={
          ready
            ? { backgroundColor: style.accent, color: "#fff" }
            : { backgroundColor: "#f5f2ee", color: "#a09d95" }
        }
      >
        {ready ? "Ready" : connected ? "Not ready" : "Joining…"}
      </span>
    </div>
  );
}

export function LobbyScreen({
  gameTitle,
  tagline,
  localName,
  remoteName,
  localReady,
  remoteReady,
  remoteConnected,
  onReady,
  localRole,
  remoteRole,
  children,
}) {
  return (
    <GameFrame>
      <div className="mb-6 flex items-center justify-between">
        <BackToArena />
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9d4867]/60">
          Riceee Arcade
        </span>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
        <div className="border-b border-[#f5f2ee] px-7 pb-6 pt-7 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">The Lobby</p>
          <h1 className={`${plusJakarta.className} mt-2 text-3xl font-extrabold tracking-tight text-[#393832] sm:text-4xl`}>
            {gameTitle}
          </h1>
          {tagline && <p className="mt-2 text-sm text-[#66645e]">{tagline}</p>}
        </div>

        <div className="space-y-6 p-6 sm:p-7">
          <div className="flex items-stretch gap-3 sm:gap-4">
            <PlayerLobbyPanel name={localName} kind="local" ready={localReady} roleLabel={localRole || "You"} />
            <div className="flex items-center">
              <span className={`${plusJakarta.className} text-lg font-extrabold italic text-[#d8d4cb]`}>vs</span>
            </div>
            <PlayerLobbyPanel
              name={remoteName}
              kind="remote"
              ready={remoteReady}
              connected={remoteConnected}
              roleLabel={remoteRole}
            />
          </div>

          {children}

          <button
            onClick={onReady}
            className={`w-full rounded-2xl py-5 text-base font-extrabold tracking-tight transition-all active:scale-[0.98] ${
              localReady
                ? "bg-[#f5f2ee] text-[#a09d95]"
                : "bg-[#ab4400] text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] hover:bg-[#973b00]"
            }`}
          >
            {localReady ? `Waiting for ${remoteName}…` : "I'm ready"}
          </button>

          {!remoteConnected && (
            <p className="text-center text-[11px] font-medium text-[#a09d95]">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffae88] align-middle" />
              Waiting for {remoteName} to open this game…
            </p>
          )}
        </div>
      </div>
    </GameFrame>
  );
}

export function TurnPill({ isLocalTurn, remoteName }) {
  return (
    <span
      className="rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors"
      style={
        isLocalTurn
          ? { backgroundColor: "#ab4400", borderColor: "#ab4400", color: "#fff" }
          : { backgroundColor: "#fff1f6", borderColor: "#ffd9e2", color: "#9d4867" }
      }
    >
      {isLocalTurn ? "Your move" : `${remoteName.split(" ")[0]}'s move`}
    </span>
  );
}

export function ResultScreen({
  outcome, // "win" | "lose" | "draw"
  localName,
  remoteName,
  onRematch,
  rematchLabel = "Run it back",
  headline,
  subline,
  children,
}) {
  const defaultHeadline =
    outcome === "win" ? "You took it." : outcome === "draw" ? "Dead even." : `${remoteName.split(" ")[0]} took it.`;
  const defaultSubline =
    outcome === "win"
      ? "Gloating rights are yours until the rematch."
      : outcome === "draw"
        ? "Nobody wins. Nobody makes the chai."
        : "There is only one honourable response: rematch.";

  return (
    <GameFrame>
      <div className="overflow-hidden rounded-[2rem] border border-[#efe9e2] bg-white shadow-[0_24px_56px_rgba(57,56,50,0.1)]">
        <div className="px-7 pb-7 pt-9 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ab4400]/70">Final Result</p>
          <h1 className={`${plusJakarta.className} mt-3 text-4xl font-extrabold tracking-tighter text-[#393832] sm:text-5xl`}>
            {headline || defaultHeadline}
          </h1>
          <p className="mt-3 text-sm text-[#66645e]">{subline || defaultSubline}</p>
        </div>

        <div className="space-y-6 px-6 pb-7 sm:px-7">
          <div className="flex items-stretch justify-center gap-3 sm:gap-4">
            <div
              className={`flex flex-1 max-w-[180px] flex-col items-center gap-2.5 rounded-3xl border p-5 transition-all ${
                outcome === "win" ? "border-[#ab4400] bg-[#fff4ec]" : "border-[#efe9e2] bg-white opacity-55"
              }`}
            >
              <PlayerDisc name={localName} kind="local" />
              <p className={`${plusJakarta.className} text-xs font-bold text-[#393832]`}>You</p>
              {outcome === "win" && (
                <span className="rounded-full bg-[#ab4400] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
                  Winner
                </span>
              )}
            </div>
            <div className="flex items-center">
              <span className={`${plusJakarta.className} text-lg font-extrabold italic text-[#d8d4cb]`}>vs</span>
            </div>
            <div
              className={`flex flex-1 max-w-[180px] flex-col items-center gap-2.5 rounded-3xl border p-5 transition-all ${
                outcome === "lose" ? "border-[#9d4867] bg-[#fff1f6]" : "border-[#efe9e2] bg-white opacity-55"
              }`}
            >
              <PlayerDisc name={remoteName} kind="remote" />
              <p className={`${plusJakarta.className} truncate max-w-full text-xs font-bold text-[#393832]`}>
                {remoteName.split(" ")[0]}
              </p>
              {outcome === "lose" && (
                <span className="rounded-full bg-[#9d4867] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
                  Winner
                </span>
              )}
            </div>
          </div>

          {children}

          <div className="flex flex-col gap-2.5">
            <button
              onClick={onRematch}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ab4400] py-5 text-base font-extrabold tracking-tight text-white shadow-[0_14px_30px_rgba(171,68,0,0.28)] transition-all hover:bg-[#973b00] active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              {rematchLabel}
            </button>
            <Link
              href="/games"
              className="w-full rounded-2xl py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-[#a09d95] transition-colors hover:text-[#ab4400]"
            >
              Back to Arena
            </Link>
          </div>
        </div>
      </div>
    </GameFrame>
  );
}
