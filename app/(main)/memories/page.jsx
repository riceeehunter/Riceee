import { getMemories, getStorageStats } from "@/actions/memory";
import MemoriesTemplateClient from "./_components/memories-template-client";
import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

export const metadata = {
  title: "Cosmic Memories | Riceee",
  description: "Your sweet moments together 💗",
};

export default async function MemoriesPage() {
  const memories = await getMemories();
  const stats = await getStorageStats();
  const partnerNames = resolvePartnerNames(await getOrCreateUser());

  return (
    <MemoriesTemplateClient
      initialMemories={memories}
      stats={stats}
      partnerNames={partnerNames}
    />
  );
}
