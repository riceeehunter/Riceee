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
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ReminderDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const [reminders, setReminders] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <CalendarDays className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reminders & Important Dates</DialogTitle>
          <DialogDescription>
            Add reminders for birthdays, anniversaries, and special moments
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Add Reminder Form */}
          <div className="space-y-5 bg-gradient-to-br from-orange-50 to-pink-50 p-6 rounded-xl border-2 border-orange-100">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-orange-600" />
                Select Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all"
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-orange-600" />
                    {selectedDate ? (
                      <span className="font-medium text-orange-900">
                        {format(selectedDate, "MMMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="text-gray-500">Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className="rounded-md border"
                    modifiers={{
                      hasReminder: reminders.map((r) => r.date),
                    }}
                    modifiersStyles={{
                      hasReminder: {
                        backgroundColor: "#fed7aa",
                        fontWeight: "bold",
                        color: "#9a3412",
                        border: "2px solid #f97316",
                      },
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Reminder Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold text-orange-900">
                Reminder Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., Her Birthday 🎂"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="border-2 border-orange-200 focus:border-orange-400 focus:ring-orange-300"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-semibold text-orange-900">
                Note (Optional)
              </Label>
              <Textarea
                id="note"
                placeholder="Add any special notes..."
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                rows={3}
                className="border-2 border-orange-200 focus:border-orange-400 focus:ring-orange-300 resize-none"
              />
            </div>

            <Button 
              onClick={handleAddReminder} 
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>

          {/* Reminders List */}
          {sortedReminders.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-base text-orange-900 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-orange-500"></span>
                Your Reminders
              </h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {sortedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start justify-between p-4 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl border-2 border-orange-100 hover:border-orange-200 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-orange-100 rounded-lg">
                          <CalendarDays className="h-3.5 w-3.5 text-orange-600" />
                        </div>
                        <span className="font-semibold text-sm text-orange-900">
                          {format(reminder.date, "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-base font-bold text-gray-800 mb-1">
                        {reminder.title}
                      </p>
                      {reminder.note && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {reminder.note}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all ml-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedReminders.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full mb-4">
                <CalendarDays className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-base text-gray-600 font-medium">
                No reminders yet. Add one to get started! 💗
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
