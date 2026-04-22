import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import { RiceeeHub } from "@/components/riceee-hub";
import RiceeeChatClient from "./_components/riceee-chat-client";
import DigitalCourtroom from "./_components/digital-courtroom";
import RiceeeChatLayout from "./_components/riceee-chat-layout";

export const metadata = {
  title: "Riceee AI | Relationship Assistant",
};

export default function RiceeeChatPage() {
  return <RiceeeChatLayout />;
}
