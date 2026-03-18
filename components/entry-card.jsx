import React from "react";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { format } from "date-fns";

const EntryCard = ({ entry }) => {
  return (
    <Link href={`/journal/${entry.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl flex-shrink-0">{entry.moodData.emoji}</span>
                <h3 className="font-semibold text-base sm:text-lg break-words">{entry.title}</h3>
              </div>
              <div
                className="text-gray-600 line-clamp-2 text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 whitespace-nowrap self-start">
              <time className="text-xs sm:text-sm text-gray-500">
                {format(new Date(entry.createdAt), "MMM d, yyyy")}
              </time>
              <span className="text-xs px-2 sm:px-3 py-1 bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 rounded-full font-medium border border-pink-200">
                {entry.author}
              </span>
            </div>
          </div>
          {entry.collection && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs sm:text-sm px-2 py-1 bg-orange-100 text-orange-800 rounded">
                {entry.collection.name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

export default EntryCard;
