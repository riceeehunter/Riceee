import { getCurrentPartnerNames } from "@/actions/onboarding";
import { getCurrentSpaceInvite, getSpaceStatus } from "@/actions/space-invite";
import PartnerNamesForm from "./_components/partner-names-form";
import SpaceInviteCard from "./_components/space-invite-card";
import SpaceStatusCard from "./_components/space-status-card";

export const metadata = {
  title: "Settings | Riceee",
};

export default async function SettingsPage() {
  const partnerNames = await getCurrentPartnerNames();
  const activeInvite = await getCurrentSpaceInvite();
  const spaceStatus = await getSpaceStatus();

  return (
    <div className="max-w-xl mx-auto px-4 py-4 md:py-6 space-y-2">
      <h1 className="text-3xl font-bold gradient-title">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Update partner names used across your journal.
      </p>
      <PartnerNamesForm initialValues={partnerNames} />
      <SpaceStatusCard status={spaceStatus} />
      <SpaceInviteCard
        initialInviteToken={activeInvite?.token || ""}
        initialInviteExpiry={activeInvite?.expiresAt || null}
      />
    </div>
  );
}
