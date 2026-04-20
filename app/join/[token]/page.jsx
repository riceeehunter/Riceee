import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AcceptInviteCard from "./_components/accept-invite-card";

export const metadata = {
  title: "Join partner space | Riceee",
};

export default async function JoinInvitePage({ params }) {
  const { token } = params;
  const { userId } = await auth();

  if (!token) {
    redirect("/");
  }

  if (!userId) {
    redirect(`/sign-in?redirect_url=/join/${token}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <AcceptInviteCard token={token} />
    </div>
  );
}
