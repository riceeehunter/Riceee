"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, Edit2, X, Upload, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteMemory, updateMemoryCaption } from "@/actions/memory";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import UploadMemory from "./upload-memory";

export default function MemoriesClient({ initialMemories, partnerNames }) {
  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";
  const bothLabel = partnerNames?.bothLabel || `${partnerOneName} x ${partnerTwoName}`;
  const [memories, setMemories] = useState(initialMemories);
  const [filteredMemories, setFilteredMemories] = useState(initialMemories);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [isScattered, setIsScattered] = useState(false);

  const router = useRouter();
  const isPartnerOne = (value) => value === partnerOneName || value === "Partner 1";
  const isPartnerTwo = (value) => value === partnerTwoName || value === "Partner 2";
  const isBothPartners = (value) => value === bothLabel || value === "Both Partners";

  // Filter memories
  const applyFilters = () => {
    let filtered = [...memories];

    // Filter by uploader
    if (filterBy !== "all") {
      filtered = filtered.filter((m) => m.uploadedBy === filterBy);
    }

    // Search in captions
    if (searchQuery) {
      filtered = filtered.filter((m) =>
        m.caption?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMemories(filtered);
  };

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterBy, memories]);

  // Delete memory
  const handleDelete = async () => {
    try {
      await deleteMemory(selectedMemory.id);
      setMemories(memories.filter((m) => m.id !== selectedMemory.id));
      setFilteredMemories(filteredMemories.filter((m) => m.id !== selectedMemory.id));
      toast.success("Memory deleted successfully");
      setSelectedMemory(null);
      setDeleteDialog(false);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Update caption
  const handleUpdateCaption = async () => {
    try {
      await updateMemoryCaption(selectedMemory.id, caption);
      const updated = memories.map((m) =>
        m.id === selectedMemory.id ? { ...m, caption } : m
      );
      setMemories(updated);
      setFilteredMemories(updated);
      setSelectedMemory({ ...selectedMemory, caption });
      setEditingCaption(false);
      toast.success("Caption updated");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Toggle scatter animation
  const toggleScatter = () => {
    setIsScattered(!isScattered);
  };

  // Open lightbox
  const openLightbox = (memory) => {
    setSelectedMemory(memory);
    setCaption(memory.caption || "");
  };

  return (
    <div suppressHydrationWarning>
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              applyFilters();
            }}
            className="pl-10 bg-white/80 backdrop-blur-sm border-pink-200"
          />
        </div>

        {/* Row for filters and buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Filter by uploader */}
          <Select
            value={filterBy}
            onValueChange={(value) => {
              setFilterBy(value);
              applyFilters();
            }}
          >
            <SelectTrigger className="flex-1 min-w-[140px] bg-white/80 backdrop-blur-sm border-pink-200">
              <SelectValue placeholder="Filter by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Memories</SelectItem>
              <SelectItem value={partnerOneName}>{partnerOneName}'s Photos</SelectItem>
              <SelectItem value={partnerTwoName}>{partnerTwoName}'s Photos</SelectItem>
              <SelectItem value={bothLabel}>Both Together</SelectItem>
            </SelectContent>
          </Select>

          {/* Scatter button - hide on mobile */}
          <Button
            onClick={toggleScatter}
            variant="outline"
            className="hidden sm:flex bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isScattered ? "Organize" : "Scatter"}
          </Button>

          {/* Upload button */}
          <Button
            onClick={() => setUploadOpen(true)}
            className="flex-1 min-w-[140px] bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Upload Memory</span>
            <span className="sm:hidden">Upload</span>
          </Button>
        </div>
      </div>

      {/* Memories Grid */}
      {filteredMemories.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center bg-white/60 backdrop-blur-sm">
          <p className="text-gray-500 text-base sm:text-lg mb-4">No memories yet 📸</p>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-gradient-to-r from-pink-600 to-purple-600"
          >
            Upload Your First Memory
          </Button>
        </Card>
      ) : (
        <div
          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${
            isScattered ? "scattered" : ""
          }`}
        >
          {filteredMemories.map((memory, index) => (
            <div
              key={memory.id}
              className="group relative polaroid-card cursor-pointer"
              style={{
                animationDelay: `${index * 0.1}s`,
                "--float-in-rotate": `${((index % 5) - 2) * 1.5}deg`,
                "--scatter-x": `${(index % 6) * 18 - 45}px`,
                "--scatter-y": `${Math.floor(index / 6) % 5 * 18 - 36}px`,
                "--scatter-rotate": `${(index % 7) * 4 - 12}deg`,
              }}
              onClick={() => openLightbox(memory)}
            >
              {/* Polaroid Frame */}
              <div className="bg-white p-3 pb-12 shadow-2xl rounded-lg transition-all duration-300 group-hover:shadow-pink-500/50 group-hover:-translate-y-4 group-hover:rotate-0">
                <div className="aspect-square relative overflow-hidden rounded bg-gray-100">
                  <Image
                    src={memory.url}
                    alt={memory.caption || "Memory"}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Caption on polaroid */}
                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <p className="text-sm text-gray-700 line-clamp-2 font-medium">
                    {memory.caption || "✨ Sweet moment"}
                  </p>
                </div>

                {/* Uploader badge */}
                <div className="absolute top-6 right-6 z-10">
                  <span
                      className={`text-xs px-2 py-1 rounded-full font-medium shadow-lg ${
                      isPartnerOne(memory.uploadedBy)
                        ? "bg-blue-500 text-white"
                        : isPartnerTwo(memory.uploadedBy)
                        ? "bg-pink-500 text-white"
                        : "bg-gradient-to-r from-blue-500 to-pink-500 text-white"
                    }`}
                  >
                    {isBothPartners(memory.uploadedBy)
                      ? `${partnerOneName.charAt(0)} & ${partnerTwoName.charAt(0)}`
                      : memory.uploadedBy}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Button
            onClick={() => setSelectedMemory(null)}
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            size="icon"
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="max-w-5xl w-full bg-white rounded-lg overflow-hidden shadow-2xl">
            <div className="grid md:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square bg-gray-900">
                <Image
                  src={selectedMemory.url}
                  alt={selectedMemory.caption || "Memory"}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Details */}
              <div className="p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span
                      className={`text-sm px-3 py-1 rounded-full font-medium ${
                        isPartnerOne(selectedMemory.uploadedBy)
                          ? "bg-blue-100 text-blue-700"
                          : isPartnerTwo(selectedMemory.uploadedBy)
                          ? "bg-pink-100 text-pink-700"
                          : "bg-gradient-to-r from-blue-100 to-pink-100 text-purple-700"
                      }`}
                    >
                      {selectedMemory.uploadedBy}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingCaption(!editingCaption)}
                      variant="outline"
                      size="icon"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setDeleteDialog(true)}
                      variant="outline"
                      size="icon"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Caption */}
                <div className="flex-1">
                  {editingCaption ? (
                    <div className="space-y-3">
                      <Input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateCaption} size="sm">
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingCaption(false)}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 text-lg">
                      {selectedMemory.caption || "No caption yet"}
                    </p>
                  )}
                </div>

                {/* Date */}
                <p className="text-sm text-gray-500 mt-4">
                  {format(new Date(selectedMemory.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      {uploadOpen && (
        <UploadMemory
          onClose={() => setUploadOpen(false)}
          partnerNames={partnerNames}
          onSuccess={(newMemory) => {
            setMemories([newMemory, ...memories]);
            setFilteredMemories([newMemory, ...filteredMemories]);
            setUploadOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This memory will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        .polaroid-card {
          animation: floatIn 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }

        .scattered .polaroid-card {
          animation: scatter 0.8s ease-out forwards;
        }

        @keyframes floatIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scatter {
          to {
            transform: translate(var(--scatter-x, 0px), var(--scatter-y, 0px))
              rotate(var(--scatter-rotate, 0deg)) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}
