import { Suspense } from "react";
import { getMemories, getStorageStats } from "@/actions/memory";
import MemoriesClient from "./_components/memories-client";
import StorageBar from "./_components/storage-bar";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Cosmic Memories | Riceee",
  description: "Our sweet moments together 💗",
};

export default async function MemoriesPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2 sm:mb-4">
            ✨ Cosmic Memories ✨
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Our sweet moments captured in time 💗
          </p>
        </div>

        {/* Storage Stats */}
        <Suspense fallback={<Skeleton className="h-20 w-full mb-8" />}>
          <StorageBarWrapper />
        </Suspense>

        {/* Memories Grid */}
        <Suspense fallback={<MemoriesLoadingSkeleton />}>
          <MemoriesWrapper />
        </Suspense>
      </div>
    </div>
  );
}

async function StorageBarWrapper() {
  const stats = await getStorageStats();
  return <StorageBar stats={stats} />;
}

async function MemoriesWrapper() {
  const memories = await getMemories();
  return <MemoriesClient initialMemories={memories} />;
}

function MemoriesLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}
