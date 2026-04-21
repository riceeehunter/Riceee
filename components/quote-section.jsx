"use client";

import { useState, useEffect } from "react";

const QUOTES = [
  {
    text: "In you, I found the home I never knew I was searching for.",
    author: "— with you, always",
  },
  {
    text: "Every love story is beautiful, but ours is my favourite.",
    author: "— always & forever",
  },
  {
    text: "You're my person. The one I choose, every single day.",
    author: "— written in the stars",
  },
  {
    text: "I fell in love the way you fall asleep — slowly, and then all at once.",
    author: "— John Green",
  },
  {
    text: "Whatever our souls are made of, yours and mine are the same.",
    author: "— Emily Brontë",
  },
  {
    text: "To love and be loved is to feel the sun from both sides.",
    author: "— David Viscott",
  },
  {
    text: "The best thing to hold onto in life is each other.",
    author: "— Audrey Hepburn",
  },
  {
    text: "You are my today and all of my tomorrows.",
    author: "— Leo Christopher",
  },
];

export default function QuoteSection({ plusJakartaClassName }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % QUOTES.length);
        setVisible(true);
      }, 700);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[current];

  return (
    <section className="page-shell">
      <style>{`
        @keyframes quoteFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orbPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.08); }
        }
        @keyframes quoteFadeIn {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes quoteFadeOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-18px) scale(0.98); }
        }
        .quote-fade-in { animation: quoteFadeIn 0.7s ease forwards; }
        .quote-fade-out { animation: quoteFadeOut 0.7s ease forwards; }
        .quote-float { animation: quoteFloat 6s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #ab4400 0%, #9d4867 25%, #c0634a 50%, #9d4867 75%, #ab4400 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .qs-orb { animation: orbPulse 4s ease-in-out infinite; }
      `}</style>

      <div className="relative rounded-[3rem] overflow-hidden border border-[#ffd9e2]/30 shadow-xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fff7f0] via-[#fdf4f8] to-[#fff0f4]" />
        {/* Orbs */}
        <div className="qs-orb absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#ffae88]/30 to-[#ffd9e2]/20 blur-3xl pointer-events-none" />
        <div
          className="qs-orb absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-[#ffd9e2]/25 to-[#ffae88]/15 blur-3xl pointer-events-none"
          style={{ animationDelay: "2s" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-10 md:px-24 py-20 md:py-28 gap-10">
          {/* Floating quote mark */}
          <div className="quote-float select-none">
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "7rem",
                lineHeight: 1,
                color: "#ab4400",
                opacity: 0.15,
                display: "block",
                marginBottom: "-2rem",
              }}
            >
              &ldquo;
            </span>
          </div>

          {/* Quote + author */}
          <div className="min-h-[10rem] flex flex-col items-center justify-center gap-6">
            <blockquote
              className={`${plusJakartaClassName} text-3xl md:text-5xl font-bold text-[#393832] leading-tight tracking-tight max-w-3xl italic ${visible ? "quote-fade-in" : "quote-fade-out"}`}
            >
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p
              className={`text-sm font-semibold tracking-widest uppercase shimmer-text ${visible ? "quote-fade-in" : "quote-fade-out"}`}
              style={{ animationDelay: "0.1s" }}
            >
              {quote.author}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-2 mt-2">
            {QUOTES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setVisible(false);
                  setTimeout(() => {
                    setCurrent(i);
                    setVisible(true);
                  }, 700);
                }}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: "#ab4400",
                  opacity: i === current ? 1 : 0.25,
                  transform: i === current ? "scale(1.4)" : "scale(1)",
                  transition: "all 0.3s",
                  padding: 0,
                }}
                aria-label={`Quote ${i + 1}`}
              />
            ))}
          </div>

          {/* Tagline */}
          <div className="flex items-center gap-2 text-[#9d4867]/40 text-xs tracking-widest uppercase font-bold select-none">
            <span>✦</span>
            <span>with love, always</span>
            <span>✦</span>
          </div>
        </div>
      </div>
    </section>
  );
}
