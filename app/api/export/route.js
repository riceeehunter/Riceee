import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ajExport } from "@/lib/arcjet";
import { r2Client } from "@/lib/r2";
import { createZipStream, textFile } from "@/lib/zip";
import { resolveAuthorName } from "@/lib/constants/players";
import { getViewerSlot } from "@/lib/space-identity";

export const dynamic = "force-dynamic";

/**
 * Download everything in this space, as a ZIP.
 *
 * Deliberately available in every state — not just while a space is closing.
 * Tying export to "I've announced I'm leaving" would mean the only way to get
 * your own history out is to tell the other person first, which is exactly
 * backwards for anyone who needs to leave quietly. So: always on, no cooldown,
 * no permission from the other partner, no one-time window.
 */
export async function GET(req) {
  let space;
  try {
    space = await getCurrentUser();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limited because each call streams every photo back out of R2. The
  // limit is deliberately loose — refusing someone their own data would defeat
  // the point of the endpoint — it only exists to stop a loop billing egress.
  const decision = await ajExport.protect(req, { userId: space.id, requested: 1 });
  if (decision.isDenied()) {
    return new Response(
      "You've downloaded your data a few times just now. Try again in a little while — nothing has been lost.",
      { status: 429 }
    );
  }

  // Scoped to the viewer, never the space: before a fork both partners' vents
  // live on the same row, so an unfiltered export would hand one of them the
  // other's private writing — the exact thing the ownerSlot column prevents in
  // the app. A viewer we can't place gets none rather than all.
  const slot = await getViewerSlot(space.id);
  const vents = slot
    ? await db.chatConversation.findMany({
        where: { userId: space.id, ownerSlot: slot },
        include: { cells: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const [entries, memories, messages, cases, collections] = await Promise.all([
    db.entry.findMany({
      where: { userId: space.id },
      include: { comments: { orderBy: { createdAt: "asc" } }, collection: true },
      orderBy: { createdAt: "asc" },
    }),
    db.memory.findMany({ where: { userId: space.id }, orderBy: { createdAt: "asc" } }),
    db.message.findMany({ where: { userId: space.id }, orderBy: { createdAt: "asc" } }),
    db.courtroomCase.findMany({ where: { userId: space.id }, orderBy: { createdAt: "asc" } }),
    db.collection.findMany({ where: { userId: space.id } }),
  ]);

  const names = {
    partnerOneName: space.partnerOneName,
    partnerTwoName: space.partnerTwoName,
  };

  const stamp = new Date().toISOString().split("T")[0];
  const stream = createZipStream(
    buildFiles({ space, names, entries, memories, messages, cases, collections, vents })
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="riceee-export-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Yielded lazily so photos are pulled from R2 one at a time as the zip writer
 * asks for them, instead of loading an entire library into memory first.
 */
async function* buildFiles({ space, names, entries, memories, messages, cases, collections, vents }) {
  const author = (value) => resolveAuthorName(value, names);

  yield textFile(
    "README.txt",
    [
      "Your Riceee export",
      "",
      `Space: ${author("both")}`,
      `Exported: ${new Date().toISOString()}`,
      "",
      "  journal.html    Everything you wrote, readable in any browser",
      "  journal.json    The same entries as structured data",
      "  messages.json   Your message history",
      "  courtroom.json  Cases, verdicts and signed agreements",
      "  solo-vent.json  Your private conversations with Riceee",
      "  photos/         Every photo, with captions in photos/index.json",
      "",
      "This is yours to keep. Open journal.html in any browser to read it.",
      "",
      "Solo Vent is private to you: this file contains only your own",
      "conversations, never your partner's.",
    ].join("\n")
  );

  yield textFile("journal.html", renderJournalHtml({ entries, author, names }));

  yield textFile(
    "journal.json",
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        partners: names,
        collections: collections.map((c) => ({ name: c.name, description: c.description })),
        entries: entries.map((entry) => ({
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          moodScore: entry.moodScore,
          author: author(entry.author),
          authorSlot: entry.author,
          collection: entry.collection?.name || null,
          createdAt: entry.createdAt,
          comments: entry.comments.map((comment) => ({
            content: comment.content,
            author: author(comment.author),
            createdAt: comment.createdAt,
          })),
        })),
      },
      null,
      2
    )
  );

  yield textFile(
    "messages.json",
    JSON.stringify(
      messages.map((message) => ({
        content: message.content,
        sender: author(message.sender),
        replyTo: message.replyToContent || null,
        createdAt: message.createdAt,
      })),
      null,
      2
    )
  );

  yield textFile(
    "courtroom.json",
    JSON.stringify(
      cases.map((c) => ({
        title: c.title,
        status: c.status,
        sideA: { author: author(c.sideAAuthor), perspective: c.sideAPerspective },
        sideB: { author: author(c.sideBAuthor), perspective: c.sideBPerspective },
        judgement: safeParse(c.judgement),
        contract: c.contract,
        signedBySideA: c.sideASignedAt,
        signedBySideB: c.sideBSignedAt,
        createdAt: c.createdAt,
      })),
      null,
      2
    )
  );

  yield textFile(
    "solo-vent.json",
    JSON.stringify(
      vents.map((conversation) => ({
        title: conversation.title,
        createdAt: conversation.createdAt,
        messages: conversation.cells.map((cell) => ({
          you: cell.content,
          riceee: cell.response,
          at: cell.createdAt,
        })),
      })),
      null,
      2
    )
  );

  const index = [];
  for (const memory of memories) {
    const filename = `photos/${photoName(memory)}`;
    index.push({
      file: filename,
      caption: memory.caption || null,
      uploadedBy: author(memory.uploadedBy),
      createdAt: memory.createdAt,
    });

    const data = await fetchObject(memory.key);
    // A photo missing from storage shouldn't abort an export that's already
    // half written — it's listed in the index either way.
    if (data) {
      yield { name: filename, data, date: new Date(memory.createdAt) };
    }
  }

  yield textFile("photos/index.json", JSON.stringify(index, null, 2));
}

async function fetchObject(key) {
  try {
    const response = await r2Client.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key })
    );
    const bytes = await response.Body.transformToByteArray();
    return new Uint8Array(bytes);
  } catch (error) {
    console.warn("Export skipped a photo:", key, error.message);
    return null;
  }
}

function photoName(memory) {
  const base = memory.key.split("/").pop() || `${memory.id}`;
  return base.includes(".") ? base : `${base}.jpg`;
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * A self-contained page so the export is readable by a person, not just a
 * parser. Entry content is already sanitised HTML from the editor; everything
 * else is escaped.
 */
function renderJournalHtml({ entries, author, names }) {
  const title = `${names.partnerOneName || "Partner 1"} & ${names.partnerTwoName || "Partner 2"}`;

  const body = entries
    .map((entry) => {
      const comments = entry.comments
        .map(
          (comment) =>
            `<div class="comment"><b>${escapeHtml(author(comment.author))}</b> ${escapeHtml(comment.content)}</div>`
        )
        .join("");

      return `<article>
  <h2>${escapeHtml(entry.title)}</h2>
  <p class="meta">${escapeHtml(author(entry.author))} · ${new Date(entry.createdAt).toDateString()} · ${escapeHtml(entry.mood)}</p>
  <div class="content">${entry.content || ""}</div>
  ${comments ? `<div class="comments">${comments}</div>` : ""}
</article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — Riceee Journal</title>
<style>
  body { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 6rem;
         font: 16px/1.7 ui-serif, Georgia, serif; color: #3b2f2f; background: #fffaf6; }
  h1 { font-size: 1.9rem; margin-bottom: .25rem; }
  .sub { color: #9a8078; margin-top: 0; }
  article { border-top: 1px solid #f0e0d8; padding-top: 1.5rem; margin-top: 2rem; }
  h2 { font-size: 1.3rem; margin-bottom: .2rem; }
  .meta { color: #a08a82; font-size: .82rem; margin-top: 0; }
  .content img { max-width: 100%; height: auto; border-radius: .5rem; }
  .comments { margin-top: 1rem; padding-left: .9rem; border-left: 3px solid #ffd9c4; }
  .comment { font-size: .9rem; color: #6b5a54; margin: .4rem 0; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="sub">${entries.length} entries · exported ${new Date().toDateString()}</p>
${body}
</body>
</html>`;
}
