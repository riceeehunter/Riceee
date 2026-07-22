import Link from "next/link";
import { Archive, Clock, Download } from "lucide-react";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import { isArchived, isCoolingDown } from "@/lib/space-closure";
import UploadMemoryPageClient from "../_components/upload-memory-page-client";

export const metadata = {
  title: "Upload Memory | Riceee",
  description: "Save a special moment to your shared scrapbook",
};

export default async function UploadMemoryPage() {
  const user = await getOrCreateUser();
  const partnerNames = resolvePartnerNames(user);
  const archived = isArchived(user);

  // Uploading into a space that's closing has nowhere to land, so the picker
  // never mounts — better than letting someone choose photos and wait on a
  // upload that the server is always going to refuse.
  if (archived || isCoolingDown(user)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-500">
          {archived ? <Archive className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
        </div>
        <h1 className="text-xl font-semibold text-stone-900">
          {archived ? "This is an archive" : "This space is closing"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
          No new photos can be added, but every photo already here stays yours — readable now and
          downloadable whenever you want.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/memories"
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Back to Memories
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#ab4400] px-4 py-2 text-sm font-medium text-white hover:bg-[#973b00]"
          >
            <Download className="h-3.5 w-3.5" />
            Download everything
          </Link>
        </div>
      </div>
    );
  }

  return <UploadMemoryPageClient partnerNames={partnerNames} />;
}
