import { DEFAULT_PARTNER_NAMES } from "@/lib/constants/partner-names";

export const PLAYER_IDS = {
  ONE: "hunter",
  TWO: "riceee",
};

// Authored content records a *slot*, never a display name. Names are settings —
// they change — so a stored name silently orphans the moment someone renames a
// partner, and every `author === partnerOneName` check in the app starts
// failing. Slots are permanent; the name is looked up at render time.
export const AUTHOR_SLOTS = {
  ONE: PLAYER_IDS.ONE,
  TWO: PLAYER_IDS.TWO,
  BOTH: "both",
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

/**
 * Coerce a stored author value to a slot, or null if it isn't one.
 *
 * Null means the row predates slots and still holds a raw display name. Callers
 * fall back to showing that name verbatim — stale, but exactly what the app
 * already did, so untouched rows never regress while the backfill runs.
 */
export function normalizeAuthorSlot(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === AUTHOR_SLOTS.BOTH) return AUTHOR_SLOTS.BOTH;
  if (normalized === "both partners") return AUTHOR_SLOTS.BOTH;
  return normalizePlayerId(normalized);
}

export function isAuthorSlot(value) {
  return normalizeAuthorSlot(value) !== null;
}

/** Slot -> the name that partner goes by *right now*. */
export function resolveAuthorName(value, partnerNames) {
  const slot = normalizeAuthorSlot(value);

  if (slot === AUTHOR_SLOTS.BOTH) {
    const one = getPlayerDisplayNameFromSettings(PLAYER_IDS.ONE, partnerNames);
    const two = getPlayerDisplayNameFromSettings(PLAYER_IDS.TWO, partnerNames);
    return `${one} x ${two}`;
  }

  if (slot) return getPlayerDisplayNameFromSettings(slot, partnerNames);

  // Legacy row: the stored string is the best name we have.
  return String(value ?? "").trim() || "Partner";
}

/** Short badge form: "P & T" for both, otherwise the partner's current name. */
export function resolveAuthorInitials(value, partnerNames) {
  if (normalizeAuthorSlot(value) === AUTHOR_SLOTS.BOTH) {
    const one = getPlayerDisplayNameFromSettings(PLAYER_IDS.ONE, partnerNames);
    const two = getPlayerDisplayNameFromSettings(PLAYER_IDS.TWO, partnerNames);
    return `${one.charAt(0)} & ${two.charAt(0)}`;
  }
  return resolveAuthorName(value, partnerNames);
}
