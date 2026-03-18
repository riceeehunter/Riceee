"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { savePartnerNames } from "@/actions/onboarding";
import { toast } from "sonner";

export default function PartnerNamesForm({ initialValues }) {
  const [isPending, startTransition] = useTransition();
  const [partnerOneName, setPartnerOneName] = useState(initialValues?.partnerOneName || "");
  const [partnerTwoName, setPartnerTwoName] = useState(initialValues?.partnerTwoName || "");

  const onSubmit = (e) => {
    e.preventDefault();

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
              disabled={isPending}
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
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
