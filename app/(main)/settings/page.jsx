import { getCurrentPartnerNames } from "@/actions/onboarding";
import { getSpaceStatus } from "@/actions/space-invite";
import PartnerNamesForm from "./_components/partner-names-form";
import SpaceConnectionCard from "./_components/space-connection-card";

export const metadata = {
  title: "Settings | Riceee",
};

export default async function SettingsPage() {
  const [partnerNames, spaceStatus] = await Promise.all([
    getCurrentPartnerNames(),
    getSpaceStatus(),
  ]);

  return (
    <div className="max-w-xl mx-auto px-4 py-4 md:py-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold gradient-title">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your partner connection and the names used across your journal.
        </p>
      </div>
      <SpaceConnectionCard status={spaceStatus} />
      <PartnerNamesForm initialValues={partnerNames} />
    </div>
  );
}
