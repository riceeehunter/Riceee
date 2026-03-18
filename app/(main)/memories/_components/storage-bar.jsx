"use client";

import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

export default function StorageBar({ stats }) {
  const { totalSize, totalCount, usagePercentage, quotaLimit } = stats;

  // Format bytes to readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Determine color based on usage
  const getColor = () => {
    if (usagePercentage < 50) return "bg-green-500";
    if (usagePercentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="p-4 sm:p-6 mb-8 bg-white/80 backdrop-blur-sm border-2 border-pink-200">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-700">Storage Usage</h3>
          <p className="text-xs sm:text-sm text-gray-500 break-words">
            {totalCount} memories • {formatBytes(totalSize)} of {formatBytes(quotaLimit)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-lg sm:text-2xl font-bold ${usagePercentage > 80 ? 'text-red-600' : 'text-pink-600'}`}>
            {usagePercentage}%
          </span>
        </div>
      </div>
      <Progress 
        value={parseFloat(usagePercentage)} 
        className="h-3"
        indicatorClassName={getColor()}
      />
      {usagePercentage > 90 && (
        <p className="text-sm text-red-600 mt-2">
          ⚠️ Storage almost full! Consider deleting some memories.
        </p>
      )}
    </Card>
  );
}
