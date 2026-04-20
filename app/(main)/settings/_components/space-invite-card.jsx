"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSpaceInvite } from "@/actions/space-invite";
import { toast } from "sonner";

function formatDate(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  return date.toLocaleString();
}

export default function SpaceInviteCard({ initialInviteToken, initialInviteExpiry }) {
  const [isPending, startTransition] = useTransition();
  const [inviteToken, setInviteToken] = useState(initialInviteToken || "");
  const [expiresAt, setExpiresAt] = useState(initialInviteExpiry || null);

  const inviteLink = useMemo(() => {
    if (!inviteToken) return "";
    if (typeof window === "undefined") return `/join/${inviteToken}`;
    return `${window.location.origin}/join/${inviteToken}`;
  }, [inviteToken]);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const invite = await createSpaceInvite();
        setInviteToken(invite.token);
        setExpiresAt(invite.expiresAt);
        toast.success("New invite link generated.");
      } catch (error) {
        toast.error(error.message || "Failed to generate invite.");
      }
    });
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Failed to copy invite link.");
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Partner invite</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground">
          Invite your partner with a secure one-time link. They can sign in with their own account and join your shared space.
        </p>

        <div className="space-y-2">
          <Input value={inviteLink || "No active invite yet"} readOnly />
          {expiresAt && (
            <p className="text-xs text-muted-foreground">Expires: {formatDate(expiresAt)}</p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Generating..." : inviteToken ? "Regenerate link" : "Generate invite link"}
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={!inviteLink}>
            Copy link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
