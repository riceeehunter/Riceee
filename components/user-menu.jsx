"use client";

import { UserButton } from "@clerk/nextjs";
import { ChartNoAxesGantt, Users } from "lucide-react";

const UserMenu = () => {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "w-10 h-10",
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
  );
};

export default UserMenu;
