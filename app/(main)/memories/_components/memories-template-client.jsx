"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { deleteMemory, updateMemoryCaption } from "@/actions/memory";
import { plusJakarta, manrope } from "@/lib/fonts";
import {
  AUTHOR_SLOTS,
  normalizeAuthorSlot,
  resolveAuthorName,
} from "@/lib/constants/players";

const fallbackImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDoQWZnKcJ5EF0m7f1iBNuNO1mvY-3XiWFeP7GqkLP0tDXVzdtSAXB-QD4JB6vaWRPU3ET9aEKfSofCXoLQIjGs0hvCeeAM2pGyrfDA2mY6SsVP9RMchbXYICGfUvSD8UQMklQ2GZftceQmVL4orWge1tPjEbVWdpYGsji21X6n6GVsuPNs8fGwotVTbHMzAAzssct-tsaVNuy1bCDpKE9faMOgEznzzeyIsUXdJfPN6LuofqWlcfazhyDSUiOa7R9Y4N6uk0anuBs",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDf3Rz7IyIB2DykPpR8zxaIg164vsGzfYo28tZ5qK3JuKOSslgA8QQ360R_WFG7c79MlhPQIWN5w9nz1oLoOchaX2T_qhDCfUvNL2o14j6gPbDYHGQ6pwPkzuu96xEZpiceSpd4WrbH9B4pbQeqbAfhxgvOAay_Bth5_3FS1TNnEOnWPkbwu2ejMJxOA-xSiytp7vhivyDK3lzPpLxoUQ50T1eW9N7pyUnqowlKHbYp2FO_LV13SKfrHruhOCX1sC3qACDJ1-gdsKU",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuB8ASQboOER6eb3unOr15cIOaEZ8ItSLVJvH-Ib5Et-uDFS4keVIISyJs9yMJ080BKP1AB7EOkQQAo9BbfBKDZH1nGyysP9-rbj8ipA5nn-s55DTxuZRG51CUPZWa6lEyEdVJaH0orHvsfbOKwtf3t5vAEpRSw67hbZoOFApJMxpExba3J-VBlY8vZHs8EplivSE3MA6ViLHcQkKrHp6XIUDqnRlOoxG-q3CFLLZb3uEvWIBRcaLBm7ALkPKNo6TTPnZ429buh96FU",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBhHx0JEJTQ8Jyl6xXk-S7fhAhzQHTxGqUQOp7iRfCN8R5SYZCMcgoU2Jt09jSVBn3GgzaPjBoUOm03GXPVr_k04dc-YH9bKYpSX7fW_kGAEGKDUSOCDyl0-U2ULiBECRRfw2B7sfG2kmkPBzwOe9R2vei7If_YP9Zp4hF_SKqLKWANd8GBs7cW3-ZEr121-6TCtZTEUltCm0haeHuLsQjZA_Ip7XhmS0gnBXRuoNAQsU5Ly8Hzr7fBUDp0A9uQrC8eGU3iNDIHnBc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCLIjoniYmuHUH8uE-JQ5Hs3Ssf36PhpSYDNAwqN9UaXXVolZ7zOxo7JA4-Sf750lm8ZFzzS1EO_VfMJPNu0ZK24KFOABWVoDa6ebQTMBvyvygkU--GDtEKa6LTewF_NLTbhZF75NuTEXT8S1S9ElTP7VJOFki8Sd2C2gdv1y-0nG6OaKtwvi4hb9_9Uj9jMAFODlUQYMPMSYOlXNnzisMNA0ii5PW1HZPBrCl0s1sbaujNLRQ_HT3TX16C8ccLNyC1fnzuYm5sYLw",
];

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

