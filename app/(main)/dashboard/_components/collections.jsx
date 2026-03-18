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
      <div className="space-y-1">
        <h2 className="text-3xl font-bold gradient-title">Collections</h2>
        <p className="text-sm text-muted-foreground">
          Organize your journal into themes so it is easier to revisit memories later.
        </p>
      </div>

      {showSetupHint && (
        <Card>
          <CardContent className="pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-medium">Start simple: create your first collection.</p>
              <p className="text-sm text-muted-foreground">
                Try one like “Us Moments”, “Dreams”, or “Lessons Learned”.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setIsCollectionDialogOpen(true)}>
                Create collection
              </Button>
              <Link href="/journal/write">
                <Button variant="outline">Write an entry</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create New Collection Button */}
        <CollectionPreview
          isCreateNew={true}
          onCreateNew={() => setIsCollectionDialogOpen(true)}
        />

        {/* Unorganized Collection */}
        {entriesByCollection?.unorganized?.length > 0 && (
          <CollectionPreview
            name="Unorganized"
            entries={entriesByCollection.unorganized}
            isUnorganized={true}
          />
        )}

        {/* User Collections */}
        {collections?.map((collection) => (
          <CollectionPreview
            key={collection.id}
            id={collection.id}
            name={collection.name}
            entries={entriesByCollection[collection.id] || []}
          />
        ))}

        <CollectionForm
          loading={createCollectionLoading}
          onSuccess={handleCreateCollection}
          open={isCollectionDialogOpen}
          setOpen={setIsCollectionDialogOpen}
        />
      </div>
    </section>
  );
};

export default Collections;
