import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import RiceeeChatClient from "./_components/riceee-chat-client";

export default async function RiceeeChatPage() {
  const user = await getOrCreateUser();
  const partnerNames = resolvePartnerNames(user);

  return <RiceeeChatClient partnerNames={partnerNames} />;
}
