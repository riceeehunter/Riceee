"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { plusJakarta, manrope } from "@/lib/fonts";
import { getReminders, addReminder, deleteReminder } from "@/actions/reminder";

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

const ReminderDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminders, setReminders] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  // Mobile only — desktop shows both panels side by side
  const [mobileTab, setMobileTab] = useState("new");
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, index) => currentYear - index
  );

  // Reminders live in the DB (shared by both partners) — fetch when opened
  useEffect(() => {
    if (!open) return;
    getReminders().then((res) => {
      if (res.success) {
        setReminders(res.data.map((r) => ({ ...r, date: new Date(r.date) })));
      }
    });
  }, [open]);

  const handleAddReminder = async () => {
    if (!reminderTitle.trim()) {
      toast.error("Please enter a reminder title");
      return;
    }

    setIsSaving(true);
    const res = await addReminder({
      date: selectedDate,
      title: reminderTitle,
      note: reminderNote,
    });
    setIsSaving(false);

    if (!res.success) {
      toast.error(res.error || "Couldn't save the reminder");
      return;
    }

    setReminders((prev) => [...prev, { ...res.data, date: new Date(res.data.date) }]);
    setReminderTitle("");
    setReminderNote("");
    setMobileTab("saved"); // show them what they just saved
    toast.success("Reminder added!");
  };

  const handleDeleteReminder = async (id) => {
    const removed = reminders.find((r) => r.id === id);
    setReminders((prev) => prev.filter((r) => r.id !== id));

    const res = await deleteReminder(id);
    if (!res.success) {
      // Put it back if the server refused
      if (removed) setReminders((prev) => [...prev, removed]);
      toast.error("Couldn't delete the reminder");
      return;
    }
    toast.success("Reminder deleted");
  };

  const sortedReminders = [...reminders].sort((a, b) => a.date - b.date);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full border-[#ffae88]/45 bg-white/90 text-[#6a2700] hover:bg-[#fff1e8] hover:text-[#ab4400]">
          <CalendarDays className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      {/* Mobile: a bottom sheet that slides up and never fills the whole screen.
          Desktop: the same centered panel as before. */}
      <DialogContent className={`${manrope.className} flex flex-col
        top-auto bottom-0 translate-y-0 w-full max-w-none max-h-[88dvh] rounded-t-[2rem] rounded-b-none border border-[#ffdfcf] border-b-0
        sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:max-w-4xl sm:max-h-[90vh] sm:rounded-[2rem] sm:border-b
        bg-[#fffbff] p-0 shadow-[0_-8px_60px_rgba(57,56,50,0.22)] sm:shadow-[0_28px_80px_rgba(57,56,50,0.22)] overflow-hidden [&>button:last-child]:hidden`}>
        <style>{`
          .reminder-grain {
            background-image: radial-gradient(circle at 25% 20%, rgba(255, 174, 136, 0.2), transparent 45%), radial-gradient(circle at 85% 0%, rgba(255, 217, 226, 0.28), transparent 55%);
          }
          .reminder-hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .reminder-hide-scrollbar::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
        `}</style>
        <div className="reminder-grain flex-shrink-0 border-b border-[#ffdfcf]/80 px-5 pb-4 pt-3 sm:px-6 sm:py-6 md:px-8 relative">
        {/* Grab handle — reads as a sheet you can dismiss */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e8dcc8] sm:hidden" />

        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <DialogTitle className={`${plusJakarta.className} text-xl sm:text-2xl md:text-3xl tracking-tight text-[#ab4400]`}>
              Reminders &amp; Dates
            </DialogTitle>
            <DialogDescription className="hidden sm:block text-[#66645e] text-sm md:text-base">
              Add special moments
            </DialogDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="rounded-full bg-[#fff0e8] hover:bg-[#ffdfcf] text-[#ab4400] font-bold px-4 sm:px-5 h-9 sm:h-10 border border-[#ffae88]/30 shadow-sm transition-all flex items-center gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Done
          </Button>
        </DialogHeader>

        {/* Mobile tabs — form and list were stacking into one long scroll */}
        <div className="mt-4 flex gap-1 rounded-full border border-[#ffdfcf] bg-white/70 p-1 sm:hidden">
          {[
            { id: "new", label: "Add new" },
            { id: "saved", label: `Saved${sortedReminders.length ? ` (${sortedReminders.length})` : ""}` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 rounded-full py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all ${
                mobileTab === tab.id
                  ? "bg-[#ab4400] text-white shadow-sm"
                  : "text-[#a09d95]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        </div>

        <div className="reminder-hide-scrollbar grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 sm:p-6 md:grid-cols-2 md:p-8 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-8">
          {/* Add Reminder Form */}
          <div className={`${mobileTab === "new" ? "" : "hidden md:block"} space-y-4 sm:space-y-5 rounded-3xl border border-[#ffdfcf] bg-gradient-to-br from-[#fff8f2] to-[#fff1f6] p-5 sm:p-6 shadow-[0_12px_26px_rgba(57,56,50,0.08)]`}>
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className={`${plusJakarta.className} text-sm font-semibold text-[#6a2700] flex items-center gap-2`}>
                <CalendarDays className="h-4 w-4 text-[#ab4400]" />
                Select Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left rounded-full border border-[#ffae88]/45 bg-white/95 font-normal text-[#6a2700] hover:border-[#ff9969] hover:bg-[#fff4ec] transition-all"
                    onClick={() => setCalendarMonth(selectedDate || new Date())}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-[#ab4400]" />
                    {selectedDate ? (
                      <span className="font-medium text-[#6a2700]">
                        {format(selectedDate, "MMMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-gray-500">Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  sideOffset={8}
                  collisionPadding={12}
                  className="w-[19.5rem] rounded-[1.75rem] border border-[#ffdfcf] bg-[#fffbff] p-0 shadow-[0_24px_60px_rgba(171,68,0,0.22)] overflow-hidden"
                >
                  {/* Header: month + year, one clean row */}
                  <div className="flex items-center justify-between border-b border-[#ffede2] bg-gradient-to-br from-[#fff8f2] to-[#fff1f6] px-3 py-3">
                    <button
                      type="button"
                      aria-label="Previous month"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#ab4400] transition-colors hover:bg-white active:scale-90"
                      onClick={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() - 1);
                        setCalendarMonth(next);
                      }}
                    >
                      <ChevronLeft className="h-[18px] w-[18px]" />
                    </button>

                    <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`${plusJakarta.className} flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-extrabold tracking-tight text-[#393832] transition-colors hover:bg-white active:scale-95`}
                        >
                          {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                          <ChevronDown className="h-3.5 w-3.5 text-[#ab4400]" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="center"
                        className="w-64 rounded-2xl border border-[#ffdfcf] bg-[#fffbff] p-3 shadow-[0_18px_44px_rgba(171,68,0,0.2)]"
                      >
                        {/* Month grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {monthNames.map((name, index) => (
                            <button
                              key={name}
                              type="button"
                              className={`rounded-xl py-2 text-xs font-bold transition-colors ${
                                calendarMonth.getMonth() === index
                                  ? "bg-[#ab4400] text-white shadow-sm"
                                  : "text-[#6a2700] hover:bg-[#fff0e8]"
                              }`}
                              onClick={() => {
                                const next = new Date(calendarMonth);
                                next.setMonth(index);
                                setCalendarMonth(next);
                              }}
                            >
                              {name.slice(0, 3)}
                            </button>
                          ))}
                        </div>

                        {/* Year stepper */}
                        <div className="mt-3 flex items-center justify-between rounded-full border border-[#ffdfcf] bg-white px-2 py-1.5">
                          <button
                            type="button"
                            aria-label="Previous year"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#ab4400] hover:bg-[#fff0e8] active:scale-90"
                            onClick={() => {
                              const next = new Date(calendarMonth);
                              next.setFullYear(next.getFullYear() - 1);
                              setCalendarMonth(next);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className={`${plusJakarta.className} text-sm font-extrabold tabular-nums text-[#393832]`}>
                            {calendarMonth.getFullYear()}
                          </span>
                          <button
                            type="button"
                            aria-label="Next year"
                            disabled={calendarMonth.getFullYear() >= currentYear}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[#ab4400] hover:bg-[#fff0e8] active:scale-90 disabled:opacity-30"
                            onClick={() => {
                              const next = new Date(calendarMonth);
                              next.setFullYear(next.getFullYear() + 1);
                              setCalendarMonth(next);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setMonthPickerOpen(false)}
                          className="mt-3 w-full rounded-full bg-[#ab4400] py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white active:scale-95"
                        >
                          Done
                        </button>
                      </PopoverContent>
                    </Popover>

                    <button
                      type="button"
                      aria-label="Next month"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#ab4400] transition-colors hover:bg-white active:scale-90"
                      onClick={() => {
                        const next = new Date(calendarMonth);
                        next.setMonth(next.getMonth() + 1);
                        setCalendarMonth(next);
                      }}
                    >
                      <ChevronRight className="h-[18px] w-[18px]" />
                    </button>
                  </div>

                  <div className="p-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      disableNavigation
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setCalendarMonth(date);
                        }
                      }}
                      initialFocus
                      className="p-0"
                      showOutsideDays
                      classNames={{
                        caption: "hidden",
                        nav: "hidden",
                        table: "w-full border-collapse",
                        head_row: "flex w-full",
                        head_cell:
                          "w-10 text-[0.65rem] font-bold uppercase tracking-wider text-[#c3b5ab]",
                        row: "flex w-full mt-1",
                        cell: "h-10 w-10 p-0 text-center relative",
                        day: "h-10 w-10 p-0 inline-flex items-center justify-center rounded-2xl text-[#393832] font-semibold transition-all hover:bg-[#fff0e8] hover:text-[#ab4400] active:scale-90",
                        day_selected:
                          "bg-gradient-to-br from-[#ab4400] to-[#ff9969] text-white shadow-md shadow-[#ab4400]/25 hover:from-[#973b00] hover:to-[#ff8b57] hover:text-white",
                        day_today:
                          "border-2 border-[#ffae88] text-[#ab4400] font-extrabold",
                        day_outside: "text-[#d8d4cb] font-normal",
                        day_disabled: "text-[#e0dbd3] font-normal",
                      }}
                      modifiers={{
                        hasReminder: reminders.map((r) => r.date),
                      }}
                      modifiersClassNames={{
                        // A dot underneath, so a marked day still reads clearly
                        hasReminder:
                          "relative after:absolute after:bottom-1.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#9d4867]",
                      }}
                    />
                  </div>

                  {/* Quick picks */}
                  <div className="flex gap-1.5 border-t border-[#ffede2] bg-[#fffaf6] px-3 py-2.5">
                    {[
                      { label: "Today", days: 0 },
                      { label: "Tomorrow", days: 1 },
                      { label: "Next week", days: 7 },
                    ].map((shortcut) => (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + shortcut.days);
                          setSelectedDate(d);
                          setCalendarMonth(d);
                        }}
                        className="flex-1 rounded-full border border-[#ffdfcf] bg-white py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6a2700] transition-colors hover:border-[#ffae88] hover:bg-[#fff0e8] active:scale-95"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Reminder Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className={`${plusJakarta.className} text-sm font-semibold text-[#6a2700]`}>
                Reminder Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., Her Birthday 🎂"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="rounded-xl border border-[#ffae88]/45 bg-white focus:border-[#ff9969] focus:ring-[#ffae88]/40"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className={`${plusJakarta.className} text-sm font-semibold text-[#6a2700]`}>
                Note (Optional)
              </Label>
              <Textarea
                id="note"
                placeholder="Add any special notes..."
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                rows={2}
                className="resize-none rounded-xl border border-[#ffae88]/45 bg-white focus:border-[#ff9969] focus:ring-[#ffae88]/40 sm:min-h-[88px]"
              />
            </div>

            <Button
              onClick={handleAddReminder}
              disabled={isSaving}
              className="w-full h-11 rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] hover:from-[#973b00] hover:to-[#ff8b57] shadow-[0_10px_20px_rgba(171,68,0,0.24)] transition-all disabled:opacity-60"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Add Reminder"}
            </Button>
          </div>

          {/* Reminders List */}
          <div className={`${mobileTab === "saved" ? "" : "hidden md:block"} space-y-3`}>
            <h4 className={`${plusJakarta.className} hidden md:flex font-semibold text-base text-[#ab4400] items-center gap-2`}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#ab4400]"></span>
                Your Reminders
            </h4>
            {sortedReminders.length > 0 ? (
              <div className="reminder-hide-scrollbar space-y-3 max-h-[430px] overflow-y-auto pr-1">
                {sortedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start justify-between rounded-2xl border border-[#ffdfcf] bg-white/85 p-4 shadow-[0_8px_18px_rgba(57,56,50,0.07)] hover:border-[#ffae88]/70 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-[#fff0e8] rounded-lg">
                          <CalendarDays className="h-3.5 w-3.5 text-[#ab4400]" />
                        </div>
                        <span className="font-semibold text-sm text-[#6a2700]">
                          {format(reminder.date, "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className={`${plusJakarta.className} text-base font-semibold text-[#393832] mb-1`}>
                        {reminder.title}
                      </p>
                      {reminder.note && (
                        <p className="text-sm text-[#66645e] leading-relaxed">
                          {reminder.note}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="ml-3 rounded-full text-[#cc5a6f] hover:bg-[#fff1f6] hover:text-[#a63c53] transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[160px] sm:min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#ffae88]/45 bg-[#fdf9f4] px-4 py-6 text-center">
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#fff0e8] to-[#fff1f6] rounded-full">
                    <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7 text-[#ab4400]" />
                  </div>
                  <p className={`${plusJakarta.className} text-[#393832] font-semibold`}>
                    Nothing saved yet
                  </p>
                  <p className="text-xs sm:text-sm text-[#66645e]">
                    Birthdays, anniversaries, the day you met.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
