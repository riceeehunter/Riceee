import { getCurrentGameSetup } from "@/actions/onboarding";
import { GameSetupProvider } from "@/components/game-setup-provider";

// Player identity + partner names ship with the HTML. The wrapper used to
// fetch this from the client, which meant a blank screen on every game open.
export default async function GamesLayout({ children }) {
  let setup = null;
  try {
    setup = await getCurrentGameSetup();
  } catch {
    // Wrapper falls back to fetching it itself
  }

  return <GameSetupProvider value={setup}>{children}</GameSetupProvider>;
}
