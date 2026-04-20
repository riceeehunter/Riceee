"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptSpaceInvite } from "@/actions/space-invite";
import { toast } from "sonner";

export default function AcceptInviteCard({ token }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    startTransition(async () => {
      try {
        await acceptSpaceInvite(token);
        setAccepted(true);
        toast.success("Joined shared space successfully.");
        router.push("/dashboard");
      } catch (error) {
        toast.error(error.message || "Failed to join space.");
      }
    });
  };

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Join shared space</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You were invited to join a shared partner space. Continue with this account to access journals, memories, chat, and games together.
        </p>
        <Button className="w-full" onClick={handleAccept} disabled={isPending || accepted}>
          {isPending ? "Joining..." : accepted ? "Joined" : "Accept invite"}
        </Button>
      </CardContent>
    </Card>
  );
}
