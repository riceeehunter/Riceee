import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="sign-up-page">
      <SignUp forceRedirectUrl="/onboarding" />
    </div>
  );
}
