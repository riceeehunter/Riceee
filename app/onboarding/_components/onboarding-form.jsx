"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { savePartnerNames } from "@/actions/onboarding";
import { toast } from "sonner";

export default function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [partnerOneName, setPartnerOneName] = useState("");
  const [partnerTwoName, setPartnerTwoName] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        await savePartnerNames({ partnerOneName, partnerTwoName });
        toast.success("Saved! Welcome to Riceee.");
        router.push("/dashboard");
      } catch (error) {
        toast.error(error.message || "Failed to save names.");
      }
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome to Riceee</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set the two names you want to use across the app.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partnerOneName">Partner 1 name</Label>
            <Input
              id="partnerOneName"
              value={partnerOneName}
              onChange={(e) => setPartnerOneName(e.target.value)}
              placeholder="e.g. Alex"
              disabled={isPending}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partnerTwoName">Partner 2 name</Label>
            <Input
              id="partnerTwoName"
              value={partnerTwoName}
              onChange={(e) => setPartnerTwoName(e.target.value)}
              placeholder="e.g. Sam"
              disabled={isPending}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
