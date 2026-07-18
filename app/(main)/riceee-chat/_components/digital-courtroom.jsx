"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Gavel,
  PlusCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Send,
  Trash2,
  Sparkles,
  ScrollText,
  Feather,
  Heart,
  Scale,
} from "lucide-react";
import {
  getCases,
  fileCase,
  submitResponse,
  deleteCase,
  generateHeartContract,
  signHeartContract,
} from "@/actions/courtroom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { plusJakarta, signature } from "@/lib/fonts";

// Riceee's colours: rose for the one who filed, terracotta for the one who
// answered, gold for shared ground. Same warmth as the rest of the app so the
// courtroom never feels like a cold place you got dragged into.
const ROSE = "#9d4867";
const TERRA = "#ab4400";

// cat-ai.png ships on a white background, so it must be clipped to a circle or
// it renders as a white square. overflow-hidden + a matching white fill hides
// the corners cleanly without cropping the cat's ears.
function JudgeCat({ size = 64, className = "" }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src="/cat-ai.png" alt="The Honourable Riceee" width={size} height={size} className="h-full w-full object-contain" />
    </span>
  );
}

export default function DigitalCourtroom({ partnerNames = ["User A", "User B"] }) {
  const [cases, setCases] = useState([]);
  const [view, setView] = useState("list"); // list | file | respond | deliberating | view
  const [activeCase, setActiveCase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newPerspective, setNewPerspective] = useState("");
  const [currentUserIdx, setCurrentUserIdx] = useState(0); // 0 or 1

  const resolveName = (storedName) => {
    if (storedName === "P1") return partnerNames[0];
    if (storedName === "P2") return partnerNames[1];
    return storedName; // Legacy rows stored a raw name
  };

  const currentUserRole = `P${currentUserIdx + 1}`;

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    setIsLoading(true);
    const res = await getCases();
    if (res.success) setCases(res.data);
    setIsLoading(false);
  }

  async function handleFileCase() {
    if (!newTitle || !newPerspective) return toast.error("Give your case a title and your side of it.");
    setIsSubmitting(true);
    const res = await fileCase({ title: newTitle, perspective: newPerspective, author: currentUserRole });
    if (res.success) {
      toast.success("Filed. Your partner has been summoned.");
      setNewTitle("");
      setNewPerspective("");
      setView("list");
      fetchCases();
    } else {
      toast.error(res.error || "Couldn't file that.");
    }
    setIsSubmitting(false);
  }

  async function handleSubmitResponse(caseId) {
    if (!newPerspective) return toast.error("Tell Riceee your side first.");

    // The 8s wait IS the drama now — a whole deliberation scene, not a spinner.
    setView("deliberating");
    setIsSubmitting(true);

    try {
      const res = await submitResponse({ caseId, perspective: newPerspective, author: currentUserRole });
      if (res.success) {
        setNewPerspective("");
        setActiveCase(res.data);
        setView("view");
        fetchCases();
      } else {
        toast.error(res.error || "The court couldn't rule. Try again.");
        setView("respond");
      }
    } catch {
      toast.error("Something interrupted the ruling. Try again.");
      setView("respond");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    const res = await deleteCase(id);
    if (res.success) {
      setCases((prev) => prev.filter((c) => c.id !== id));
      toast.success("Case dismissed.");
    }
  }

  const openCases = cases.filter((c) => c.status === "OPEN");
  const closedCases = cases.filter((c) => c.status === "CLOSED");
  const showHeaderControls = view === "list";

  return (
    <div className={`${plusJakarta.className} flex-1 w-full max-w-5xl mx-auto flex flex-col gap-7 pb-6 px-4 md:px-6`}>
      {/* ── The bench: Riceee presides ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#f0e2c8] bg-gradient-to-br from-[#fffaf2] via-[#fff6ea] to-[#fdeede] px-6 py-6 shadow-sm">
        {/* soft courtroom glow */}
        <div className="pointer-events-none absolute -top-16 right-8 h-40 w-40 rounded-full bg-[#ffd9a8]/40 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#ffcf9a]/50 blur-md" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#f0d9b8] bg-white/80 shadow-inner">
                <JudgeCat size={52} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[#3d2b22]">Riceee&apos;s Court</h2>
                <Scale size={15} className="text-[#c68a3c]" />
              </div>
              <p className="mt-0.5 text-[11px] font-semibold text-[#a9825f]">
                The Honourable Riceee presiding · blunt, fair, on your side
              </p>
            </div>
          </div>

          {showHeaderControls && (
            <button
              onClick={() => setView("file")}
              className="hidden sm:flex items-center gap-2 rounded-full bg-[#ab4400] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#ab4400]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
            >
              <PlusCircle size={14} />
              Bring a case
            </button>
          )}
        </div>

        {/* identity switcher — who's speaking right now */}
        {showHeaderControls && (
          <div className="relative mt-5 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#bfa588]">Speaking as</span>
            <div className="flex items-center gap-1 rounded-full border border-[#f0e2c8] bg-white/70 p-1">
              {partnerNames.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => setCurrentUserIdx(idx)}
                  className={`rounded-full px-4 py-1.5 text-[11px] font-black tracking-wide transition-all ${
                    currentUserIdx === idx
                      ? "text-white shadow-sm"
                      : "text-[#a9825f] hover:text-[#7c5a3f]"
                  }`}
                  style={currentUserIdx === idx ? { backgroundColor: idx === 0 ? ROSE : TERRA } : undefined}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Back button for sub-views */}
      {view !== "list" && view !== "deliberating" && (
        <button
          onClick={() => setView("list")}
          className="group -mb-2 flex w-fit items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#a9825f] transition-colors hover:text-[#7c5a3f]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff2e2] transition-colors group-hover:bg-[#ffe4c9]">
            <ChevronLeft size={15} />
          </span>
          Back to the docket
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* ── DOCKET ─────────────────────────────────────────────── */}
        {view === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-7"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ffd9a8] border-t-[#ab4400]" />
              </div>
            ) : cases.length === 0 ? (
              <div className="flex flex-col items-center gap-5 py-16 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#ffe4c9]/60 blur-xl" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#f0e2c8] bg-white/80">
                    <JudgeCat size={68} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-lg font-black text-[#3d2b22]">The court is at peace</p>
                  <p className="mx-auto max-w-xs text-sm leading-relaxed text-[#a9825f]">
                    No cases on the docket. When a fight needs a fair, final word, Riceee is ready to hear it.
                  </p>
                </div>
                <button
                  onClick={() => setView("file")}
                  className="mt-1 flex items-center gap-2 rounded-full bg-[#ab4400] px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-[#ab4400]/25 transition-all hover:-translate-y-0.5"
                >
                  <PlusCircle size={14} />
                  Bring the first case
                </button>
              </div>
            ) : (
              <>
                {openCases.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <Clock size={13} className="text-[#c68a3c]" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a9825f]">Awaiting testimony</span>
                    </div>
                    {openCases.map((c) => (
                      <CaseCard
                        key={c.id}
                        caseData={c}
                        resolveName={resolveName}
                        onClick={() => {
                          setActiveCase(c);
                          setView("respond");
                        }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </section>
                )}

                {closedCases.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a9825f]">Ruled</span>
                    </div>
                    {closedCases.map((c) => (
                      <CaseCard
                        key={c.id}
                        caseData={c}
                        resolveName={resolveName}
                        ruled
                        onClick={() => {
                          setActiveCase(c);
                          setView("view");
                        }}
                        onDelete={handleDelete}
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </motion.div>
        ) : view === "file" ? (
          /* ── FILE A CASE ──────────────────────────────────────── */
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <TestimonyForm
              heading="State your case"
              sub={`Tell Riceee exactly what happened, in your own words. ${partnerNames[currentUserIdx]} is speaking.`}
              accent={currentUserIdx === 0 ? ROSE : TERRA}
              title={newTitle}
              onTitle={setNewTitle}
              perspective={newPerspective}
              onPerspective={setNewPerspective}
              submitLabel={isSubmitting ? "Filing…" : "File the case"}
              submitIcon={<Send size={13} />}
              onSubmit={handleFileCase}
              disabled={isSubmitting}
            />
          </motion.div>
        ) : view === "respond" ? (
          /* ── RESPOND ──────────────────────────────────────────── */
          <motion.div
            key="respond"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {activeCase?.sideAAuthor === currentUserRole ? (
              <WaitingForPartner
                title={activeCase?.title}
                partnerName={partnerNames[currentUserIdx === 0 ? 1 : 0]}
              />
            ) : (
              <TestimonyForm
                heading="Your answer"
                sub={`${resolveName(activeCase?.sideAAuthor)} filed “${activeCase?.title}”. Give Riceee your side — then the ruling comes.`}
                accent={TERRA}
                lockedTitle={activeCase?.title}
                perspective={newPerspective}
                onPerspective={setNewPerspective}
                submitLabel={isSubmitting ? "Submitting…" : "Submit & be judged"}
                submitIcon={<Gavel size={14} />}
                onSubmit={() => handleSubmitResponse(activeCase.id)}
                disabled={isSubmitting}
              />
            )}
          </motion.div>
        ) : view === "deliberating" ? (
          /* ── DELIBERATION ─────────────────────────────────────── */
          <Deliberating key="deliberating" caseTitle={activeCase?.title} />
        ) : (
          /* ── VERDICT ──────────────────────────────────────────── */
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <JudgementView
              caseData={activeCase}
              partnerNames={partnerNames}
              resolveName={resolveName}
              currentUserRole={currentUserRole}
              onCaseUpdate={(updated) => {
                setActiveCase(updated);
                setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function CaseCard({ caseData, onClick, onDelete, resolveName, ruled }) {
  let verdict = null;
  if (ruled) {
    try {
      verdict = JSON.parse(caseData.judgement || "{}");
    } catch {
      verdict = null;
    }
  }
  const winnerName =
    verdict?.winner === "A"
      ? resolveName(caseData.sideAAuthor)
      : verdict?.winner === "B"
        ? resolveName(caseData.sideBAuthor)
        : null;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#f0e2c8] bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-[#ffcf9a] hover:bg-white hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
            ruled ? "bg-emerald-50 text-emerald-600" : "bg-[#fff2e2] text-[#c68a3c]"
          }`}
        >
          {ruled ? <Gavel size={18} /> : <Clock size={18} />}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-black text-[#3d2b22]">{caseData.title}</h4>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[#a9825f]">
            {ruled && winnerName ? (
              <>
                Riceee ruled for <span style={{ color: verdict.winner === "A" ? ROSE : TERRA }}>{winnerName}</span>
                {verdict?.balance ? ` · ${Math.max(verdict.balance.sideA, verdict.balance.sideB)}%` : ""}
              </>
            ) : (
              <>Filed by {resolveName(caseData.sideAAuthor)} · {new Date(caseData.createdAt).toLocaleDateString()}</>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          onClick={(e) => onDelete(e, caseData.id)}
          className="p-2 text-[#d8c4ad] opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function TestimonyForm({
  heading,
  sub,
  accent,
  title,
  onTitle,
  lockedTitle,
  perspective,
  onPerspective,
  submitLabel,
  submitIcon,
  onSubmit,
  disabled,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-black tracking-tight text-[#3d2b22]">{heading}</h3>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[#a9825f]">{sub}</p>
      </div>

      {/* Warm parchment testimony sheet */}
      <div
        className="overflow-hidden rounded-[1.75rem] border bg-gradient-to-b from-[#fffdf7] to-[#fdf6e8] shadow-lg shadow-[#e8d6b8]/30 transition-all focus-within:shadow-xl"
        style={{ borderColor: `${accent}30` }}
      >
        {lockedTitle ? (
          <div className="border-b border-[#efe2ca] bg-[#fffaf0] px-6 py-4">
            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
              The case
            </p>
            <p className="mt-1 text-base font-black text-[#3d2b22]">{lockedTitle}</p>
          </div>
        ) : (
          <div className="border-b border-[#efe2ca] px-6 py-4">
            <input
              type="text"
              placeholder="Name this case — e.g. “The Dinner Phone Incident”"
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              className="w-full border-none bg-transparent text-base font-black tracking-tight text-[#3d2b22] outline-none placeholder:font-semibold placeholder:text-[#cbb99e] focus:ring-0"
            />
          </div>
        )}

        <div className="px-6 py-5">
          <textarea
            rows={11}
            placeholder="What happened? What did they do, what did you do, and what actually hurt? The more honest and specific you are, the sharper Riceee's ruling."
            value={perspective}
            onChange={(e) => onPerspective(e.target.value)}
            className="w-full resize-none border-none bg-transparent text-sm leading-relaxed text-[#5c463a] outline-none placeholder:text-[#cbb99e] focus:ring-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-[#bfa588]">
          <Sparkles size={11} />
          <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sealed · only you two ever see this</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSubmit}
          disabled={disabled}
          className="flex items-center gap-2 rounded-full px-9 py-3.5 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-lg transition-all disabled:opacity-50"
          style={{ backgroundColor: accent, boxShadow: `0 10px 25px ${accent}30` }}
        >
          {submitLabel}
          {submitIcon}
        </motion.button>
      </div>
    </div>
  );
}

function WaitingForPartner({ title, partnerName }) {
  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-[#ffe4c9] blur-lg"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#f0e2c8] bg-white/80">
          <JudgeCat size={56} />
        </div>
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-black text-[#3d2b22]">Your side is on record</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[#a9825f]">
          Riceee won&apos;t rule on “{title}” until <span className="font-bold text-[#7c5a3f]">{partnerName}</span> gives
          their side. They&apos;ve been summoned — the verdict comes the moment they answer.
        </p>
      </div>
      <div className="rounded-full border border-[#f0e2c8] bg-[#fffaf0] px-4 py-1.5">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#c68a3c]">Awaiting the other side</span>
      </div>
    </div>
  );
}

/* The 8-second Gemini call, dressed as a real deliberation. */
function Deliberating({ caseTitle }) {
  const beats = [
    "Reading both sides…",
    "Weighing who was actually reasonable…",
    "Checking who escalated first…",
    "Reaching a verdict…",
  ];
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBeat((b) => Math.min(b + 1, beats.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      key="deliberating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-7 py-16 text-center"
    >
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-[#ffcf9a] blur-2xl"
        />
        <motion.div
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[#f0d9b8] bg-white/85 shadow-inner"
        >
          <JudgeCat size={82} />
        </motion.div>
        {/* little gavel taps */}
        <motion.div
          animate={{ rotate: [0, -28, 0], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#ab4400] text-white shadow-lg"
        >
          <Gavel size={16} />
        </motion.div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#c68a3c]">Riceee is deliberating</p>
        <AnimatePresence mode="wait">
          <motion.h3
            key={beat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-xl font-black tracking-tight text-[#3d2b22]"
          >
            {beats[beat]}
          </motion.h3>
        </AnimatePresence>
        {caseTitle && <p className="text-[11px] font-semibold italic text-[#a9825f]">on “{caseTitle}”</p>}
      </div>

      <div className="flex items-center gap-1.5">
        {beats.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= beat ? "w-6 bg-[#ab4400]" : "w-1.5 bg-[#ffd9a8]"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────── */

function JudgementView({ caseData, partnerNames, resolveName, currentUserRole, onCaseUpdate }) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const contractRef = useRef(null);

  let j = {};
  try {
    j = JSON.parse(caseData.judgement || "{}");
  } catch {
    j = { summary: caseData.judgement };
  }

  let contract = null;
  try {
    contract = caseData.contract ? JSON.parse(caseData.contract) : null;
  } catch {
    contract = null;
  }

  const sideA = j.balance?.sideA ?? 50;
  const sideB = j.balance?.sideB ?? 50;
  const winnerSide = j.winner || (sideA >= sideB ? "A" : "B");
  const nameA = resolveName(caseData.sideAAuthor);
  const nameB = resolveName(caseData.sideBAuthor);
  const winnerName = winnerSide === "A" ? nameA : nameB;

  const handleDraftContract = async () => {
    setIsDrafting(true);
    const loading = toast.loading("The clerk is drawing up your terms…");
    const res = await generateHeartContract(caseData.id);
    setIsDrafting(false);
    if (res.success) {
      toast.success("Heart Contract drafted.", { id: loading });
      onCaseUpdate(res.data);
      setTimeout(() => contractRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } else {
      toast.error(res.error || "The clerk couldn't draft it.", { id: loading });
    }
  };

  const mySide = currentUserRole === caseData.sideAAuthor ? "A" : "B";
  const myField = mySide === "A" ? "sideASignedAt" : "sideBSignedAt";
  const bothSigned = Boolean(caseData.sideASignedAt && caseData.sideBSignedAt);

  const handleSign = async () => {
    setIsSigning(true);
    const res = await signHeartContract(caseData.id, mySide);
    setIsSigning(false);
    if (res.success) {
      onCaseUpdate(res.data);
      const nowBoth = Boolean(res.data.sideASignedAt && res.data.sideBSignedAt);
      toast.success(nowBoth ? "Sealed. Both of you signed." : "Signed — waiting for your partner.");
    } else {
      toast.error(res.error || "Couldn't sign.");
    }
  };

  const replacePlaceholders = (text) =>
    !text ? "" : text.replace(/{{P1}}/g, partnerNames[0]).replace(/{{P2}}/g, partnerNames[1]);

  return (
    <div className="space-y-8 pb-4">
      {/* ── THE GAVEL FALLS ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-[#f0d9b8] bg-gradient-to-b from-[#fffaf2] to-[#fdeede] px-6 py-10 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffcf9a]/30 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5">
          <motion.div
            initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-full bg-[#ffcf9a]/60 blur-lg" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#f0d9b8] bg-white/85 shadow-md">
              <JudgeCat size={60} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-1"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#c68a3c]">The gavel has fallen</p>
            <h2 className="text-2xl font-black leading-tight tracking-tight text-[#3d2b22] md:text-3xl">
              {j.verdict || "The court has spoken."}
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-white shadow-lg"
            style={{
              backgroundColor: winnerSide === "A" ? ROSE : TERRA,
              boxShadow: `0 10px 25px ${(winnerSide === "A" ? ROSE : TERRA)}35`,
            }}
          >
            <Gavel size={13} />
            <span className="text-[11px] font-black uppercase tracking-[0.14em]">
              Riceee rules for {winnerName}
            </span>
          </motion.div>
        </div>
      </div>

      {/* ── THE SCALES ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-end justify-between px-1">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: ROSE }}>{nameA}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black" style={{ color: ROSE }}>
                <CountUp value={sideA} />
              </span>
              <span className="text-lg font-black" style={{ color: ROSE }}>%</span>
              {winnerSide === "A" && <Gavel size={15} className="ml-1 mb-1" style={{ color: ROSE }} />}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: TERRA }}>{nameB}</p>
            <div className="flex items-baseline justify-end gap-1">
              {winnerSide === "B" && <Gavel size={15} className="mr-1 mb-1" style={{ color: TERRA }} />}
              <span className="text-4xl font-black" style={{ color: TERRA }}>
                <CountUp value={sideB} />
              </span>
              <span className="text-lg font-black" style={{ color: TERRA }}>%</span>
            </div>
          </div>
        </div>

        {/* Bars slide apart FROM the centre — you watch the judgement land */}
        <div className="flex h-5 w-full overflow-hidden rounded-full border border-[#f0e2c8] bg-[#fff6ea] p-1 shadow-inner">
          <motion.div
            initial={{ width: "50%" }}
            animate={{ width: `${sideA}%` }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.7 }}
            className="h-full rounded-l-full"
            style={{ background: `linear-gradient(90deg, ${ROSE}, ${ROSE}cc)` }}
          />
          <motion.div
            initial={{ width: "50%" }}
            animate={{ width: `${sideB}%` }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.7 }}
            className="h-full rounded-r-full"
            style={{ background: `linear-gradient(270deg, ${TERRA}, ${TERRA}cc)` }}
          />
        </div>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#bfa588]">
          Where the truth landed
        </p>
      </div>

      {/* ── RICEEE'S REASONING ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#f0e2c8] bg-white/80 p-7 md:p-9">
        <div className="pointer-events-none absolute -right-6 -top-6 opacity-[0.04]">
          <Gavel size={130} />
        </div>
        <div className="relative space-y-7">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff2e2]">
              <JudgeCat size={26} />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.24em] text-[#a9825f]">Riceee&apos;s ruling</h3>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1.5 rounded-full" style={{ backgroundColor: ROSE }} />
                <h5 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#3d2b22]">What this was really about</h5>
              </div>
              <p className="text-sm leading-relaxed text-[#5c463a]">{replacePlaceholders(j.analysis?.understanding)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1.5 rounded-full" style={{ backgroundColor: TERRA }} />
                <h5 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#3d2b22]">Why Riceee ruled this way</h5>
              </div>
              <p className="text-sm leading-relaxed text-[#5c463a]">{replacePlaceholders(j.analysis?.reasoning)}</p>
            </div>
          </div>

          {j.summary && (
            <div className="rounded-2xl border border-[#f0d9b8] bg-[#fffaf0] p-5">
              <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#c68a3c]">The honest truth</p>
              <p className="text-sm font-medium leading-relaxed text-[#5c463a]">{replacePlaceholders(j.summary)}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── WHAT EACH GOT RIGHT ──────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { name: nameA, accent: ROSE, list: j.strengths?.sideA, isWinner: winnerSide === "A" },
          { name: nameB, accent: TERRA, list: j.strengths?.sideB, isWinner: winnerSide === "B" },
        ].map((party) => (
          <div
            key={party.name}
            className="rounded-[1.75rem] border bg-white/80 p-6 shadow-sm"
            style={{ borderColor: `${party.accent}22` }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: party.accent }}>
                  What {party.name} got right
                </p>
                <h4 className="mt-0.5 text-lg font-black text-[#3d2b22]">{party.name}</h4>
              </div>
              {party.isWinner && (
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white"
                  style={{ backgroundColor: party.accent }}
                >
                  <Gavel size={10} /> Won
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {party.list?.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ backgroundColor: `${party.accent}0a` }}
                >
                  <div
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: party.accent }}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-[#5c463a]">{replacePlaceholders(s)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── THE HEART CONTRACT ───────────────────────────────────── */}
      <div ref={contractRef} className="w-full border-t border-[#f0e2c8] pt-10">
        {!contract ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex items-center gap-2 text-[#a9825f]">
              <ScrollText size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.28em]">Make it binding</span>
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-2xl font-black tracking-tight text-[#3d2b22]">A verdict is just words.</h3>
              <p className="text-sm leading-relaxed text-[#a9825f]">
                Let the clerk turn Riceee&apos;s ruling into terms you both actually sign — specific, checkable, and in force
                until you say otherwise.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDraftContract}
              disabled={isDrafting}
              className="group flex items-center gap-3 rounded-full bg-[#3d2b22] px-9 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-[#3d2b22]/20 transition-all hover:bg-[#2c1e17] disabled:opacity-60"
            >
              <Feather size={14} className={isDrafting ? "animate-pulse" : "transition-transform group-hover:-rotate-12"} />
              {isDrafting ? "Drawing up terms…" : "Draft the Heart Contract"}
            </motion.button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-3xl"
          >
            <div className="relative overflow-hidden rounded-[2.5rem] border border-[#e8ddc8] bg-gradient-to-b from-[#fffdf7] to-[#fdf6e8] shadow-[0_30px_80px_rgba(120,90,40,0.16)]">
              <div className="pointer-events-none absolute inset-y-0 left-10 hidden w-px bg-[#e2b98f]/30 sm:block" />

              {bothSigned && (
                <div className="pointer-events-none absolute right-6 top-24 z-20 -rotate-12 sm:right-12">
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-[3px] border-dashed border-[#9d4867]/50 text-[#9d4867]/70 sm:h-28 sm:w-28">
                    <Heart size={16} className="fill-[#9d4867]/40" />
                    <span className="mt-1 text-[8px] font-black uppercase tracking-[0.18em]">Sealed</span>
                    <span className="text-[7px] font-bold tracking-[0.12em]">
                      {new Date(caseData.sideBSignedAt > caseData.sideASignedAt ? caseData.sideBSignedAt : caseData.sideASignedAt)
                        .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                        .toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              <div className="relative z-10 space-y-8 p-8 sm:p-12">
                <div className="space-y-3 border-b border-[#e8ddc8] pb-6 text-center">
                  <div className="inline-flex items-center gap-2 text-[#9d4867]">
                    <ScrollText size={14} />
                    <span className="text-[9px] font-black uppercase tracking-[0.35em]">The Heart Contract</span>
                  </div>
                  <h2 className="px-2 text-3xl font-black leading-tight tracking-tight text-[#3d2b22] sm:text-4xl">
                    {contract.title}
                  </h2>
                  <p className="mx-auto max-w-xl text-[13px] italic leading-relaxed text-[#8a6f57]">{contract.preamble}</p>
                </div>

                <div className="space-y-4">
                  {contract.clauses?.map((clause, idx) => {
                    const isBoth = clause.owner === "BOTH";
                    const ownerName = isBoth ? "Both of us" : clause.owner === "A" ? nameA : nameB;
                    const accent = isBoth ? "#8a6d00" : clause.owner === "A" ? ROSE : TERRA;
                    const wash = isBoth ? "#fff8e8" : clause.owner === "A" ? "#fff1f6" : "#fff4ec";
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + idx * 0.09 }}
                        className="flex gap-4 rounded-2xl border border-[#eee2cd] bg-white/70 p-5 transition-colors hover:bg-white"
                      >
                        <span
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white shadow-sm"
                          style={{ backgroundColor: accent }}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-black tracking-tight text-[#3d2b22]">{clause.heading}</h4>
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em]"
                              style={{ backgroundColor: wash, color: accent }}
                            >
                              {ownerName}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-[#5c463a]">{clause.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {contract.penalty && (
                  <div className="rounded-2xl border border-dashed border-[#e2b98f]/70 bg-[#fffaf0] p-5">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-[#8a6d00]">Should a clause be broken</p>
                    <p className="text-sm font-medium leading-relaxed text-[#5c463a]">{contract.penalty}</p>
                  </div>
                )}

                {contract.oath && (
                  <p className="px-4 text-center text-lg font-bold italic leading-relaxed text-[#3d2b22] sm:text-xl">
                    “{contract.oath}”
                  </p>
                )}

                <div className="grid gap-5 pt-4 sm:grid-cols-2">
                  {[
                    { side: "A", name: nameA, signedAt: caseData.sideASignedAt, accent: ROSE },
                    { side: "B", name: nameB, signedAt: caseData.sideBSignedAt, accent: TERRA },
                  ].map((party) => {
                    const isMine = party.side === mySide;
                    return (
                      <div key={party.side} className="flex flex-col items-center gap-2">
                        <div className="flex h-14 w-full items-end justify-center border-b-2 border-[#d8c4ad] pb-1">
                          {party.signedAt ? (
                            <motion.span
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className={`${signature.className} -mb-1 -rotate-2 text-4xl font-bold`}
                              style={{ color: party.accent }}
                            >
                              {party.name}
                            </motion.span>
                          ) : isMine ? (
                            <button
                              onClick={handleSign}
                              disabled={isSigning}
                              className="mb-1 rounded-full border border-[#d8c4ad] bg-white px-5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#7c5a3f] shadow-sm transition-all hover:border-[#3d2b22] hover:text-[#3d2b22] active:scale-95 disabled:opacity-50"
                            >
                              {isSigning ? "Signing…" : "Sign here"}
                            </button>
                          ) : (
                            <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbb99e]">
                              Awaiting signature
                            </span>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5c463a]">{party.name}</p>
                          <p className="text-[9px] font-medium text-[#a9825f]">
                            {party.signedAt
                              ? new Date(party.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Not yet signed"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {bothSigned && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-2 text-center text-[10px] font-black uppercase tracking-[0.28em] text-[#9d4867]"
                  >
                    In force until you both say otherwise
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* Small count-up for the percentage reveal. */
function CountUp({ value, duration = 1100 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    let raf;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    // small delay so it counts up in sync with the bars sliding out
    const kickoff = setTimeout(() => (raf = requestAnimationFrame(step)), 700);
    return () => {
      clearTimeout(kickoff);
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return <>{display}</>;
}
