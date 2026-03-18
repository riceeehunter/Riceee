import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";

const Layout = async ({ children }) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser();
  if (!user.partnerOneName || !user.partnerTwoName) {
    redirect("/onboarding");
  }

  return <div className="container mx-auto">{children}</div>;
};

export default Layout;
