"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { savePartnerNames } from "@/actions/onboarding";
import { useSpaceState } from "@/components/space-state-provider";
import { toast } from "sonner";

export default function PartnerNamesForm({ initialValues }) {
  const [isPending, startTransition] = useTransition();
  const { isWritable, status } = useSpaceState();
  const [partnerOneName, setPartnerOneName] = useState(initialValues?.partnerOneName || "");
  const [partnerTwoName, setPartnerTwoName] = useState(initialValues?.partnerTwoName || "");

  const locked = !isWritable;

  const onSubmit = (e) => {
    e.preventDefault();
    if (locked) return;

    startTransition(async () => {
      try {
        await savePartnerNames({ partnerOneName, partnerTwoName });
        toast.success("Partner names updated.");
      } catch (error) {
        toast.error(error.message || "Failed to update names.");
      }
    });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Partner names</CardTitle>
        {locked && (
          <p className="text-xs text-stone-500">
            {status === "ARCHIVED"
              ? "Names are fixed in an archive — they're how everything in it is signed."
              : "Names can't be changed while this space is closing."}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="partnerOneName">Partner 1 name</Label>
            <Input
              id="partnerOneName"
              value={partnerOneName}
              onChange={(e) => setPartnerOneName(e.target.value)}
              placeholder="Enter partner 1 name"
              className="h-9"
              required
              disabled={isPending || locked}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partnerTwoName">Partner 2 name</Label>
            <Input
              id="partnerTwoName"
              value={partnerTwoName}
              onChange={(e) => setPartnerTwoName(e.target.value)}
              placeholder="Enter partner 2 name"
              className="h-9"
              required
              disabled={isPending || locked}
            />
          </div>
          <Button type="submit" disabled={isPending || locked}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
