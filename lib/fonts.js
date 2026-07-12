import { Poppins, Caveat } from "next/font/google";

export const plusJakarta = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const manrope = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// Handwriting — used only where a real signature is implied (Heart Contract).
// The app's theme fonts above are unchanged.
export const signature = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
});
