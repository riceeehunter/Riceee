"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { uploadMemory } from "@/actions/memory";
import { toast } from "sonner";
import Image from "next/image";
import { format } from "date-fns";

export default function UploadMemory({ onClose, onSuccess, partnerNames }) {
  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";
  const bothLabel = partnerNames?.bothLabel || `${partnerOneName} x ${partnerTwoName}`;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploadedBy, setUploadedBy] = useState(bothLabel);
  const [memoryDate, setMemoryDate] = useState(new Date());
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setUploadedBy(bothLabel);
  }, [bothLabel]);

  // Handle file selection
  const handleFileChange = (selectedFile) => {
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB");
        return;
      }

      setFile(selectedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", caption);
      formData.append("uploadedBy", uploadedBy);
      formData.append("memoryDate", memoryDate.toISOString());

      const memory = await uploadMemory(formData);
      toast.success("Memory uploaded successfully! 🎉");
      onSuccess(memory);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <Card className="max-w-2xl w-full bg-white rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Upload a Memory 📸
          </h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Drag and Drop Zone */}
        {!preview ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-pink-500 bg-pink-50"
                : "border-gray-300 hover:border-pink-400 hover:bg-pink-50/50"
            }`}
          >
            <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your photo here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG, GIF, WebP • Max 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
            />
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6">
              <Image src={preview} alt="Preview" fill className="object-contain" />
              <Button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4 mr-1" />
                Change
              </Button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Caption */}
              <div>
                <Label htmlFor="caption">Caption (optional)</Label>
                <Input
                  id="caption"
                  placeholder="Add a sweet caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Memory Date */}
              <div>
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-pink-500" />
                  <span>When was this memory? 💕</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-1 border-2 hover:border-pink-300 transition-colors"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-pink-500" />
                      {memoryDate ? format(memoryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={memoryDate}
                      onSelect={setMemoryDate}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">
                  ✨ Choose the date this special moment happened
                </p>
              </div>

              {/* Uploaded By */}
              <div>
                <Label htmlFor="uploadedBy">Who's uploading this?</Label>
                <Select value={uploadedBy} onValueChange={setUploadedBy}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={partnerOneName}>{partnerOneName}</SelectItem>
                    <SelectItem value={partnerTwoName}>{partnerTwoName}</SelectItem>
                    <SelectItem value={bothLabel}>Both Together</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Memory
                    </>
                  )}
                </Button>
                <Button onClick={onClose} variant="outline" disabled={uploading}>
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}

        {/* File info */}
        {file && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">File:</span> {file.name}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Size:</span>{" "}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
