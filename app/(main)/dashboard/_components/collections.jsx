"use client";

import React, { useState, useEffect } from "react";
import { createCollection } from "@/actions/collection";
import { toast } from "sonner";
import CollectionPreview from "./collection-preview";
import CollectionForm from "@/components/collection-form";
import useFetch from "@/hooks/use-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { plusJakarta } from "@/lib/fonts";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const Collections = ({ collections = [], entriesByCollection }) => {
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const router = useRouter();

  const hasUnorganizedEntries = (entriesByCollection?.unorganized?.length ?? 0) > 0;
  const hasAnyCollections = (collections?.length ?? 0) > 0;
  const showSetupHint = !hasUnorganizedEntries && !hasAnyCollections;

  const {
    loading: createCollectionLoading,
    fn: createCollectionFn,
    data: createdCollection,
  } = useFetch(createCollection);

  useEffect(() => {
    if (createdCollection) {
      setIsCollectionDialogOpen(false);
      router.refresh();
      toast.success(`Collection ${createdCollection.name} created!`);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdCollection, createCollectionLoading, router]);

  const handleCreateCollection = async (data) => {
    createCollectionFn(data);
  };

  return (
    <section id="collections" className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="space-y-2 relative"
      >
        {/* washi tape accent */}
        <div className="absolute -top-3 left-24 w-20 h-5 bg-[#ffae88]/30 rotate-[-3deg] rounded-sm pointer-events-none hidden md:block" />
        <h2 className={`${plusJakarta.className} text-4xl md:text-5xl font-bold text-[#ab4400] tracking-tight`}>
          Collections <span className="text-2xl md:text-3xl align-middle">🗂️</span>
        </h2>
        <p className="text-base text-[#66645e]">
          Organize your journal into themes so it is easier to revisit memories later.
        </p>
      </motion.div>

      {showSetupHint && (
        <Card className="bg-white/70 border-[#ffae88]/25 rounded-3xl shadow-[0_12px_32px_rgba(57,56,50,0.08)]">
          <CardContent className="pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className={`${plusJakarta.className} font-semibold text-[#393832] text-lg`}>
                Start simple: create your first collection.
              </p>
              <p className="text-sm text-[#66645e]">
                Try one like “Us Moments”, “Dreams”, or “Lessons Learned”.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsCollectionDialogOpen(true)}
                className="rounded-full bg-[#ab4400] hover:bg-[#973b00] text-white"
              >
                Create collection
              </Button>
              <Link href="/journal/write">
                <Button variant="outline" className="rounded-full border-[#ffae88]/50 text-[#6a2700] hover:bg-[#fff0e8]">
                  Write an entry
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <motion.div
        variants={gridStagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {/* Create New Collection Button */}
        <motion.div variants={fadeUp}>
          <CollectionPreview
            isCreateNew={true}
            onCreateNew={() => setIsCollectionDialogOpen(true)}
          />
        </motion.div>

        {/* Unorganized Collection */}
        {entriesByCollection?.unorganized?.length > 0 && (
          <motion.div variants={fadeUp}>
            <CollectionPreview
              name="Unorganized"
              entries={entriesByCollection.unorganized}
              isUnorganized={true}
            />
          </motion.div>
        )}

        {/* User Collections */}
        {collections?.map((collection) => (
          <motion.div key={collection.id} variants={fadeUp}>
            <CollectionPreview
              id={collection.id}
              name={collection.name}
              entries={entriesByCollection[collection.id] || []}
            />
          </motion.div>
        ))}

        <CollectionForm
          loading={createCollectionLoading}
          onSuccess={handleCreateCollection}
          open={isCollectionDialogOpen}
          setOpen={setIsCollectionDialogOpen}
        />
      </motion.div>
    </section>
  );
};

export default Collections;
