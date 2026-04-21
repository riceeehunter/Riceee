import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <SignIn
      appearance={{
        elements: {
          formButtonPrimary: "bg-[#ab4400] hover:bg-[#8e3800] text-sm normal-case transition-all shadow-lg shadow-[#ab4400]/20",
          card: "bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem]",
          headerTitle: "text-[#393832] font-bold tracking-tight",
          headerSubtitle: "text-stone-500",
          socialButtonsBlockButton: "border-stone-200 hover:bg-stone-50 transition-colors rounded-2xl",
          socialButtonsBlockButtonText: "text-stone-600 font-semibold",
          formFieldLabel: "text-[#393832] font-semibold",
          formFieldInput: "bg-white/50 border-stone-200 focus:border-[#ab4400] focus:ring-[#ab4400]/10 rounded-xl transition-all",
          footerActionLink: "text-[#ab4400] hover:text-[#8e3800] font-bold",
          identityPreviewText: "text-[#393832]",
          identityPreviewEditButtonIcon: "text-[#ab4400]",
        },
        variables: {
          colorPrimary: "#ab4400",
          colorText: "#393832",
          borderRadius: "1rem",
        }
      }}
    />
  );
}

