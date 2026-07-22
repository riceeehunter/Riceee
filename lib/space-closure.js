import { randomUUID } from "node:crypto";
import { db } from "./prisma";
import { PLAYER_IDS } from "./constants/players";

/**
 * Ending a space.
 *
 * The shape of this is deliberate, and the reasoning matters more than the code:
 *
 * One partner ending things is the normal case, not the exception. Every step
 * here has to work even if the other person never logs in again, or is actively
 * angry. So nothing waits on mutual agreement, and nothing about the outcome
 * depends on the other person cooperating.
 *
 * The cooldown exists to stop a furious 2am tap being irreversible. At the end
 * of it the space is deep-copied into two independent archives — one row each,
 * one per partner. That copy is expensive, and it buys exactly one thing: every
 * content model in this schema cascade-deletes off a single userId, so a shared
 * archive would mean one delete could take out both people's entire history.
 * After the fork, neither person's row can reach the other's.
 */

export const COOLDOWN_DAYS = 14;

export const SPACE_STATUS = {
  ACTIVE: "ACTIVE",
  COOLING_DOWN: "COOLING_DOWN",
  ARCHIVED: "ARCHIVED",
};

/** Fields every caller needs to reason about closure, without pulling the row twice. */
export const CLOSURE_FIELDS = {
  spaceStatus: true,
  closureInitiatedBy: true,
  closureStartedAt: true,
  closesAt: true,
  archivedAt: true,
  forkedFromId: true,
};

export function isArchived(space) {
  return space?.spaceStatus === SPACE_STATUS.ARCHIVED;
}

export function isCoolingDown(space) {
  return space?.spaceStatus === SPACE_STATUS.COOLING_DOWN;
}

