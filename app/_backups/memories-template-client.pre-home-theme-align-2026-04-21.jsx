"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans, Manrope } from "next/font/google";
import UploadMemory from "./upload-memory";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

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
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [memories, setMemories] = useState(initialMemories || []);

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

  return (
    <div className={`${manrope.className} bg-[#fffbff] text-[#393832] min-h-screen relative overflow-x-hidden`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');`}</style>
      <style>{`
        .paper-texture {
          background-image: url(https://lh3.googleusercontent.com/aida-public/AB6AXuDhg1nhkKBfTPDYjjxedmHFZv2AvlDHh0yJlfSGVtc5eupaVoubxCn7lDtIk3ozBHQvbhUWEdUqGEgga6e-0emXrT3Vo062L73cTaM2tEwXgVtAHSQlgRBXOLl4fI0lq9YzPwRssP4k3tQAw6WqddKvlsUj6bqZdjPFGwHiO0CwIuKCCIic-yceDH-gkPtxDxluUsKbE9k0Kez8RZz-DWuKbsm3xllNtuo6RR_NYtErb-u9Sy1fBK_qQ_s613YcDB48XLb6uiw9n1Q);
          background-repeat: repeat;
          background-size: 600px;
          background-blend-mode: soft-light;
        }
        .material-symbols-outlined {
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }
        .polaroid-tilt-left { transform: rotate(-1deg); }
        .polaroid-tilt-right { transform: rotate(1.5deg); }
      `}</style>

      <div className="paper-texture">
        <main className="max-w-7xl mx-auto px-6 md:px-8 pt-36 pb-28">
          <div className="flex flex-col items-center text-center space-y-6 mb-20">
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

          <div className="max-w-4xl mx-auto mb-16">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full group">
                <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#828079]">search</span>
                <input
                  className="w-full bg-white border-none rounded-full py-4 pl-14 pr-6 shadow-sm group-focus-within:shadow-md transition-shadow focus:ring-2 focus:ring-[#ab4400]/20 text-[#393832] placeholder:text-[#828079]/60"
                  placeholder="Search for a moment..."
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                className="w-full md:w-auto bg-[#ab4400] text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#973b00] transition-all shadow-lg shadow-[#ab4400]/10 active:scale-95 whitespace-nowrap"
                type="button"
                onClick={() => setUploadOpen(true)}
              >
                <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                <span>Upload Memory</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filtered.map((memory, index) => {
              const tiltClass = index % 3 === 0 ? "polaroid-tilt-left" : index % 3 === 1 ? "polaroid-tilt-right" : "";
              const imageUrl = memory.url || fallbackImages[index % fallbackImages.length];

              return (
                <div key={memory.id} className={`${tiltClass} group`}>
                  <div className="bg-white p-5 pb-12 rounded-sm shadow-[0_10px_30px_rgba(57,56,50,0.08)] transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(57,56,50,0.12)]">
                    <div className="relative aspect-[4/5] overflow-hidden mb-6">
                      <img className="w-full h-full object-cover" src={imageUrl} alt={memory.caption || "Memory"} />
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#9d4867] hover:text-[#ab4400] transition-colors" type="button">
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
          </div>

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

        <button
          className="fixed bottom-10 right-10 w-16 h-16 bg-gradient-to-br from-[#ab4400] to-[#973b00] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-[60]"
          type="button"
          onClick={() => setUploadOpen(true)}
        >
          <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
        </button>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-6 py-4 max-w-md mx-auto bg-[#fffbff]/70 backdrop-blur-xl rounded-full mb-6 shadow-[0_20px_50px_rgba(57,56,50,0.1)]">
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

      {uploadOpen && (
        <UploadMemory
          onClose={() => setUploadOpen(false)}
          partnerNames={partnerNames}
          onSuccess={(newMemory) => {
            setMemories([newMemory, ...memories]);
            setUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}
