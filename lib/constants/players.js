export const PLAYER_IDS = {
  ONE: "hunter",
  TWO: "riceee",
};

export const PLAYER_META = {
  [PLAYER_IDS.ONE]: {
    id: PLAYER_IDS.ONE,
    displayName: "Hunter",
    emoji: "🦁",
    tagline: "The Bold One",
    cardClass: "border-orange-200 hover:border-orange-400",
    textClass: "text-orange-100",
  },
  [PLAYER_IDS.TWO]: {
    id: PLAYER_IDS.TWO,
    displayName: "Riceee",
    emoji: "💗",
    tagline: "The Sweet One",
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
