import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { previewSpaceInvite } from "@/actions/space-invite";
import AcceptInviteCard from "./_components/accept-invite-card";

export const metadata = {
  title: "Connect with your partner | Riceee",
};

export default async function JoinInvitePage({ params }) {
  const { token } = await params;
  const { userId } = await auth();

  if (!token) {
    redirect("/");
  }

  if (!userId) {
    redirect(`/sign-in?redirect_url=/join/${token}`);
  }

  // Resolved here so the page paints the real answer on first frame — whose
  // space this is, or exactly why it can't be joined.
  const preview = await previewSpaceInvite(token);

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10 bg-[#fdf8ee]">
      <AcceptInviteCard code={token} preview={preview} />
    </div>
  );
}
