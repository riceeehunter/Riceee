"use client";

import { useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { ChartNoAxesGantt, Users } from "lucide-react";

const UserMenu = () => {
  const { user } = useUser();
  const initial = (
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "♥"
  )
    .charAt(0)
    .toUpperCase();

  // Clerk's dropdown renders in a portal outside this tree, so the letter
  // reaches it via a CSS variable (globals.css .riceee-avatar-disc::after)
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--riceee-avatar-initial",
      `"${initial}"`
    );
  }, [initial]);

  return (
    <div className="group relative h-10 w-10">
      <UserButton
        appearance={{
          elements: {
            rootBox: "h-10 w-10",
            userButtonTrigger: "h-10 w-10 rounded-full",
            avatarBox: "h-10 w-10",
            // Google photos clash with the theme — hide them in the dropdown
            // too and show the same lettered disc instead
            userPreviewAvatarImage: "hidden",
            userPreviewAvatarBox:
              "riceee-avatar-disc rounded-full bg-gradient-to-br from-[#ffae88] to-[#ab4400]",
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Link
            label="Dashboard"
            labelIcon={<ChartNoAxesGantt size={15} />}
            href="/dashboard"
          />
          <UserButton.Link
            label="Partner names"
            labelIcon={<Users size={15} />}
            href="/settings"
          />
          <UserButton.Action label="manageAccount" />
        </UserButton.MenuItems>
      </UserButton>
      {/* Themed initial painted over the trigger; clicks fall through to Clerk */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-gradient-to-br from-[#ffae88] to-[#ab4400] ring-2 ring-[#ffdfcf] shadow-md shadow-[#ab4400]/20 transition-transform duration-200 group-hover:scale-105"
      >
        <span className="text-[15px] font-bold text-[#fff5f0] leading-none select-none">
          {initial}
        </span>
      </div>
    </div>
  );
};

export default UserMenu;
