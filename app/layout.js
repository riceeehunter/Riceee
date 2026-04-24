import "./globals.css";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "react-quill-new/dist/quill.snow.css";
import BottomNav from "@/components/bottom-nav";

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

export default async function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${poppins.className} ${poppins.variable} ${jetbrainsMono.variable} min-h-screen flex flex-col overflow-x-hidden`}
        >
          <main className="flex-1 min-h-0 overflow-x-hidden pb-24 md:pb-0">{children}</main>
          <BottomNav />
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
