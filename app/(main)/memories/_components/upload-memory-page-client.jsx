"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadMemory } from "@/actions/memory";
import { plusJakarta, manrope } from "@/lib/fonts";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AUTHOR_SLOTS } from "@/lib/constants/players";

const TAGS = ["Warmth", "Playful", "Adventure", "Cafe Date", "Cozy", "Sunset", "Foodie", "Home", "Travel"];

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

export default function UploadMemoryPageClient({ partnerNames }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";
  const bothLabel = partnerNames?.bothLabel || `${partnerOneName} x ${partnerTwoName}`;

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploadedBy, setUploadedBy] = useState(AUTHOR_SLOTS.BOTH);
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const yearOptions = useMemo(
    () => Array.from({ length: currentYear - 1900 + 1 }, (_, idx) => currentYear - idx),
    [currentYear]
  );

  const tagText = useMemo(() => {
    if (selectedTags.length === 0) return "";
    return selectedTags.map((tag) => `#${tag.toLowerCase()}`).join(" ");
  }, [selectedTags]);

  const finalCaption = useMemo(() => {
    const trimmedCaption = caption.trim();
    if (!tagText) return trimmedCaption;
    if (!trimmedCaption) return tagText;
    return `${trimmedCaption}\n\n${tagText}`;
  }, [caption, tagText]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP, GIF).");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const onFileChange = (event) => {
    const selected = event.target.files?.[0];
    validateAndSetFile(selected);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    validateAndSetFile(dropped);
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      toast.error("Please add a visual memory first.");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", finalCaption);
      formData.append("uploadedBy", uploadedBy);
      const safeDate = memoryDate || new Date();
      const noonDate = new Date(safeDate);
      noonDate.setHours(12, 0, 0, 0);
      formData.append("memoryDate", noonDate.toISOString());

      await uploadMemory(formData);
      toast.success("Memory saved successfully.");
      router.push("/memories");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to save memory.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${manrope.className} text-[#393832] selection:bg-[#ffae88] selection:text-[#491900]`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');`}</style>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        /* Same postage-stamp frame as the memories wall */
        .stamp-frame {
          padding: 12px;
          background-image: radial-gradient(circle, transparent 0 4.5px, #ffffff 5px);
          background-size: 16px 16px;
          background-position: center;
          filter: drop-shadow(0 2px 3px rgba(57, 56, 50, 0.12));
          transition: filter 0.3s ease;
        }
        .stamp-frame:hover {
          filter: drop-shadow(0 6px 10px rgba(57, 56, 50, 0.14));
        }
      `}</style>

      <div className="min-h-dvh">
        <main className="max-w-6xl mx-auto px-6 pt-16 pb-12">
          <div className="mb-10 flex items-start justify-between">
            <div className="flex-1">
              <h1 className={`${plusJakarta.className} text-4xl md:text-5xl font-bold text-[#ab4400] tracking-tight leading-tight`}>
                Preserve a Moment
              </h1>
              <p className="text-[#9d4867] font-medium italic opacity-80 mt-2 text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis">
                Every snapshot is a page in our story.
              </p>
            </div>
            <Link 
              className="w-10 h-10 rounded-full bg-[#ffae88]/10 hover:bg-[#ffae88]/20 transition-all flex items-center justify-center text-[#9d4867] shadow-sm border border-[#ffae88]/20 mt-1" 
              href="/memories"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </Link>
          </div>

          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-12 lg:gap-14 items-start">
              {/* LIVE STAMP PREVIEW — the dropzone is the stamp itself */}
              <div className="lg:sticky lg:top-28 pt-4">
                <div
                  className="stamp-frame -rotate-2 hover:rotate-0 transition-transform duration-300 cursor-pointer"
                  onClick={openFilePicker}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragOver(false);
                  }}
                  onDrop={onDrop}
                >
                  <div className="relative bg-white p-3 pb-4">
                    <div className="absolute -top-3.5 left-1/2 z-10 h-7 w-28 -translate-x-1/2 -rotate-3 rounded-[2px] bg-[#ffd9e2]/80" />

                    <div
                      className={`relative aspect-[4/5] overflow-hidden transition-colors ${
                        previewUrl
                          ? ""
                          : `border-2 border-dashed ${isDragOver ? "border-[#ab4400]/70 bg-[#fff0e8]" : "border-[#ffae88]/50 bg-[#fff8f3]"}`
                      }`}
                    >
                      {previewUrl ? (
                        <img alt="Memory preview" className="h-full w-full object-cover" src={previewUrl} />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ffae88]/20">
                            <span className="material-symbols-outlined text-3xl text-[#ab4400]">add_a_photo</span>
                          </div>
                          <p className="font-medium text-[#66645e]">Drop your photo here</p>
                          <p className="text-xs text-[#828079]">JPG, PNG, WEBP or GIF — up to 10MB</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-3 px-1 pt-3">
                      <div className="min-w-0 space-y-1.5">
                        <h3 className={`${plusJakarta.className} truncate font-semibold text-lg leading-snug ${caption.trim() ? "text-[#393832]" : "text-[#bcb9b1]"}`}>
                          {caption.trim() || "A sweet memory"}
                        </h3>
                        {selectedTags.length > 0 ? (
                          <p className="text-[12px] italic lowercase leading-tight text-[#9d4867]/75">
                            {selectedTags.map((tag) => tag.toLowerCase()).join(" · ")}
                          </p>
                        ) : (
                          <p className="text-[12px] italic text-[#d8d4cb]">your vibe tags will ink here</p>
                        )}
                      </div>
                      <Postmark date={memoryDate || new Date()} />
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                />

                <p className="mt-6 text-center text-xs italic text-[#828079]">
                  exactly how it will hang on your memory wall
                </p>
              </div>

              {/* THE STORY SIDE */}
              <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-4 px-2`}>
                  Tell the story behind this moment...
                </label>
                <textarea
                  className="w-full bg-white border border-[#bcb9b1]/20 rounded-lg p-6 text-[#393832] placeholder:text-[#828079]/60 focus:outline-none focus:ring-4 focus:ring-[#ab4400]/5 shadow-sm leading-relaxed text-lg transition-all"
                  placeholder="It was a rainy Tuesday, and we found that tiny cafe..."
                  rows={4}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </div>

              <div>
                <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-4 px-2`}>
                  When did this happen?
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-full bg-[#fdf9f4] border border-[#bcb9b1]/30 rounded-full py-4 px-6 text-[#393832] focus:ring-2 focus:ring-[#ab4400]/20 shadow-sm flex items-center justify-between"
                      type="button"
                      onClick={() => setCalendarMonth(memoryDate || new Date())}
                    >
                      <span className="font-medium tracking-wide">
                        {memoryDate ? format(memoryDate, "dd-MM-yyyy") : "Pick a date"}
                      </span>
                      <span className="material-symbols-outlined text-[#ab4400] opacity-80">calendar_today</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-2 bg-[#fffbff] border border-[#ffae88]/40 shadow-[0_16px_40px_rgba(171,68,0,0.18)] rounded-2xl">
                    <div className="rounded-xl bg-gradient-to-br from-[#fff7f1] to-[#fff1f6] p-2 border border-[#ffd9e2]/60">
                      <div className="mb-4 flex items-center gap-3 px-1">
                        <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                          <PopoverTrigger asChild>
                            <button
                              aria-label="Select month"
                              className="h-10 min-w-[9.5rem] rounded-full border border-[#ffae88]/45 bg-white px-4 text-left text-base font-medium text-[#ab4400] flex items-center justify-between hover:bg-[#fff4ec]"
                              type="button"
                            >
                              <span>{monthNames[calendarMonth.getMonth()]}</span>
                              <span className="material-symbols-outlined text-[18px]">expand_more</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-52 p-2 bg-[#fffbff] border border-[#ffae88]/45 rounded-2xl shadow-[0_14px_36px_rgba(171,68,0,0.16)]">
                            <div className="hide-scrollbar max-h-64 overflow-y-auto pr-1 space-y-1">
                              {monthNames.map((name, index) => (
                                <button
                                  key={name}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                    calendarMonth.getMonth() === index
                                      ? "bg-[#ffd9e2] text-[#863655] font-semibold"
                                      : "text-[#6a2700] hover:bg-[#fff0e8]"
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    const next = new Date(calendarMonth);
                                    next.setMonth(index);
                                    setCalendarMonth(next);
                                    setMonthPickerOpen(false);
                                  }}
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Popover open={yearPickerOpen} onOpenChange={setYearPickerOpen}>
                          <PopoverTrigger asChild>
                            <button
                              aria-label="Select year"
                              className="h-10 min-w-[6.5rem] rounded-full border border-[#ffae88]/45 bg-white px-4 text-left text-base font-medium text-[#ab4400] flex items-center justify-between hover:bg-[#fff4ec]"
                              type="button"
                            >
                              <span>{calendarMonth.getFullYear()}</span>
                              <span className="material-symbols-outlined text-[18px]">expand_more</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-36 p-2 bg-[#fffbff] border border-[#ffae88]/45 rounded-2xl shadow-[0_14px_36px_rgba(171,68,0,0.16)]">
                            <div className="hide-scrollbar max-h-64 overflow-y-auto pr-1 space-y-1">
                              {yearOptions.map((year) => (
                                <button
                                  key={year}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                                    calendarMonth.getFullYear() === year
                                      ? "bg-[#ffd9e2] text-[#863655] font-semibold"
                                      : "text-[#6a2700] hover:bg-[#fff0e8]"
                                  }`}
                                  type="button"
                                  onClick={() => {
                                    const next = new Date(calendarMonth);
                                    next.setFullYear(year);
                                    setCalendarMonth(next);
                                    setYearPickerOpen(false);
                                  }}
                                >
                                  {year}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            className="h-10 w-10 rounded-full border border-[#ffae88]/45 bg-white text-[#ab4400] hover:bg-[#fff0e8]"
                            type="button"
                            onClick={() => {
                              const next = new Date(calendarMonth);
                              next.setMonth(next.getMonth() - 1);
                              setCalendarMonth(next);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                          </button>
                          <button
                            className="h-10 w-10 rounded-full border border-[#ffae88]/45 bg-white text-[#ab4400] hover:bg-[#fff0e8]"
                            type="button"
                            onClick={() => {
                              const next = new Date(calendarMonth);
                              next.setMonth(next.getMonth() + 1);
                              setCalendarMonth(next);
                            }}
                          >
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          </button>
                        </div>
                      </div>
                      <Calendar
                        mode="single"
                        selected={memoryDate}
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        disableNavigation
                        onSelect={(date) => {
                          if (date) {
                            setMemoryDate(date);
                            setCalendarMonth(date);
                            setCalendarOpen(false);
                          }
                        }}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        showOutsideDays
                        className="p-0"
                        classNames={{
                          caption: "hidden",
                          nav: "hidden",
                          table: "w-full border-collapse",
                          head_row: "flex w-full",
                          head_cell: "w-10 rounded-md text-[0.72rem] font-medium text-[#9d4867]/80",
                          row: "flex w-full mt-1",
                          cell: "h-10 w-10 p-0 text-center relative",
                          day: "h-10 w-10 p-0 inline-flex items-center justify-center rounded-full hover:bg-[#ffe3d4] hover:text-[#973b00] text-[#393832] font-medium transition-colors",
                          day_selected: "bg-gradient-to-br from-[#ab4400] to-[#ff9969] text-white shadow-md font-semibold hover:from-[#973b00] hover:to-[#ff8b57]",
                          day_today: "bg-[#ffd9e2] text-[#863655] border border-[#ffb7cb]",
                          day_outside: "text-[#a6a39d] opacity-40",
                          day_disabled: "text-[#c5c2bc] opacity-40",
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-4 px-2`}>
                  Who's adding this?
                </label>
                <div className="flex gap-3">
                  <button
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full border border-[#bcb9b1]/10 transition-colors group ${
                      uploadedBy === AUTHOR_SLOTS.ONE ? "bg-[#ffd9e2] text-[#863655]" : "bg-white hover:bg-orange-50"
                    }`}
                    type="button"
                    onClick={() => setUploadedBy(AUTHOR_SLOTS.ONE)}
                  >
                    <span className="material-symbols-outlined opacity-80">person</span>
                    <span className="text-xs font-semibold mt-1">{partnerOneName}</span>
                  </button>
                  <button
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full border border-[#bcb9b1]/10 transition-colors group ${
                      uploadedBy === AUTHOR_SLOTS.TWO ? "bg-[#ffae88] text-[#6a2700]" : "bg-white hover:bg-orange-50"
                    }`}
                    type="button"
                    onClick={() => setUploadedBy(AUTHOR_SLOTS.TWO)}
                  >
                    <span className="material-symbols-outlined opacity-80">person_2</span>
                    <span className="text-xs font-semibold mt-1">{partnerTwoName}</span>
                  </button>
                  <button
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full border border-[#bcb9b1]/10 transition-colors group ${
                      uploadedBy === AUTHOR_SLOTS.BOTH ? "bg-[#ffae88] text-[#6a2700] shadow-md shadow-[#ab4400]/10" : "bg-white hover:bg-orange-50"
                    }`}
                    type="button"
                    onClick={() => setUploadedBy(AUTHOR_SLOTS.BOTH)}
                  >
                    <span className="material-symbols-outlined">favorite</span>
                    <span className="text-xs font-semibold mt-1">Both</span>
                  </button>
                </div>
              </div>
            </div>

            <section>
              <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-1 px-2`}>Vibe Tags</label>
              <p className="mb-4 px-2 text-xs text-[#828079]">Pick the feelings — they get inked onto the stamp.</p>
              <div className="flex flex-wrap gap-2.5">
                {TAGS.map((tag, tagIndex) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all active:scale-95 ${
                        active
                          ? `bg-[#ffd9e2] border-[#f3bfd0] text-[#863655] shadow-sm ${tagIndex % 2 ? "rotate-1" : "-rotate-1"}`
                          : "bg-white border-[#ebe8df] text-[#66645e] hover:border-[#ffae88]/60 hover:text-[#ab4400] hover:-translate-y-0.5"
                      }`}
                      type="button"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="pt-4">
              <button
                className="w-full py-5 rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] text-white font-semibold text-xl shadow-xl shadow-[#ab4400]/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:scale-100"
                type="submit"
                disabled={isSaving}
              >
                <span className="material-symbols-outlined">local_post_office</span>
                {isSaving ? "Sealing it in..." : "Post This Memory"}
              </button>
            </div>
              </div>
            </div>
          </form>
        </main>

        <footer className="bg-transparent text-sm italic leading-relaxed pb-24 flex flex-col items-center justify-center space-y-4 w-full text-center mt-8">
          <p className="text-[#9d4867] opacity-70">Handcrafted with love by Riceee © 2024</p>
          <div className="flex gap-6">
            <Link className="text-[#9d4867] opacity-70 hover:text-[#ab4400] transition-colors" href="/dashboard">Our Story</Link>
            <Link className="text-[#9d4867] opacity-70 hover:text-[#ab4400] transition-colors" href="/settings">Support</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
