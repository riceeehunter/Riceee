"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import { getMoodById } from "@/app/lib/moods";
import { plusJakarta } from "@/lib/fonts";

const colorSchemes = {
  unorganized: {
    bg: "bg-[#fff5e8] hover:bg-[#fff0e0] border border-[#ffae88]/35",
    tab: "bg-[#ffd3b9] group-hover:bg-[#ffc59f]",
  },
  collection: {
    bg: "bg-white/80 hover:bg-white border border-[#ffae88]/25",
    tab: "bg-[#ffe9db] group-hover:bg-[#ffdcc7]",
  },
  createCollection: {
    bg: "bg-[#fdf9f4] hover:bg-[#fff5eb] border border-[#ffae88]/25",
    tab: "bg-[#fff0e3] hover:bg-[#ffe6d2]",
  },
};

const FolderTab = ({ colorClass }) => (
  <div
    className={`absolute inset-x-4 -top-2 h-2 rounded-t-md transform -skew-x-6 transition-colors ${colorClass}`}
  />
);

const EntryPreview = ({ entry }) => (
  <div className="bg-white/70 p-2 rounded-xl text-sm truncate border border-[#ffae88]/15 text-[#393832]">
    <span className="mr-2">{getMoodById(entry.mood)?.emoji}</span>
    <span className="font-medium">{entry.title}</span>
  </div>
);

const CollectionPreview = ({
  id,
  name,
  entries = [],
  isUnorganized = false,
  isCreateNew = false,
  onCreateNew,
}) => {
  if (isCreateNew) {
    return (
      <button
        onClick={onCreateNew}
        className="group relative h-[230px] cursor-pointer"
      >
        <FolderTab colorClass={colorSchemes["createCollection"].bg} />
        <div
          className={`relative h-full rounded-[1.6rem] p-6 shadow-[0_12px_30px_rgba(57,56,50,0.08)] hover:shadow-[0_16px_34px_rgba(57,56,50,0.12)] transition-all flex flex-col items-center justify-center gap-4 ${colorSchemes["createCollection"].tab}`}
        >
          <div className="h-14 w-14 rounded-full bg-[#ffae88]/20 group-hover:bg-[#ffae88]/35 flex items-center justify-center border border-[#ffae88]/30">
            <Plus className="h-7 w-7 text-[#ab4400]" />
          </div>
          <p className={`${plusJakarta.className} text-[#6a2700] font-semibold text-xl`}>Create New Collection</p>
          <p className="text-[#66645e] text-sm">Start your next chapter</p>
        </div>
      </button>
    );
  }

  return (
    <Link
      href={`/collection/${isUnorganized ? "unorganized" : id}`}
      className="group relative"
    >
      <FolderTab
        colorClass={
          colorSchemes[isUnorganized ? "unorganized" : "collection"].tab
        }
      />
      <div
        className={`relative rounded-[1.6rem] p-6 shadow-[0_12px_30px_rgba(57,56,50,0.08)] hover:shadow-[0_18px_36px_rgba(57,56,50,0.13)] transition-all ${
          colorSchemes[isUnorganized ? "unorganized" : "collection"].bg
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{isUnorganized ? "📂" : "📁"}</span>
          <h3 className={`${plusJakarta.className} text-xl font-semibold truncate text-[#393832]`}>{name}</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-[#66645e]">
            <span className="font-medium">{entries.length} entries</span>
            {entries.length > 0 && (
              <span>
                {formatDistanceToNow(new Date(entries[0].createdAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {entries.length > 0 ? (
              entries
                .slice(0, 2)
                .map((entry) => <EntryPreview key={entry.id} entry={entry} />)
            ) : (
              <p className="text-sm text-[#828079] italic">No entries yet</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CollectionPreview;