// Pull #hashtags out of a caption so they can render as sticker chips
// instead of raw text
function splitCaption(caption) {
  const text = caption || "";
  const tags = (text.match(/#[\p{L}\p{N}_]+/gu) || []).map((tag) => tag.slice(1));
  const clean = text.replace(/#[\p{L}\p{N}_]+/gu, "").replace(/\s+/g, " ").trim();
  return { clean, tags };
}

// Deterministic scrapbook scatter — static classes so Tailwind can see them
const TILT_CLASSES = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "-rotate-3", "rotate-1"];
const WASHI_COLORS = ["bg-[#ffd9e2]/80", "bg-[#ffae88]/70", "bg-[#fed07f]/70"];

function Postmark({ date }) {
  const d = new Date(date);
  return (
    <div className="shrink-0 h-16 w-16 rounded-full border-[1.5px] border-dashed border-[#9d4867]/45 text-[#9d4867]/80 rotate-6 flex flex-col items-center justify-center leading-none select-none">
      <span className="text-[7px] font-bold tracking-[0.22em]">RICEEE</span>
      <span className="my-1 text-[13px] font-black tracking-tight uppercase">
        {d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
      </span>
      <span className="text-[7px] font-bold tracking-[0.22em]">{d.getFullYear()}</span>
    </div>
  );
}

function uploaderTheme(value, partnerNames) {
  const one = partnerNames?.partnerOneName || "Partner 1";
  const two = partnerNames?.partnerTwoName || "Partner 2";
  const both = partnerNames?.bothLabel || `${one} x ${two}`;

  // Slot first. Comparing the stored value against the *current* name is what
  // broke here: rename a partner and every branch missed, so their photos
  // silently fell through to the "both" colour.
  const slot = normalizeAuthorSlot(value);
  if (slot === AUTHOR_SLOTS.ONE) return "bg-[#ffd9e2] text-[#863655]";
  if (slot === AUTHOR_SLOTS.TWO) return "bg-[#ffae88] text-[#6a2700]";
  if (slot === AUTHOR_SLOTS.BOTH) return "bg-[#fed07f] text-[#634500]";

  if (value === one || value === "Partner 1") {
    return "bg-[#ffd9e2] text-[#863655]";
  }

  if (value === two || value === "Partner 2") {
    return "bg-[#ffae88] text-[#6a2700]";
  }

  if (value === both || value === "Both Partners") {
    return "bg-[#fed07f] text-[#634500]";
  }

  return "bg-[#ebe8df] text-[#393832]";
}

export default function MemoriesTemplateClient({ initialMemories, stats, partnerNames }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [memories, setMemories] = useState(initialMemories || []);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return memories;

    return memories.filter((memory) => {
      const caption = (memory.caption || "").toLowerCase();
      // Match the name the user can actually see, not the slot behind it --
      // searching "praneeth" must still find photos stored as "hunter".
      const uploadedBy = resolveAuthorName(memory.uploadedBy, partnerNames).toLowerCase();
      return caption.includes(query) || uploadedBy.includes(query);
    });
  }, [memories, search, partnerNames]);

  const usage = Number(stats?.usagePercentage || 0);
  const usedText = `${formatBytes(stats?.totalSize)} of ${formatBytes(stats?.quotaLimit)} used`;

  const openPreview = (memory) => {
    setSelectedMemory(memory);
    setCaptionDraft(memory.caption || "");
    setIsEditingCaption(false);
  };

  const closePreview = () => {
    setSelectedMemory(null);
    setCaptionDraft("");
    setIsEditingCaption(false);
  };

  const saveCaption = async () => {
    if (!selectedMemory) return;

    setIsSavingCaption(true);
    try {
      const updated = await updateMemoryCaption(selectedMemory.id, captionDraft.trim());

      setMemories((prev) =>
        prev.map((memory) =>
          memory.id === selectedMemory.id ? { ...memory, caption: updated.caption } : memory
        )
      );
      setSelectedMemory((prev) => (prev ? { ...prev, caption: updated.caption } : prev));
      setIsEditingCaption(false);
      toast.success("Caption updated");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to update caption");
    } finally {
      setIsSavingCaption(false);
    }
  };

  const removeMemory = async () => {
    if (!selectedMemory) return;

    setIsDeleting(true);
    try {
      await deleteMemory(selectedMemory.id);
      setMemories((prev) => prev.filter((memory) => memory.id !== selectedMemory.id));
      closePreview();
      toast.success("Memory deleted");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to delete memory");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${manrope.className} text-[#393832] min-h-dvh relative overflow-x-hidden selection:bg-[#ffae88] selection:text-[#6a2700]`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');`}</style>
      <style>{`
        .hero-gradient {
          background: radial-gradient(circle at top right, rgba(255, 174, 136, 0.15), transparent 60%), radial-gradient(circle at bottom left, rgba(255, 217, 226, 0.2), transparent 60%);
        }
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
        /* Postage-stamp frame: tiled punch-holes show only in the padding
           ring; drop-shadow traces the perforated silhouette */
        .stamp-frame {
          padding: 12px;
          background-image: radial-gradient(circle, transparent 0 4.5px, #ffffff 5px);
          background-size: 16px 16px;
          background-position: center;
          filter: drop-shadow(0 2px 3px rgba(57, 56, 50, 0.12));
          transition: filter 0.3s ease;
        }
        .group:hover .stamp-frame {
          filter: drop-shadow(0 6px 10px rgba(57, 56, 50, 0.14));
        }
      `}</style>

      <div>
        {/* The (main) layout already supplies page-shell padding — this used to
            double it up and squeeze the wall on phones */}
        <main className="space-y-6 md:space-y-12">
          {/* MOBILE: a tight album header — the old hero card ate most of the
              first screen before you saw a single photo */}
          <section className="md:hidden space-y-3.5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className={`${plusJakarta.className} text-[2rem] leading-none font-extrabold text-[#ab4400] tracking-tight`}>
                  Memories
                </h1>
                <p className="mt-1.5 text-xs font-medium text-[#66645e]">
                  {memories.length} {memories.length === 1 ? "moment" : "moments"} kept
                  <span className="text-[#c3b5ab]"> · {usedText.replace(" used", "")}</span>
                </p>
              </div>

              <Link
                href="/memories/upload"
                aria-label="Upload a memory"
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#ab4400] text-white shadow-lg shadow-[#ab4400]/25 active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined">add_photo_alternate</span>
              </Link>
            </div>

            {/* Storage, as a hairline */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#f0ebe4]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ffae88] to-[#ab4400]"
                style={{ width: `${Math.max(2, Math.min(100, usage))}%` }}
              />
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#a09d95] text-[20px]">search</span>
              <input
                className="w-full rounded-full border border-[#efe9e2] bg-white py-3 pl-12 pr-4 text-sm text-[#393832] shadow-sm transition-shadow placeholder:text-[#c3b5ab] focus:border-[#ffae88] focus:outline-none focus:ring-2 focus:ring-[#ab4400]/10"
                placeholder="Search a moment..."
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </section>

          {/* DESKTOP: unchanged */}
          <section className="hidden md:block relative bg-white/40 border border-white/60 rounded-[2.5rem] p-12 overflow-hidden shadow-sm">
            <div className="absolute inset-0 hero-gradient -z-10" />
            <div className="flex flex-col items-center text-center space-y-6 mb-14">
            <h1 className={`${plusJakarta.className} text-7xl font-extrabold text-[#ab4400] tracking-tight`}>
              Cosmic Memories
            </h1>
            <div className="flex flex-col items-center gap-2">
              <div className="w-64 h-1 bg-[#ebe8df] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#ab4400] to-orange-400" style={{ width: `${Math.max(2, Math.min(100, usage))}%` }} />
              </div>
              <span className="text-[10px] font-bold text-[#66645e] uppercase tracking-[0.2em] opacity-60">
                {usedText}
              </span>
            </div>
            </div>

            <div className="max-w-4xl mx-auto mb-2">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#828079]">search</span>
                <input
                  className="w-full bg-[#ffffffd9] border border-[#bcb9b1]/20 rounded-full py-4 pl-14 pr-6 shadow-sm group-focus-within:shadow-md transition-shadow focus:ring-2 focus:ring-[#ab4400]/20 text-[#393832] placeholder:text-[#828079]/60"
                  placeholder="Search for a moment..."
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Link
                className="w-full md:w-auto bg-[#ab4400] text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#973b00] transition-all shadow-lg shadow-[#ab4400]/10 active:scale-95 whitespace-nowrap"
                href="/memories/upload"
              >
                <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                <span>Upload Memory</span>
              </Link>
            </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-9 md:gap-y-16 lg:pb-10">
            {filtered.map((memory, index) => {
              const imageUrl = memory.url || fallbackImages[index % fallbackImages.length];
              const tiltClass = TILT_CLASSES[index % TILT_CLASSES.length];
              const washiColor = WASHI_COLORS[index % WASHI_COLORS.length];
              const { clean, tags } = splitCaption(memory.caption);

              return (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.07, 0.6), ease: "easeOut" }}
                  className={`group ${index % 3 === 1 ? "lg:translate-y-10" : ""}`}
                >
                  <div
                    className={`stamp-frame cursor-pointer transition-transform duration-300 ease-out ${tiltClass} group-hover:rotate-0 group-hover:-translate-y-2`}
                    onClick={() => openPreview(memory)}
                  >
                    <div className="relative bg-white p-3 pb-4">
                      {/* Washi tape holding the stamp to the page */}
                      <div
                        className={`absolute -top-3.5 left-1/2 z-10 h-7 w-28 -translate-x-1/2 -rotate-3 rounded-[2px] ${washiColor}`}
                      />

                      {/* 4:5 is tall on a phone — a single stamp filled the whole
                          screen. 1:1 there, portrait on desktop. */}
                      <div className="relative aspect-square sm:aspect-[4/5] overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={clean || "Memory"}
                          fill
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                      </div>

                      <div className="flex items-start justify-between gap-3 px-1 pt-3">
                        <div className="min-w-0 space-y-1.5">
                          <h3 className={`${plusJakarta.className} font-semibold text-base sm:text-lg leading-snug text-[#393832]`}>
                            {clean || "A sweet memory"}
                          </h3>
                          {tags.length > 0 && (
                            <p className="text-[12px] italic lowercase leading-tight text-[#9d4867]/75">
                              {tags.join(" · ")}
                            </p>
                          )}
                          <div className="pt-0.5">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${uploaderTheme(memory.uploadedBy, partnerNames)}`}>
                              {resolveAuthorName(memory.uploadedBy, partnerNames)}
                            </span>
                          </div>
                        </div>
                        <Postmark date={memory.createdAt} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </section>

          {filtered.length === 0 && memories.length > 0 && (
            <div className="mt-16 text-center text-[#66645e]">No memories match your search yet.</div>
          )}

          {memories.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/memories/upload" className="group block max-w-xs">
                <div className="stamp-frame -rotate-2 transition-transform duration-300 group-hover:rotate-0 group-hover:-translate-y-2">
                  <div className="bg-white p-3 pb-5">
                    <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 border-2 border-dashed border-[#ffae88]/50 bg-[#fff8f3] text-center px-6">
                      <span className="material-symbols-outlined text-4xl text-[#ab4400]/50">add_photo_alternate</span>
                      <p className={`${plusJakarta.className} font-semibold text-[#6a2700]`}>Your first memory goes here</p>
                      <p className="text-xs text-[#828079]">Every great story starts with one photo.</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </main>

        {/* The app's global bottom nav already covers mobile — this page used
            to stack a second one on top of it.
            mt-16 clears the tilted stamps: rotation doesn't grow the layout box,
            so the last card's corner was landing on top of the footer. */}
        <footer className="mt-16 flex flex-col items-center justify-center gap-3 w-full text-center bg-transparent pb-2">
          <div className="flex gap-6 sm:gap-8">
            <Link className="text-[#9d4867] opacity-70 text-xs sm:text-sm italic hover:text-[#ab4400] transition-colors" href="/dashboard">Our Story</Link>
            <Link className="text-[#9d4867] opacity-70 text-xs sm:text-sm italic hover:text-[#ab4400] transition-colors" href="/settings">Privacy</Link>
            <Link className="text-[#9d4867] opacity-70 text-xs sm:text-sm italic hover:text-[#ab4400] transition-colors" href="/settings">Support</Link>
          </div>
          <p className="text-[#9d4867] text-xs sm:text-sm italic leading-relaxed">Handcrafted with love by Riceee © 2024</p>
        </footer>
      </div>

      {selectedMemory && (
        // z-[120] clears the mobile bottom nav (z-100), which was floating on
        // top of the photo. Tap the backdrop to close.
        <div
          className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm p-3 md:p-8 flex items-center justify-center"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-5xl max-h-[90dvh] overflow-y-auto scrollbar-hide bg-[#fffbff] rounded-[1.75rem] md:rounded-[2rem] border border-white/60 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative bg-[#f7f3ed] aspect-square md:aspect-auto md:min-h-[520px]">
                <Image
                  src={selectedMemory.url || fallbackImages[0]}
                  alt={selectedMemory.caption || "Memory"}
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                />
              </div>

              <div className="p-6 md:p-8 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${uploaderTheme(selectedMemory.uploadedBy, partnerNames)}`}>
                    {resolveAuthorName(selectedMemory.uploadedBy, partnerNames)}
                  </span>
                  <button
                    className="w-10 h-10 rounded-full bg-[#ebe8df] text-[#66645e] hover:text-[#ab4400] transition-colors"
                    type="button"
                    onClick={closePreview}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`${plusJakarta.className} text-2xl font-semibold text-[#393832] mb-2`}>
                      {new Date(selectedMemory.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h3>
                    <div className="text-sm text-[#828079]">
                      {new Date(selectedMemory.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <Postmark date={selectedMemory.createdAt} />
                </div>

                <label className={`${plusJakarta.className} text-sm font-semibold text-[#6a2700] mb-2`}>
                  Caption
                </label>

                {isEditingCaption ? (
                  <textarea
                    className="w-full min-h-[140px] bg-white border border-[#bcb9b1]/30 rounded-xl p-4 text-[#393832] placeholder:text-[#828079]/60 focus:ring-2 focus:ring-[#ab4400]/20"
                    value={captionDraft}
                    onChange={(event) => setCaptionDraft(event.target.value)}
                    placeholder="Add your memory caption..."
                  />
                ) : (
                  <div className="min-h-[140px] bg-[#fdf9f4] border border-[#bcb9b1]/20 rounded-xl p-4 text-[#393832]">
                    <p className="whitespace-pre-wrap">
                      {splitCaption(selectedMemory.caption).clean ||
                        (selectedMemory.caption ? "" : "No caption yet. Add one to preserve this memory.")}
                    </p>
                    {splitCaption(selectedMemory.caption).tags.length > 0 && (
                      <p className="mt-3 text-[13px] italic lowercase text-[#9d4867]/75">
                        {splitCaption(selectedMemory.caption).tags.join(" · ")}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {isEditingCaption ? (
                    <>
                      <button
                        className="px-5 py-2.5 rounded-full bg-[#ab4400] text-white font-semibold hover:bg-[#973b00] transition-colors disabled:opacity-60"
                        type="button"
                        onClick={saveCaption}
                        disabled={isSavingCaption}
                      >
                        {isSavingCaption ? "Saving..." : "Save Caption"}
                      </button>
                      <button
                        className="px-5 py-2.5 rounded-full bg-[#ebe8df] text-[#393832] font-medium hover:bg-[#dfdbd2] transition-colors"
                        type="button"
                        onClick={() => {
                          setCaptionDraft(selectedMemory.caption || "");
                          setIsEditingCaption(false);
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="px-5 py-2.5 rounded-full bg-[#ffd9e2] text-[#863655] font-medium hover:bg-[#ffcddc] transition-colors"
                      type="button"
                      onClick={() => setIsEditingCaption(true)}
                    >
                      Edit Caption
                    </button>
                  )}

                  <button
                    className="px-5 py-2.5 rounded-full bg-[#fa7150] text-white font-medium hover:bg-[#e76444] transition-colors disabled:opacity-60"
                    type="button"
                    onClick={removeMemory}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete Memory"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
