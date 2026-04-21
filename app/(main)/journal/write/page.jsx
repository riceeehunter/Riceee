"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useFetch from "@/hooks/use-fetch";
import { BookOpenText, Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createJournalEntry,
  updateJournalEntry,
  getJournalEntry,
  getDraft,
  saveDraft,
} from "@/actions/journal";
import { createCollection, getCollections } from "@/actions/collection";
import { getMoodById, MOODS } from "@/app/lib/moods";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";
import { journalSchema } from "@/app/lib/schemas";
import { getCurrentPartnerNames } from "@/actions/onboarding";
import { plusJakarta, manrope } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "react-quill-new/dist/quill.snow.css";
import CollectionForm from "@/components/collection-form";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export default function JournalEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [isMoodOpen, setIsMoodOpen] = useState(false);
  const [isAuthorOpen, setIsAuthorOpen] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch Hooks
  const {
    loading: collectionsLoading,
    data: collections,
    fn: fetchCollections,
  } = useFetch(getCollections);

  const {
    loading: entryLoading,
    data: existingEntry,
    fn: fetchEntry,
  } = useFetch(getJournalEntry);

  const {
    loading: draftLoading,
    data: draftData,
    fn: fetchDraft,
  } = useFetch(getDraft);

  const { loading: savingDraft, fn: saveDraftFn } = useFetch(saveDraft);
  const { data: partnerNames, fn: fetchPartnerNames } = useFetch(getCurrentPartnerNames);

  const partnerOneName = partnerNames?.partnerOneName || "Partner 1";
  const partnerTwoName = partnerNames?.partnerTwoName || "Partner 2";
  const bothLabel = partnerNames?.bothLabel || `${partnerOneName} x ${partnerTwoName}`;

  const {
    loading: actionLoading,
    fn: actionFn,
    data: actionResult,
  } = useFetch(isEditMode ? updateJournalEntry : createJournalEntry);

  const {
    loading: createCollectionLoading,
    fn: createCollectionFn,
    data: createdCollection,
  } = useFetch(createCollection);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      title: "",
      content: "",
      mood: "",
      author: bothLabel,
      collectionId: "",
    },
  });

  // Handle draft or existing entry loading
  useEffect(() => {
    fetchCollections();
    fetchPartnerNames();
    if (editId) {
      setIsEditMode(true);
      fetchEntry(editId);
    } else {
      setIsEditMode(false);
      fetchDraft();
    }
  }, [editId]);

  // Handle setting form data from draft
  useEffect(() => {
    if (isEditMode && existingEntry) {
      reset({
        title: existingEntry.title || "",
        content: existingEntry.content || "",
        mood: existingEntry.mood || "",
        author: existingEntry.author || bothLabel,
        collectionId: existingEntry.collectionId || "",
      });
    } else if (draftData?.success && draftData?.data) {
      reset({
        title: draftData.data.title || "",
        content: draftData.data.content || "",
        mood: draftData.data.mood || "",
        author: draftData.data.author || bothLabel,
        collectionId: "",
      });
    } else {
      reset({
        title: "",
        content: "",
        mood: "",
        author: bothLabel,
        collectionId: "",
      });
    }
  }, [draftData, isEditMode, existingEntry, bothLabel]);

  // Handle collection creation success
  useEffect(() => {
    if (createdCollection) {
      setIsCollectionDialogOpen(false);
      fetchCollections();
      setValue("collectionId", createdCollection.id);
      toast.success(`Collection ${createdCollection.name} created!`);
    }
  }, [createdCollection]);

  // Handle successful submission
  useEffect(() => {
    if (actionResult && !actionLoading) {
      // Clear draft after successful publish
      if (!isEditMode) {
        saveDraftFn({ title: "", content: "", mood: "" });
      }

      router.push(
        `/collection/${
          actionResult.collectionId ? actionResult.collectionId : "unorganized"
        }`
      );

      toast.success(
        `Entry ${isEditMode ? "updated" : "created"} successfully!`
      );
    }
  }, [actionResult, actionLoading]);

  const onSubmit = handleSubmit(async (data) => {
    const mood = getMoodById(data.mood);
    actionFn({
      ...data,
      moodScore: mood.score,
      moodQuery: mood.pixabayQuery,
      ...(isEditMode && { id: editId }),
    });
  });

  const formData = watch();
  const selectedMoodPrompt = getMoodById(watch("mood"))?.prompt ?? "Write your thoughts...";

  const handleSaveDraft = async () => {
    if (!isDirty) {
      toast.error("No changes to save");
      return;
    }
    const result = await saveDraftFn(formData);
    if (result?.success) {
      toast.success("Draft saved successfully");
    }
  };

  const handleCreateCollection = async (data) => {
    createCollectionFn(data);
  };

  const isLoading =
    collectionsLoading ||
    entryLoading ||
    draftLoading ||
    actionLoading ||
    savingDraft;

  return (
    <div className={`${manrope.className} max-w-6xl mx-auto px-4 md:px-6 pb-10`}>
      <form onSubmit={onSubmit} className="space-y-5 mx-auto">
        <section className="rounded-[2rem] border border-[#ffdfcf] bg-gradient-to-br from-[#fff8f2] to-[#fff1f6] p-6 md:p-8 shadow-[0_14px_36px_rgba(57,56,50,0.08)]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#ffd0bb] bg-white/75 px-3 py-1 text-[11px] font-semibold text-[#9d4867] uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Journal Space
              </p>
              <h1 className={`${plusJakarta.className} mt-3 text-4xl md:text-6xl font-extrabold tracking-tight text-[#ab4400]`}>
                {isEditMode ? "Refine Your Entry" : "What's on your mind?"}
              </h1>
              <p className="mt-2 text-sm md:text-base text-[#66645e] max-w-2xl">
                Capture this moment in your own voice. Keep it raw, honest, and yours.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffdfcf] bg-white px-3 py-2 text-xs text-[#6a2700]">
              <BookOpenText className="h-4 w-4" />
              {isEditMode ? "Editing Mode" : "Fresh Draft"}
            </div>
          </div>
          {isLoading && (
            <BarLoader className="mt-5" width={"100%"} color="#ab4400" />
          )}
        </section>

        <section className="rounded-[2rem] border border-[#ffdfcf] bg-white/85 p-5 md:p-6 shadow-[0_10px_28px_rgba(57,56,50,0.07)] space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#6a2700]">Title</label>
            <Input
              disabled={isLoading}
              {...register("title")}
              placeholder="Give your entry a title..."
              className={`h-12 rounded-xl border-[#ffdfcf] bg-[#fffbff] text-[#393832] placeholder:text-[#9b948d] ${
                errors.title ? "border-red-500" : ""
              }`}
            />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#6a2700]">How are you feeling?</label>
              <Controller
                name="mood"
                control={control}
                render={({ field }) => (
                  <Popover open={isMoodOpen} onOpenChange={setIsMoodOpen} modal={false}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-11 w-full items-center justify-between rounded-xl border bg-[#fffbff] px-3 text-left text-sm",
                          errors.mood ? "border-red-500" : "border-[#ffdfcf]"
                        )}
                      >
                        <span className={field.value ? "text-[#393832]" : "text-[#9b948d]"}>
                          {field.value
                            ? `${getMoodById(field.value)?.emoji ?? ""} ${getMoodById(field.value)?.label ?? ""}`.trim()
                            : "Select a mood..."}
                        </span>
                        <ChevronDown className="h-4 w-4 text-[#9b948d]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={8}
                      className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto border-[#ffdfcf] bg-[#fffaf6] p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {Object.values(MOODS).map((mood) => (
                        <button
                          key={mood.id}
                          type="button"
                          onClick={() => {
                            field.onChange(mood.id);
                            setIsMoodOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#393832] transition hover:bg-[#fff1e7]"
                        >
                          <span className="flex items-center gap-2">
                            {mood.emoji} {mood.label}
                          </span>
                          <Check
                            className={cn(
                              "h-4 w-4 text-[#ab4400]",
                              field.value === mood.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.mood && (
                <p className="text-red-500 text-sm">{errors.mood.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#6a2700]">Written by</label>
              <Controller
                name="author"
                control={control}
                render={({ field }) => (
                  <Popover open={isAuthorOpen} onOpenChange={setIsAuthorOpen} modal={false}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-11 w-full items-center justify-between rounded-xl border bg-[#fffbff] px-3 text-left text-sm",
                          errors.author ? "border-red-500" : "border-[#ffdfcf]"
                        )}
                      >
                        <span className={field.value ? "text-[#393832]" : "text-[#9b948d]"}>
                          {field.value || "Who's writing?"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-[#9b948d]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={8}
                      className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto border-[#ffdfcf] bg-[#fffaf6] p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {[
                        { value: partnerOneName, label: `${partnerOneName} 💙` },
                        { value: partnerTwoName, label: `${partnerTwoName} 💗` },
                        { value: bothLabel, label: `${bothLabel} 💕` },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            field.onChange(option.value);
                            setIsAuthorOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#393832] transition hover:bg-[#fff1e7]"
                        >
                          <span>{option.label}</span>
                          <Check
                            className={cn(
                              "h-4 w-4 text-[#ab4400]",
                              field.value === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.author && (
                <p className="text-red-500 text-sm">{errors.author.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#6a2700]">
              {selectedMoodPrompt}
            </label>
            <div className="journal-editor rounded-2xl border border-[#ffdfcf] overflow-hidden bg-[#fffbff]">
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <ReactQuill
                    readOnly={isLoading}
                    theme="snow"
                    value={field.value}
                    onChange={field.onChange}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["blockquote", "code-block"],
                        ["link"],
                        ["clean"],
                      ],
                    }}
                  />
                )}
              />
            </div>
            {errors.content && (
              <p className="text-red-500 text-sm">{errors.content.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#6a2700]">
              Add to Collection (Optional)
            </label>
            <Controller
              name="collectionId"
              control={control}
              render={({ field }) => (
                <Popover open={isCollectionOpen} onOpenChange={setIsCollectionOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-11 w-full items-center justify-between rounded-xl border border-[#ffdfcf] bg-[#fffbff] px-3 text-left text-sm"
                    >
                      <span className={field.value ? "text-[#393832]" : "text-[#9b948d]"}>
                        {field.value
                          ? collections?.find((collection) => collection.id === field.value)?.name ?? "Choose a collection..."
                          : "Choose a collection..."}
                      </span>
                      <ChevronDown className="h-4 w-4 text-[#9b948d]" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="max-h-72 w-[var(--radix-popover-trigger-width)] overflow-y-auto border-[#ffdfcf] bg-[#fffaf6] p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {collections?.map((collection) => (
                      <button
                        key={collection.id}
                        type="button"
                        onClick={() => {
                          field.onChange(collection.id);
                          setIsCollectionOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#393832] transition hover:bg-[#fff1e7]"
                      >
                        <span>{collection.name}</span>
                        <Check
                          className={cn(
                            "h-4 w-4 text-[#ab4400]",
                            field.value === collection.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCollectionOpen(false);
                        setIsCollectionDialogOpen(true);
                      }}
                      className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-[#ab4400] transition hover:bg-[#fff1e7]"
                    >
                      + Create New Collection
                    </button>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={savingDraft || !isDirty}
                className="rounded-full border-[#ffdfcf] text-[#6a2700] hover:bg-[#fff2e8]"
              >
                {savingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save as Draft
              </Button>
            )}
            <Button
              type="submit"
              disabled={actionLoading || !isDirty}
              className="rounded-full bg-gradient-to-r from-[#ab4400] to-[#ff9969] hover:from-[#973b00] hover:to-[#ff8b57] text-white shadow-[0_10px_20px_rgba(171,68,0,0.22)]"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Entry" : "Publish"}
            </Button>
            {isEditMode && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/journal/${existingEntry.id}`);
                }}
                variant="outline"
                className="rounded-full border-[#f3bfd0] text-[#9d4867] hover:bg-[#fff1f6]"
              >
                Cancel
              </Button>
            )}
          </div>
        </section>
      </form>

      <CollectionForm
        loading={createCollectionLoading}
        onSuccess={handleCreateCollection}
        open={isCollectionDialogOpen}
        setOpen={setIsCollectionDialogOpen}
      />
    </div>
  );
}
