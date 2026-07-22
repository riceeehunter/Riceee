import { getOrCreateUser } from "@/lib/auth";
import { getViewerSlot } from "@/lib/space-identity";
import { PLAYER_IDS } from "@/lib/constants/players";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import { RiceeeHub } from "@/components/riceee-hub";
import RiceeeChatClient from "./_components/riceee-chat-client";
import DigitalCourtroom from "./_components/digital-courtroom";
import RiceeeChatLayout from "./_components/riceee-chat-layout";

export const metadata = {
  title: "Riceee AI | Relationship Assistant",
};

export default async function RiceeeChatPage() {
  const user = await getOrCreateUser();
  const resolved = resolvePartnerNames(user);
  const partnerNames = [resolved.partnerOneName, resolved.partnerTwoName];

  // Which partner is actually signed in. The courtroom used to let you pick,
  // which only ever made sense for testing both sides from one login.
  const slot = await getViewerSlot(user.id);
  const viewerIdx = slot === PLAYER_IDS.TWO ? 1 : 0;

  return <RiceeeChatLayout partnerNames={partnerNames} viewerIdx={viewerIdx} />;
}
