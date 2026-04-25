"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMemory, updateMemoryCaption } from "@/actions/memory";
import { plusJakarta, manrope } from "@/lib/fonts";

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

function uploaderTheme(value, partnerNames) {
  const one = partnerNames?.partnerOneName || "Partner 1";
  const two = partnerNames?.partnerTwoName || "Partner 2";
  const both = partnerNames?.bothLabel || `${one} x ${two}`;

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
      const uploadedBy = (memory.uploadedBy || "").toLowerCase();
      return caption.includes(query) || uploadedBy.includes(query);
    });
  }, [memories, search]);

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
    <div className={`${manrope.className} bg-[#fffbff] text-[#393832] min-h-dvh relative overflow-x-hidden selection:bg-[#ffae88] selection:text-[#6a2700]`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');`}</style>
      <style>{`
        .paper-grain {
          background-image: url(https://lh3.googleusercontent.com/aida/ADBb0ugl7r1oOHE4zCR_sKi8RK7Mtdx3ISHK1IZ0MBtT-kJGasZy58BqnL1thgxavaUGY-Qae83LCT7T8K6xu2K2LHofpluC3UyJmRAWpbllLI4KDowKGokcsm5-8mKkzug7L5oOJ3Mu2pZpii4vbrR3533r8g2ISHhzRoNUtduDkDyQ1WppEShT3X4ezOA9kZXltWFh5zCfl6ZOVbRGDF1toBY5l65ZuHp7_55gQriYMJumYHHHZ33pnHUsl5SbLLmlLBmYpp2IHJqe);
          background-size: 600px;
          opacity: 0.25;
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        .hero-gradient {
          background: radial-gradient(circle at top right, rgba(255, 174, 136, 0.15), transparent 60%), radial-gradient(circle at bottom left, rgba(255, 217, 226, 0.2), transparent 60%);
        }
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
        .polaroid-tilt-left { transform: rotate(-1deg); }
        .polaroid-tilt-right { transform: rotate(1.5deg); }
      `}</style>

      <div className="fixed inset-0 paper-grain z-[60] pointer-events-none" />

      <div>
        <main className="page-shell pt-12 pb-24 space-y-12">
          <section className="relative bg-white/40 border border-white/60 rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-sm">
            <div className="absolute inset-0 hero-gradient -z-10" />
            <div className="flex flex-col items-center text-center space-y-6 mb-14">
            <h1 className={`${plusJakarta.className} text-5xl md:text-7xl font-extrabold text-[#ab4400] tracking-tight`}>
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

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
            {filtered.map((memory, index) => {
              const tiltClass = index % 3 === 0 ? "polaroid-tilt-left" : index % 3 === 1 ? "polaroid-tilt-right" : "";
              const imageUrl = memory.url || fallbackImages[index % fallbackImages.length];

              return (
                <div key={memory.id} className={`${tiltClass} group`}>
                  <div className="bg-white p-5 pb-12 rounded-sm shadow-[0_10px_30px_rgba(57,56,50,0.08)] transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(57,56,50,0.12)]">
                    <div
                      className="relative aspect-[4/5] overflow-hidden mb-6 cursor-pointer"
                      onClick={() => openPreview(memory)}
                    >
                      <img className="w-full h-full object-cover" src={imageUrl} alt={memory.caption || "Memory"} />
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button
                          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#9d4867] hover:text-[#ab4400] transition-colors"
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>favorite</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 px-1">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className={`${plusJakarta.className} font-bold text-xl text-[#393832] leading-tight`}>
                          {memory.caption || "A sweet memory"}
                        </h3>
                        <span className="text-xs uppercase tracking-widest text-[#828079] whitespace-nowrap">
                          {new Date(memory.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${uploaderTheme(memory.uploadedBy, partnerNames)}`}>
                          {memory.uploadedBy || "Both Partners"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {filtered.length === 0 && (
            <div className="mt-16 text-center text-[#66645e]">No memories match your search yet.</div>
          )}

          <div className="mt-24 flex justify-center">
            <button
              className="bg-[#fdf9f4] text-[#ab4400] px-10 py-4 rounded-full font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-3 active:scale-95"
              type="button"
              onClick={() => setSearch("")}
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              Uncover More Memories
            </button>
          </div>
        </main>

        <div className="md:hidden fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex justify-around items-center px-6 py-4 max-w-md mx-auto bg-[#fffbff]/70 backdrop-blur-xl rounded-full shadow-[0_20px_50px_rgba(57,56,50,0.1)]">
          <Link className="flex flex-col items-center justify-center bg-[#ab4400] text-white rounded-full w-12 h-12 hover:scale-110 transition-transform duration-150" href="/memories">
            <span className="material-symbols-outlined">auto_awesome</span>
          </Link>
          <Link className="flex flex-col items-center justify-center text-[#9d4867] opacity-60 hover:scale-110 transition-transform duration-150" href="/dashboard#collections">
            <span className="material-symbols-outlined">library_books</span>
          </Link>
          <Link className="flex flex-col items-center justify-center text-[#9d4867] opacity-60 hover:scale-110 transition-transform duration-150" href="/games">
            <span className="material-symbols-outlined">videogame_asset</span>
          </Link>
        </div>

        <footer className="flex flex-col items-center justify-center space-y-4 w-full text-center bg-transparent pb-12">
          <div className="flex gap-8">
            <Link className="text-[#9d4867] opacity-70 text-sm italic hover:text-[#ab4400] transition-colors" href="/dashboard">Our Story</Link>
            <Link className="text-[#9d4867] opacity-70 text-sm italic hover:text-[#ab4400] transition-colors" href="/settings">Privacy</Link>
            <Link className="text-[#9d4867] opacity-70 text-sm italic hover:text-[#ab4400] transition-colors" href="/settings">Support</Link>
          </div>
          <p className="text-[#9d4867] text-sm italic leading-relaxed">Handcrafted with love by Riceee © 2024</p>
        </footer>
      </div>

      {selectedMemory && (
        <div className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-5xl bg-[#fffbff] rounded-[2rem] border border-white/60 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative bg-[#f7f3ed] min-h-[320px] md:min-h-[520px]">
                <img
                  alt={selectedMemory.caption || "Memory"}
                  className="absolute inset-0 h-full w-full object-cover"
                  src={selectedMemory.url || fallbackImages[0]}
                />
              </div>

              <div className="p-6 md:p-8 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${uploaderTheme(selectedMemory.uploadedBy, partnerNames)}`}>
                    {selectedMemory.uploadedBy || "Both Partners"}
                  </span>
                  <button
                    className="w-10 h-10 rounded-full bg-[#ebe8df] text-[#66645e] hover:text-[#ab4400] transition-colors"
                    type="button"
                    onClick={closePreview}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <h3 className={`${plusJakarta.className} text-2xl font-semibold text-[#393832] mb-2`}>
                  {new Date(selectedMemory.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>

                <div className="text-sm text-[#828079] mb-6">
                  {new Date(selectedMemory.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
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
                  <div className="min-h-[140px] bg-[#fdf9f4] border border-[#bcb9b1]/20 rounded-xl p-4 text-[#393832] whitespace-pre-wrap">
                    {selectedMemory.caption || "No caption yet. Add one to preserve this memory."}
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
