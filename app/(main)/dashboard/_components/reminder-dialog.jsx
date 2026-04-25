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
  const [isLoaded, setIsLoaded] = useState(false);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: currentYear - 1900 + 1 },
    (_, index) => currentYear - index
  );

  // Load reminders from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("reminders");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const withDates = parsed.map(r => ({
          ...r,
          date: new Date(r.date)
        }));
        setReminders(withDates);
      } catch (error) {
        console.error("Failed to load reminders:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save reminders to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("reminders", JSON.stringify(reminders));
    }
  }, [reminders, isLoaded]);

  const handleAddReminder = () => {
    if (!reminderTitle.trim()) {
      toast.error("Please enter a reminder title");
      return;
    }

    const newReminder = {
      id: Date.now(),
      date: selectedDate,
      title: reminderTitle,
      note: reminderNote,
    };

    setReminders([...reminders, newReminder]);
    setReminderTitle("");
    setReminderNote("");
    toast.success("Reminder added!");
  };

  const handleDeleteReminder = (id) => {
    setReminders(reminders.filter((r) => r.id !== id));
    toast.success("Reminder deleted");
  };

  const sortedReminders = [...reminders].sort((a, b) => a.date - b.date);

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full border-[#ffae88]/45 bg-white/90 text-[#6a2700] hover:bg-[#fff1e8] hover:text-[#ab4400]">
          <CalendarDays className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className={`${manrope.className} w-full h-full sm:h-auto max-w-none sm:max-w-4xl max-h-dvh sm:max-h-[90vh] rounded-none sm:rounded-[2rem] border-none sm:border border-[#ffdfcf] bg-[#fffbff] p-0 shadow-[0_28px_80px_rgba(57,56,50,0.22)] overflow-y-auto sm:overflow-hidden [&>button:last-child]:hidden`}>
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
        <div className="reminder-grain border-b border-[#ffdfcf]/80 px-6 py-6 md:px-8 relative">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className={`${plusJakarta.className} text-2xl md:text-3xl tracking-tight text-[#ab4400]`}>
              Reminders & Dates
            </DialogTitle>
            <DialogDescription className="text-[#66645e] text-sm md:text-base">
              Add special moments
            </DialogDescription>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setOpen(false)}
            className="rounded-full bg-[#fff0e8] hover:bg-[#ffdfcf] text-[#ab4400] font-bold px-5 h-10 border border-[#ffae88]/30 shadow-sm transition-all flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Done
          </Button>
        </DialogHeader>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 md:p-8 pb-32">
          {/* Add Reminder Form */}
          <div className="space-y-5 rounded-3xl border border-[#ffdfcf] bg-gradient-to-br from-[#fff8f2] to-[#fff1f6] p-6 shadow-[0_12px_26px_rgba(57,56,50,0.08)]">
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
                <PopoverContent align="start" className="w-auto rounded-2xl border border-[#ffae88]/45 bg-[#fffbff] p-2 shadow-[0_16px_42px_rgba(171,68,0,0.18)]">
                  <div className="rounded-xl border border-[#ffd9e2]/70 bg-gradient-to-br from-[#fff8f2] to-[#fff1f6] p-2">
                    <div className="mb-4 flex items-center gap-3 px-1">
                      <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            aria-label="Select month"
                            className="h-10 min-w-[9.5rem] rounded-full border border-[#ffae88]/45 bg-white px-4 text-left text-base font-medium text-[#ab4400] flex items-center justify-between hover:bg-[#fff4ec]"
                            type="button"
                          >
                            <span>{monthNames[calendarMonth.getMonth()]}</span>
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-52 p-2 bg-[#fffbff] border border-[#ffae88]/45 rounded-2xl shadow-[0_14px_36px_rgba(171,68,0,0.16)]">
                          <div className="reminder-hide-scrollbar max-h-64 overflow-y-auto pr-1 space-y-1">
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
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-36 p-2 bg-[#fffbff] border border-[#ffae88]/45 rounded-2xl shadow-[0_14px_36px_rgba(171,68,0,0.16)]">
                          <div className="reminder-hide-scrollbar max-h-64 overflow-y-auto pr-1 space-y-1">
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
                          <ChevronLeft className="mx-auto h-4 w-4" />
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
                          <ChevronRight className="mx-auto h-4 w-4" />
                        </button>
                      </div>
                    </div>
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
                      head_cell: "w-10 rounded-md text-[0.72rem] font-medium text-[#9d4867]/80",
                      row: "flex w-full mt-1",
                      cell: "h-10 w-10 p-0 text-center relative",
                      day: "h-10 w-10 p-0 inline-flex items-center justify-center rounded-full hover:bg-[#ffe3d4] hover:text-[#973b00] text-[#393832] font-medium transition-colors",
                      day_selected: "bg-gradient-to-br from-[#ab4400] to-[#ff9969] text-white shadow-md font-semibold hover:from-[#973b00] hover:to-[#ff8b57]",
                      day_today: "bg-[#ffd9e2] text-[#863655] border border-[#ffb7cb]",
                      day_outside: "text-[#a6a39d] opacity-40",
                      day_disabled: "text-[#c5c2bc] opacity-40",
                    }}
                    modifiers={{
                      hasReminder: reminders.map((r) => r.date),
                    }}
                    modifiersStyles={{
                      hasReminder: {
                        backgroundColor: "#ffd9e2",
                        fontWeight: "700",
                        color: "#863655",
                        border: "1px solid #ffb7cb",
                      },
                    }}
                  />
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
                rows={3}
                className="resize-none rounded-xl border border-[#ffae88]/45 bg-white focus:border-[#ff9969] focus:ring-[#ffae88]/40"
              />
            </div>

            <Button 
              onClick={handleAddReminder} 
              className="w-full rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] hover:from-[#973b00] hover:to-[#ff8b57] shadow-[0_10px_20px_rgba(171,68,0,0.24)] transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>

          {/* Reminders List */}
          <div className="space-y-3">
            <h4 className={`${plusJakarta.className} font-semibold text-base text-[#ab4400] flex items-center gap-2`}>
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
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#ffae88]/45 bg-[#fdf9f4] px-4 text-center">
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#fff0e8] to-[#fff1f6] rounded-full">
                    <CalendarDays className="h-7 w-7 text-[#ab4400]" />
                  </div>
                  <p className={`${plusJakarta.className} text-[#393832] font-semibold`}>
                    No reminders yet
                  </p>
                  <p className="text-sm text-[#66645e]">
                    Add one to keep your special moments on track.
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