/** Whole days left before the fork, floored at 0. Null when nothing is scheduled. */
export function daysUntilClose(space, now = new Date()) {
  if (!space?.closesAt) return null;
  const ms = new Date(space.closesAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** True once the cooldown has run out and the fork is owed. */
export function isForkDue(space, now = new Date()) {
  return (
    isCoolingDown(space) && Boolean(space.closesAt) && new Date(space.closesAt) <= now
  );
}

export function cooldownEndDate(from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + COOLDOWN_DAYS);
  return date;
}

/**
 * Everything that gets duplicated into the partner's archive, and — just as
 * importantly — everything that doesn't.
 *
 * Shared content is copied: both people lived it, so both keep it.
 *
 * Solo Vent is the exception, and it *moves* rather than copying. A vent is one
 * person talking about the other, so duplicating it would hand each of them a
 * record of being complained about, and dropping it would take away writing
 * that was only ever theirs. Each conversation follows its author instead —
 * see moveOwnVents.
 *
 * Drafts (unsent), notifications (transient) and invites (meaningless once the
 * space is closed) are dropped for duller reasons.
 */
const COPIED_MODELS = [
  "collections",
  "entries",
  "comments",
  "memories",
  "messages",
  "courtroomCases",
  "reminders",
];

/**
 * Split a cooling-down space into two archives.
 *
 * The original row stays with whoever's clerkUserId is already on it (the
 * partner who created the space). The other partner's identity moves onto a
 * fresh row holding a full copy. Both end up ARCHIVED and read-only.
 *
 * Safe to call twice: the status check inside the transaction means a second
 * caller racing the first one finds the space already archived and no-ops.
 */
export async function forkSpace(spaceId) {
  const space = await db.user.findUnique({
    where: { id: spaceId },
    include: {
      identities: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!space || !isForkDue(space)) {
    return { forked: false, reason: "not-due" };
  }

  const stayingIdentity = space.identities.find(
    (identity) => identity.clerkUserId === space.clerkUserId
  ) || space.identities[0];

  const movingIdentity = space.identities.find(
    (identity) => identity.clerkUserId !== stayingIdentity?.clerkUserId
  );

  // Which author slot the leaving partner occupies. Derived exactly the way
  // getViewerSlot does it — position in the identity list, oldest first — so
  // both agree on who is who. Their vents are filed under this.
  const movingIndex = space.identities.findIndex(
    (identity) => identity.clerkUserId === movingIdentity?.clerkUserId
  );
  const movingSlot = movingIndex % 2 === 0 ? PLAYER_IDS.ONE : PLAYER_IDS.TWO;

  // Solo space — nobody to fork away from. It just closes.
  if (!movingIdentity) {
    await db.user.update({
      where: { id: spaceId },
      data: {
        spaceStatus: SPACE_STATUS.ARCHIVED,
        archivedAt: new Date(),
        closesAt: null,
      },
    });
    if (stayingIdentity) {
      await db.spaceAccess.createMany({
        data: [{ clerkUserId: stayingIdentity.clerkUserId, userId: spaceId }],
        skipDuplicates: true,
      });
    }
    return { forked: true, solo: true };
  }

  const content = await loadSpaceContent(spaceId);
  const archiveEmail = await freeArchiveEmail(space, movingIdentity.clerkUserId);
  const now = new Date();

  await db.$transaction(
    async (tx) => {
      // Re-read inside the transaction: two requests can land at once the moment
      // the cooldown lapses, and only one of them may do this.
      const fresh = await tx.user.findUnique({
        where: { id: spaceId },
        select: { spaceStatus: true, closesAt: true },
      });
      if (!isForkDue(fresh, now)) return;

      const archive = await tx.user.create({
        data: {
          clerkUserId: movingIdentity.clerkUserId,
          email: archiveEmail,
          name: space.name,
          imageUrl: space.imageUrl,
          partnerOneName: space.partnerOneName,
          partnerTwoName: space.partnerTwoName,
          spaceStatus: SPACE_STATUS.ARCHIVED,
          archivedAt: now,
          forkedFromId: space.id,
        },
      });

      await copyContentInto(tx, archive.id, content);

      // Vents follow their author instead of being copied. Repointing the
      // conversation carries its cells with it, so the leaving partner keeps
      // everything they wrote and the space they left keeps none of it — which
      // is the only arrangement where neither of them ends up holding the
      // other's private writing.
      await tx.chatConversation.updateMany({
        where: { userId: space.id, ownerSlot: movingSlot },
        data: { userId: archive.id },
      });

      // The moving partner's login now points at their own archive instead of
      // the shared row. Delete-then-create because clerkUserId is unique.
      await tx.userIdentity.delete({ where: { clerkUserId: movingIdentity.clerkUserId } });
      await tx.userIdentity.create({
        data: { clerkUserId: movingIdentity.clerkUserId, userId: archive.id },
      });

      // Record each partner's standing right to open their own archive. This is
      // what lets them move on later without losing it: starting a new space or
      // joining someone else's only repoints the identity, while these rows keep
      // the archive reachable for as long as it exists.
      await tx.spaceAccess.createMany({
        data: [
          { clerkUserId: movingIdentity.clerkUserId, userId: archive.id },
          { clerkUserId: stayingIdentity.clerkUserId, userId: space.id },
        ],
        skipDuplicates: true,
      });

      await tx.user.update({
        where: { id: spaceId },
        data: {
          spaceStatus: SPACE_STATUS.ARCHIVED,
          archivedAt: now,
          closesAt: null,
        },
      });

      // Nothing should be able to pull either archive back into a live space.
      await tx.spaceInvite.updateMany({
        where: { userId: spaceId, status: "PENDING" },
        data: { status: "REVOKED" },
      });
    },
    { timeout: 120000 }
  );

  return { forked: true, solo: false };
}

/** Pull everything the archive needs, in the order the copy will replay it. */
async function loadSpaceContent(spaceId) {
  const [collections, entries, memories, messages, courtroomCases, reminders] =
    await Promise.all([
      db.collection.findMany({ where: { userId: spaceId } }),
      db.entry.findMany({
        where: { userId: spaceId },
        include: { comments: true },
      }),
      db.memory.findMany({ where: { userId: spaceId } }),
      db.message.findMany({ where: { userId: spaceId } }),
      db.courtroomCase.findMany({ where: { userId: spaceId } }),
      db.reminder.findMany({ where: { userId: spaceId } }),
    ]);

  return { collections, entries, memories, messages, courtroomCases, reminders };
}

async function copyContentInto(tx, archiveId, content) {
  // Ids are generated up front rather than read back from inserts. Doing it the
  // obvious way — create a row, use the id it returns, create its children —
  // costs two queries per entry, so a couple with a thousand entries would run
  // two thousand round trips inside a single transaction, while someone waits
  // on the page that triggered the fork. Knowing the ids in advance turns the
  // whole copy into a handful of bulk inserts instead.
  const newId = () => randomUUID();

  const collectionIdMap = new Map(
    content.collections.map((collection) => [collection.id, newId()])
  );

  if (content.collections.length) {
    await tx.collection.createMany({
      data: content.collections.map((collection) => ({
        id: collectionIdMap.get(collection.id),
        name: collection.name,
        description: collection.description,
        userId: archiveId,
        createdAt: collection.createdAt,
      })),
    });
  }

  const entryIdMap = new Map(content.entries.map((entry) => [entry.id, newId()]));

  if (content.entries.length) {
    await tx.entry.createMany({
      data: content.entries.map((entry) => ({
        id: entryIdMap.get(entry.id),
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        moodScore: entry.moodScore,
        moodImageUrl: entry.moodImageUrl,
        author: entry.author,
        collectionId: entry.collectionId
          ? collectionIdMap.get(entry.collectionId) ?? null
          : null,
        userId: archiveId,
        createdAt: entry.createdAt,
      })),
    });

    const comments = content.entries.flatMap((entry) =>
      (entry.comments || []).map((comment) => ({
        content: comment.content,
        author: comment.author,
        entryId: entryIdMap.get(entry.id),
        userId: archiveId,
        createdAt: comment.createdAt,
      }))
    );

    if (comments.length) {
      await tx.comment.createMany({ data: comments });
    }
  }

  // Memories keep the *same* R2 key on purpose. Both archives reference one
  // stored object rather than paying to duplicate every photo on day one, so
  // deleting a Memory row must never delete the underlying file while another
  // archive still points at it — see releaseMemoryObject().
  if (content.memories.length) {
    await tx.memory.createMany({
      data: content.memories.map((memory) => ({
        url: memory.url,
        key: memory.key,
        caption: memory.caption,
        uploadedBy: memory.uploadedBy,
        userId: archiveId,
        fileSize: memory.fileSize,
        mimeType: memory.mimeType,
        width: memory.width,
        height: memory.height,
        createdAt: memory.createdAt,
      })),
    });
  }

  if (content.messages.length) {
    await tx.message.createMany({
      data: content.messages.map((message) => ({
        content: message.content,
        sender: message.sender,
        userId: archiveId,
        read: message.read,
        replyTo: message.replyTo,
        replyToContent: message.replyToContent,
        replyToSender: message.replyToSender,
        createdAt: message.createdAt,
      })),
    });
  }

  if (content.courtroomCases.length) {
    await tx.courtroomCase.createMany({
      data: content.courtroomCases.map((c) => ({
        title: c.title,
        status: c.status,
        sideAPerspective: c.sideAPerspective,
        sideBPerspective: c.sideBPerspective,
        sideAAuthor: c.sideAAuthor,
        sideBAuthor: c.sideBAuthor,
        judgement: c.judgement,
        contract: c.contract,
        sideASignedAt: c.sideASignedAt,
        sideBSignedAt: c.sideBSignedAt,
        userId: archiveId,
        createdAt: c.createdAt,
      })),
    });
  }

  if (content.reminders.length) {
    await tx.reminder.createMany({
      data: content.reminders.map((reminder) => ({
        userId: archiveId,
        date: reminder.date,
        title: reminder.title,
        note: reminder.note,
        createdAt: reminder.createdAt,
      })),
    });
  }
}

/**
 * User.email is unique, so the archive row needs an address nobody else holds.
 * Their real one is the honest choice — it's how they'd find the archive — but
 * if it's somehow already taken we fall back rather than failing the fork.
 */
async function freeArchiveEmail(space, clerkUserId) {
  const candidates = [];

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const profile = await client.users.getUser(clerkUserId);
    const email = profile?.emailAddresses?.[0]?.emailAddress;
    if (email) candidates.push(email);
  } catch {
    // Clerk unreachable — the fallback below still produces a unique address.
  }

  candidates.push(`${clerkUserId}@riceee.local`);
  candidates.push(`archive-${space.id}-${clerkUserId}@riceee.local`);

  for (const candidate of candidates) {
    const taken = await db.user.findUnique({
      where: { email: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `archive-${Date.now()}-${clerkUserId}@riceee.local`;
}

/**
 * Whether the R2 object behind a memory is still referenced by another space.
 * Forked archives share stored files, so a delete in one archive must leave the
 * other one's photo intact.
 */
export async function releaseMemoryObject(key, exceptMemoryId) {
  const remaining = await db.memory.count({
    where: { key, ...(exceptMemoryId ? { id: { not: exceptMemoryId } } : {}) },
  });
  return remaining === 0;
}
