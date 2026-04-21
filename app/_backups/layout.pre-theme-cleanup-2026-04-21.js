import Header from "@/components/header";
import FloatingChat from "@/components/floating-chat";
import "./globals.css";
import { Inter } from "next/font/google";
import { ClerkProvider, SignedIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Toaster } from "sonner";
import "react-quill-new/dist/quill.snow.css";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Riceee - A Journal Made with Love",
  description: "A beautiful journal app for couples to write and grow together",
};

export default async function RootLayout({ children }) {
  const { userId } = await auth();
  const partnerNames = userId
    ? resolvePartnerNames(await getOrCreateUser())
    : null;

  return (
    <ClerkProvider
    // appearance={{
    //   baseTheme: shadesOfPurple,
    //   variables: {
    //     colorPrimary: "#3b82f6",
    //     colorBackground: "#1a202c",
    //     colorInputBackground: "#2D3748",
    //     colorInputText: "#F3F4F6",
    //   },
    //   elements: {
    //     formButtonPrimary: "bg-purple-600 hover:bg-purple-700 text-white",
    //     card: "bg-gray-800",
    //     headerTitle: "text-blue-400",
    //     headerSubtitle: "text-gray-400",
    //   },
    // }}
    >
      <html lang="en">
        <body
          className={`${inter.className} min-h-screen flex flex-col bg-gradient-to-b from-orange-50 via-amber-50 to-orange-50 overflow-x-hidden`}
        >
          <div className="inset-0 bg-[url('/bg.jpg')] opacity-50 fixed -z-10" />
          <Header />
          <main className="flex-1 min-h-0 overflow-x-hidden">{children}</main>
          <SignedIn>
            <FloatingChat partnerNames={partnerNames} />
          </SignedIn>
          <Toaster richColors />

          <footer className="bg-orange-300 py-6 bg-opacity-10">
            <div className="container mx-auto px-4 text-center text-gray-900">
              <p>Made with 💗 for every couple</p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
