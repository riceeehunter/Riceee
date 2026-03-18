"use client";
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  ...props
}) {
  return (
    (<DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 [&_thead]:hidden", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-3",
        caption_label: "text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 border-pink-200 hover:bg-pink-50 hover:border-pink-300 transition-all"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "sr-only",
        head_cell: "sr-only",
        row: "grid grid-cols-7 gap-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex items-center justify-center",
          "[&:has([aria-selected])]:rounded-full"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-medium rounded-full hover:bg-pink-50 hover:text-pink-600 transition-all"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-br from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-md font-semibold",
        day_today: "bg-pink-100 text-pink-700 font-bold border-2 border-pink-300",
        day_outside:
          "text-gray-300 opacity-50",
        day_disabled: "text-gray-300 opacity-30",
        day_range_middle:
          "aria-selected:bg-pink-50 aria-selected:text-pink-600",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 text-pink-500" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4 text-pink-500" />,
      }}
      {...props} />)
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
