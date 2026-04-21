import { getOrCreateUser } from "@/lib/auth";
import { resolvePartnerNames } from "@/lib/constants/partner-names";
import UploadMemoryPageClient from "../_components/upload-memory-page-client";

export const metadata = {
  title: "Upload Memory | Riceee",
  description: "Save a special moment to your shared scrapbook",
};

export default async function UploadMemoryPage() {
  const user = await getOrCreateUser();
  const partnerNames = resolvePartnerNames(user);

  return <UploadMemoryPageClient partnerNames={partnerNames} />;
}
