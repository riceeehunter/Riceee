import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";

export const PLAYER_IDS = {
  ONE: "hunter",
  TWO: "riceee",
};

export const PLAYER_META = {
  [PLAYER_IDS.ONE]: {
    id: PLAYER_IDS.ONE,
    displayName: "Partner 1",
    emoji: "🦁",
    tagline: "Player One",
    cardClass: "border-orange-200 hover:border-orange-400",
    textClass: "text-orange-100",
  },
  [PLAYER_IDS.TWO]: {
    id: PLAYER_IDS.TWO,
    displayName: "Partner 2",
    emoji: "💗",
    tagline: "Player Two",
    cardClass: "border-pink-200 hover:border-pink-400",
    textClass: "text-pink-100",
  },
};

export const PLAYER_DEFAULT_COLORS = {
  [PLAYER_IDS.ONE]: "from-orange-500 to-red-600",
  [PLAYER_IDS.TWO]: "from-pink-500 to-rose-600",
};

export function getOtherPlayer(playerId) {
  return playerId === PLAYER_IDS.ONE ? PLAYER_IDS.TWO : PLAYER_IDS.ONE;
}

export function normalizePlayerId(player) {
  if (!player) return null;
  const normalized = player.toLowerCase();
  if (normalized === PLAYER_IDS.ONE) return PLAYER_IDS.ONE;
  if (normalized === PLAYER_IDS.TWO) return PLAYER_IDS.TWO;
  if (normalized === "partner1") return PLAYER_IDS.ONE;
  if (normalized === "partner2") return PLAYER_IDS.TWO;
  if (normalized === "player1") return PLAYER_IDS.ONE;
  if (normalized === "player2") return PLAYER_IDS.TWO;
  if (normalized === "partner 1") return PLAYER_IDS.ONE;
  if (normalized === "partner 2") return PLAYER_IDS.TWO;
  if (normalized === "player 1") return PLAYER_IDS.ONE;
  if (normalized === "player 2") return PLAYER_IDS.TWO;
  return null;
}

export function getPlayerSenderAliases(playerId) {
  if (playerId === PLAYER_IDS.ONE) {
    return [PLAYER_IDS.ONE, "Partner 1", "partner1", "Player 1", "player1"];
  }
  if (playerId === PLAYER_IDS.TWO) {
    return [PLAYER_IDS.TWO, "Partner 2", "partner2", "Player 2", "player2"];
  }
  return [];
}

export function getPlayerMeta(playerId) {
  return PLAYER_META[playerId];
}

export function getPlayerLabel(playerId) {
  const player = PLAYER_META[playerId];
  return player ? `${player.emoji} ${player.displayName}` : "Player";
}

export function getPlayerDisplayName(playerId) {
  const player = PLAYER_META[playerId];
  return player ? player.displayName : "Player";
}

export function getPlayerDisplayNameFromSettings(playerId, partnerNames) {
  if (playerId === PLAYER_IDS.ONE) {
    return partnerNames?.partnerOneName?.trim() || DEFAULT_PARTNER_NAMES.partnerOneName;
  }
  if (playerId === PLAYER_IDS.TWO) {
    return partnerNames?.partnerTwoName?.trim() || DEFAULT_PARTNER_NAMES.partnerTwoName;
  }
  return "Player";
}

export function getPlayerLabelFromSettings(playerId, partnerNames) {
  const meta = getPlayerMeta(playerId);
  const name = getPlayerDisplayNameFromSettings(playerId, partnerNames);
  return `${meta?.emoji || "🎮"} ${name}`;
}
