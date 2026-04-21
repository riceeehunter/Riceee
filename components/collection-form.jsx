"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { collectionSchema } from "@/app/lib/schemas";
import { BarLoader } from "react-spinners";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { plusJakarta } from "@/lib/fonts";

const CollectionForm = ({ onSuccess, loading, open, setOpen }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    onSuccess(data);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#fffbff] border border-[#ffae88]/35 rounded-3xl shadow-[0_20px_48px_rgba(57,56,50,0.16)]">
        <DialogHeader>
          <DialogTitle className={`${plusJakarta.className} text-2xl text-[#ab4400]`}>Create New Collection</DialogTitle>
        </DialogHeader>
        {loading && (
          <BarLoader className="mb-4" width={"100%"} color="orange" />
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#6a2700]">Collection Name</label>
            <Input
              {...register("name")}
              placeholder="Enter collection name..."
              className={errors.name ? "border-red-500" : "border-[#ffae88]/35 bg-white/90"}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#6a2700]">
              Description (Optional)
            </label>
            <Textarea
              {...register("description")}
              placeholder="Describe your collection..."
              className={errors.description ? "border-red-500" : "border-[#ffae88]/35 bg-white/90"}
            />
            {errors.description && (
              <p className="text-red-500 text-sm">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-[#66645e] hover:bg-[#f7f3ed]"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full bg-[#ab4400] hover:bg-[#973b00] text-white">
              Create Collection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CollectionForm;
