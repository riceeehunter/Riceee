import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth";
import OnboardingForm from "./_components/onboarding-form";

export const metadata = {
  title: "Set up your space | Riceee",
};

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await getOrCreateUser();

  if (user.partnerOneName && user.partnerTwoName) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <OnboardingForm />
    </div>
  );
}
