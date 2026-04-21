import Link from "next/link";
import { Suspense } from "react";
import { BarLoader } from "react-spinners";
import { ChevronLeft } from "lucide-react";

export default function WriteLayout({ children }) {
  return (
    <div className="page-shell py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#ab4400] hover:text-[#973b00] cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      <Suspense fallback={<BarLoader color="#ab4400" width={"100%"} />}>
        {children}
      </Suspense>
    </div>
  );
}
