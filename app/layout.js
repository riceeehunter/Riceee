import "./globals.css";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "react-quill-new/dist/quill.snow.css";
import BottomNav from "@/components/bottom-nav";
import FloatingChat from "@/components/floating-chat";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames, DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ 
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins" 
});
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono" 
});

export const metadata = {
  title: "Riceee - A Journal Made with Love",
  description: "A beautiful journal app for couples to write and grow together",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const { userId } = await auth();
  let user = null;
  let partnerNames = DEFAULT_PARTNER_NAMES;

  if (userId) {
    try {
      user = await getOrCreateUser();
      partnerNames = resolvePartnerNames(user);
    } catch (e) {
      console.error("Auth error in root layout:", e);
    }
  }

  return (
    <html lang="en">
      <body
        className={`${poppins.className} ${poppins.variable} ${jetbrainsMono.variable} min-h-dvh flex flex-col overflow-x-hidden`}
      >
        <ClerkProvider>
          <main className="flex-1 min-h-0 overflow-x-hidden pb-24 md:pb-0 px-4 sm:px-6 md:px-8">{children}</main>
          {userId && user && (
            <FloatingChat 
              partnerNames={partnerNames} 
              user={{ clerkUserId: user.clerkUserId }} 
              currentUserId={userId} 
            />
          )}
          <BottomNav />
          <Toaster richColors />
        </ClerkProvider>
      </body>
    </html>
  );
}
