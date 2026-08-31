import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type WiithubStoredFile = {
  path: string;
  contentBase64: string;
  contentType: string;
  size: number;
};

export const wiithubSitesTable = pgTable("wiithub_sites", {
  id: text("id").primaryKey(),
  files: jsonb("files").$type<WiithubStoredFile[]>().notNull(),
  fileCount: integer("file_count").notNull(),
  totalBytes: integer("total_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const wiithubPublishEventsTable = pgTable(
  "wiithub_publish_events",
  {
    id: serial("id").primaryKey(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wiithub_publish_events_ip_created_idx").on(
      table.ipHash,
      table.createdAt,
    ),
  ],
);

export type WiithubSiteRow = typeof wiithubSitesTable.$inferSelect;