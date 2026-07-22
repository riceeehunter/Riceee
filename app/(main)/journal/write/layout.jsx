import Link from "next/link";
import { Suspense } from "react";
import { BarLoader } from "react-spinners";
import { Archive, ChevronLeft, Clock, Download } from "lucide-react";
import { getOrCreateUser } from "@/lib/auth";
import { isArchived, isCoolingDown } from "@/lib/space-closure";

/**
 * The editor is gated here rather than inside the page.
 *
 * The page is a large client component with a long list of hooks, and bailing
 * out partway through it is the kind of thing that breaks the next time
 * somebody adds a hook above the early return. Deciding in the layout keeps the
 * editor from mounting at all — which is also the honest behaviour: the point
 * is that there is nowhere for this writing to go, so offering the editor and
 * rejecting it on submit would just waste the effort of writing it.
 */
function ClosedNotice({ archived, closesAt }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-stone-500">
        {archived ? <Archive className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </div>
      <h1 className="text-xl font-semibold text-stone-900">
        {archived ? "This is an archive" : "This space is closing"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
        {archived
          ? "Everything written here is still yours to read and download — but nothing new can be added."
          : `Everything here stays readable${
              closesAt
                ? ` until ${new Date(closesAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                  })}`
                : ""
            }, and it's all yours to download. New entries can't be added while it's closing.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/dashboard"
          className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Back to Dashboard
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

export default async function WriteLayout({ children }) {
  const space = await getOrCreateUser();
  const archived = isArchived(space);
  const closed = archived || isCoolingDown(space);

  return (
    <div className="py-2 md:py-6">
      <div className="max-w-6xl mx-auto mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#ab4400] hover:text-[#973b00] cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
      {closed ? (
        <ClosedNotice archived={archived} closesAt={space.closesAt} />
      ) : (
        <Suspense fallback={<BarLoader color="#ab4400" width={"100%"} />}>
          {children}
        </Suspense>
      )}
    </div>
  );
}
