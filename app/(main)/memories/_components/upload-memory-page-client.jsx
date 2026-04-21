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

const TAGS = ["Warmth", "Playful", "Adventure"];

export default function UploadMemoryPageClient({ partnerNames }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";
  const bothLabel = partnerNames?.bothLabel || `${partnerOneName} x ${partnerTwoName}`;

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploadedBy, setUploadedBy] = useState(bothLabel);
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
        .upload-bg {
          background-color: #fffbff;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          background-blend-mode: overlay;
          background-size: 200px 200px;
        }
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
      `}</style>

      <div className="upload-bg min-h-screen">
        <main className="max-w-4xl mx-auto px-6 py-12 pt-36 pb-32">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className={`${plusJakarta.className} text-5xl font-bold text-[#ab4400] tracking-tight`}>Preserve a Moment</h1>
              <p className="text-[#9d4867] font-medium italic opacity-80 mt-3">Every snapshot is a page in our story.</p>
            </div>
            <Link className={`${plusJakarta.className} hover:opacity-80 transition-opacity text-[#9d4867] flex items-center gap-1 text-sm font-medium`} href="/memories">
              <span className="material-symbols-outlined">close</span>
              <span>Cancel</span>
            </Link>
          </div>

          <form className="space-y-12" onSubmit={onSubmit}>
            <section className="group">
              <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-4 px-2`}>The Visual Memory</label>
              <div
                className={`relative aspect-[16/9] md:aspect-[21/9] w-full bg-white rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-300 shadow-2xl shadow-[#393832]/5 overflow-hidden ${
                  isDragOver ? "border-[#ab4400]/60" : "border-[#bcb9b1]/30"
                }`}
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
                {!previewUrl && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#ffae88]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[#ab4400] text-3xl">add_a_photo</span>
                    </div>
                    <p className="text-[#66645e] font-medium">Drop your photo here</p>
                    <p className="text-xs text-[#828079] mt-2">Supports JPG, PNG, WEBP, GIF (up to 10MB)</p>
                  </div>
                )}

                {previewUrl && (
                  <img alt="Memory preview" className="w-full h-full object-cover" src={previewUrl} />
                )}

                <input
                  ref={fileInputRef}
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                />
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="md:col-span-2">
                <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-4 px-2`}>
                  Tell the story behind this moment...
                </label>
                <textarea
                  className="w-full bg-white border-none rounded-lg p-6 text-[#393832] placeholder:text-[#828079]/60 focus:ring-2 focus:ring-[#ab4400]/20 shadow-sm leading-relaxed text-lg"
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
                      uploadedBy === partnerOneName ? "bg-[#ffd9e2] text-[#863655]" : "bg-white hover:bg-orange-50"
                    }`}
                    type="button"
                    onClick={() => setUploadedBy(partnerOneName)}
                  >
                    <span className="material-symbols-outlined opacity-80">person</span>
                    <span className="text-xs font-semibold mt-1">{partnerOneName}</span>
                  </button>
                  <button
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full border border-[#bcb9b1]/10 transition-colors group ${
                      uploadedBy === partnerTwoName ? "bg-[#ffae88] text-[#6a2700]" : "bg-white hover:bg-orange-50"
                    }`}
                    type="button"
                    onClick={() => setUploadedBy(partnerTwoName)}
                  >
                    <span className="material-symbols-outlined opacity-80">person_2</span>
                    <span className="text-xs font-semibold mt-1">{partnerTwoName}</span>
                  </button>
                  <button
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-full border border-[#bcb9b1]/10 transition-colors group ${
                      uploadedBy === bothLabel ? "bg-[#ffae88] text-[#6a2700] shadow-md shadow-[#ab4400]/10" : "bg-white hover:bg-orange-50"
                    }`}
                    type="button"
                    onClick={() => setUploadedBy(bothLabel)}
                  >
                    <span className="material-symbols-outlined">favorite</span>
                    <span className="text-xs font-semibold mt-1">Both</span>
                  </button>
                </div>
              </div>
            </div>

            <section>
              <label className={`${plusJakarta.className} block text-lg font-semibold text-[#393832] mb-4 px-2`}>Vibe Tags</label>
              <div className="flex flex-wrap gap-3">
                {TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      className={`px-6 py-2 rounded-full text-sm transition-all ${
                        active
                          ? "bg-[#ffd9e2] text-[#863655] font-semibold"
                          : "bg-[#ebe8df] text-[#393832] hover:bg-[#fed07f]"
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

            <div className="pt-8 flex justify-center">
              <button
                className="w-full max-w-sm py-5 rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] text-white font-semibold text-xl shadow-xl shadow-[#ab4400]/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-60 disabled:hover:scale-100"
                type="submit"
                disabled={isSaving}
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                {isSaving ? "Saving..." : "Save This Memory"}
              </button>
            </div>
          </form>
        </main>

        <footer className="bg-transparent text-sm italic leading-relaxed pb-12 flex flex-col items-center justify-center space-y-4 w-full text-center mt-20">
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
