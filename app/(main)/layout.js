import React from "react";
import { auth } from "@clerk/nextjs/server";
import { SignedIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import Header from "@/components/header";
import FloatingChat from "@/components/floating-chat";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

const Layout = async ({ children }) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser();
  if (!user.partnerOneName || !user.partnerTwoName) {
    redirect("/onboarding");
  }

  const partnerNames = resolvePartnerNames(user);

  return (
    <>
      <Header />
      <div className="page-shell pt-28 md:pt-32">{children}</div>

    </>
  );
};

export default Layout;
