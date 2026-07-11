// Pusher channel names, scoped per couple space so accounts never share
// real-time traffic. spaceId is the couple's User.id (a cuid).

// Private channel: subscribing requires server-side auth (see /api/pusher/auth),
// so only the two partners in the space can listen to their chat.
export function getSpaceChatChannel(spaceId) {
  return `private-space-${spaceId}-chat`;
}

// Game channels are public but scoped by the space's unguessable cuid.
// Publishing still goes through /api/pusher/trigger, which verifies the
// caller belongs to the space encoded in the channel name.
export function getSpaceGameChannel(gameId, spaceId) {
  return `game-${gameId}-${spaceId}`;
}

// True when `channel` belongs to the given space — used by the trigger and
// auth API routes to reject cross-space publishing/subscribing.
export function channelBelongsToSpace(channel, spaceId) {
  if (!channel || !spaceId) return false;
  return (
    channel === getSpaceChatChannel(spaceId) ||
    channel.endsWith(`-${spaceId}`)
  );
}
