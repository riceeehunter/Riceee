import Header from "@/components/header";
import LandingClient from "@/components/landing-client";
import { checkUser } from "@/lib/checkUser";
import { resolvePartnerNames } from "@/lib/constants/partner-names";

export default async function LandingPage() {
  const user = await checkUser();
  const isLoggedIn = !!user;
  const partnerNames = resolvePartnerNames(user);

  return (
    <>
      <Header />
      <LandingClient isLoggedIn={isLoggedIn} partnerNames={partnerNames} />
    </>
  );
}
