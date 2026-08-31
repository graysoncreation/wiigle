import { Router, type IRouter, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import {
  GetWiithubSiteParams,
  GetWiithubSiteResponse,
  PublishWiithubSiteBody,
  PublishWiithubSiteResponse,
} from "@workspace/api-zod";
import {
  db,
  wiithubPublishEventsTable,
  wiithubSitesTable,
  type WiithubStoredFile,
} from "@workspace/db";

const router: IRouter = Router();

const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const MAX_PUBLISHES_PER_HOUR = 5;
const allowedTypes: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
};

function isSafePath(path: string): boolean {
  return (
    path.length <= 180 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes("..") &&
    /^[a-zA-Z0-9._/-]+$/.test(path) &&
    !path.split("/").includes("")
  );
}

function contentTypeFor(path: string): string | null {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return allowedTypes[extension] ?? null;
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

class PublishLimitError extends Error {
  constructor() {
    super("Publishing limit reached");
    this.name = "PublishLimitError";
  }
}

function toResponse(site: typeof wiithubSitesTable.$inferSelect) {
  return {
    id: site.id,
    fileCount: site.fileCount,
    totalBytes: site.totalBytes,
    createdAt: site.createdAt.toISOString(),
    runUrl: `/api/wiithub/run/${site.id}/`,
  };
}

router.get("/wiithub/sites/:id", async (req, res): Promise<void> => {
  const params = GetWiithubSiteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Enter a valid site ID." });
    return;
  }

  const [site] = await db
    .select()
    .from(wiithubSitesTable)
    .where(eq(wiithubSitesTable.id, params.data.id));

  if (!site) {
    res.status(404).json({ error: "That site ID does not exist." });
    return;
  }

  res.json(GetWiithubSiteResponse.parse(toResponse(site)));
});

router.post("/wiithub/sites", async (req, res): Promise<void> => {
  const parsed = PublishWiithubSiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "The ID or uploaded files are invalid." });
    return;
  }

  const seen = new Set<string>();
  let totalBytes = 0;
  const files: WiithubStoredFile[] = [];

  for (const file of parsed.data.files) {
    const normalizedPath = file.path.replace(/^\.\/+/, "");
    const expectedType = contentTypeFor(normalizedPath);
    if (!isSafePath(normalizedPath) || !expectedType || seen.has(normalizedPath)) {
      res.status(400).json({ error: `Unsupported or unsafe file: ${file.path}` });
      return;
    }

    let decoded: Buffer;
    try {
      decoded = Buffer.from(file.contentBase64, "base64");
    } catch {
      res.status(400).json({ error: `Invalid file data: ${file.path}` });
      return;
    }

    if (
      decoded.length !== file.size ||
      !Number.isInteger(file.size) ||
      file.size > 524288
    ) {
      res.status(400).json({ error: `Invalid file size: ${file.path}` });
      return;
    }

    totalBytes += decoded.length;
    seen.add(normalizedPath);
    files.push({
      path: normalizedPath,
      contentBase64: decoded.toString("base64"),
      contentType: expectedType,
      size: decoded.length,
    });
  }

  if (!seen.has("index.html")) {
    res.status(400).json({ error: "Your site must include index.html." });
    return;
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    res.status(400).json({ error: "The site is larger than 2 MB." });
    return;
  }

  try {
    const ipHash = hashIp(req.ip || req.socket.remoteAddress || "unknown");
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);

    const site = await db.transaction(async (tx) => {
      // Serialize quota checks for this address so concurrent requests cannot
      // all pass the count before recording their events.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${ipHash}))`,
      );

      const [usage] = await tx
        .select({ value: count() })
        .from(wiithubPublishEventsTable)
        .where(
          and(
            eq(wiithubPublishEventsTable.ipHash, ipHash),
            gte(wiithubPublishEventsTable.createdAt, cutoff),
          ),
        );

      if (Number(usage.value) >= MAX_PUBLISHES_PER_HOUR) {
        throw new PublishLimitError();
      }

      const [createdSite] = await tx
        .insert(wiithubSitesTable)
        .values({
          id: parsed.data.id,
          files,
          fileCount: files.length,
          totalBytes,
        })
        .returning();

      await tx.insert(wiithubPublishEventsTable).values({ ipHash });
      return createdSite;
    });

    res.status(201).json(PublishWiithubSiteResponse.parse(toResponse(site)));
  } catch (error) {
    if (error instanceof PublishLimitError) {
      res
        .status(429)
        .json({ error: "Publishing limit reached. Try again later." });
      return;
    }
    const databaseError = error as {
      code?: string;
      cause?: { code?: string };
    };
    const databaseCode = databaseError.code ?? databaseError.cause?.code;
    if (databaseCode === "23505") {
      res.status(409).json({ error: "That site ID is already taken." });
      return;
    }
    req.log.error(
      { databaseCode: databaseCode ?? "unknown" },
      "Failed to publish Wiithub site",
    );
    res.status(500).json({ error: "The site could not be published." });
  }
});

router.get("/wiithub/open", async (req, res): Promise<void> => {
  const id = String(req.query.id ?? "").toLowerCase();
  const params = GetWiithubSiteParams.safeParse({ id });
  if (!params.success) {
    res.status(400).type("html").send(legacyErrorPage("Enter a valid site ID."));
    return;
  }
  res.redirect(302, `/api/wiithub/run/${params.data.id}/`);
});

async function servePublishedFile(
  req: Request,
  res: Response,
): Promise<void> {
  const params = GetWiithubSiteParams.safeParse({ id: req.params.id });
  if (!params.success) {
    res.status(400).type("html").send(legacyErrorPage("Invalid site ID."));
    return;
  }

  const [site] = await db
    .select()
    .from(wiithubSitesTable)
    .where(eq(wiithubSitesTable.id, params.data.id));
  if (!site) {
    res.status(404).type("html").send(legacyErrorPage("Site ID not found."));
    return;
  }

  const pathValue = Array.isArray(req.params.path)
    ? req.params.path.join("/")
    : String(req.params.path ?? "index.html");
  const requestedPath = pathValue || "index.html";
  const file = site.files.find((item) => item.path === requestedPath);
  if (!file) {
    res.status(404).type("html").send(legacyErrorPage("File not found."));
    return;
  }

  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'");
  res.send(Buffer.from(file.contentBase64, "base64"));
}

router.get("/wiithub/run/:id/*path", servePublishedFile);
router.get("/wiithub/run/:id/", servePublishedFile);

function legacyErrorPage(message: string): string {
  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"><html><head><title>Wiithub</title></head><body style="font-family:Arial,sans-serif"><h1>Wiithub</h1><p>${message}</p><p><a href="/wiithub/">Return to Wiithub</a></p></body></html>`;
}

export default router;