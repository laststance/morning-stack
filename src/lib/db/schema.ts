import { relations } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  integer,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

// ─── Enums ───────────────────────────────────────────────────────────

/** Morning or evening edition type. */
export const editionTypeEnum = pgEnum("edition_type", [
  "morning",
  "evening",
]);

/** Draft or published edition status. */
export const editionStatusEnum = pgEnum("edition_status", [
  "draft",
  "published",
]);

/** Supported article sources. */
export const articleSourceEnum = pgEnum("article_source", [
  "hackernews",
  "github",
  "reddit",
  "producthunt",
  "tech_rss",
  "hatena",
  "bluesky",
  "youtube",
  "world_news",
]);

/** OAuth provider for user authentication. */
export const authProviderEnum = pgEnum("auth_provider", [
  "google",
  "github",
]);

/** Target type for hidden items. */
export const hiddenTargetTypeEnum = pgEnum("hidden_target_type", [
  "article",
  "source",
  "topic",
]);

// ─── Tables ──────────────────────────────────────────────────────────

/** Registered users authenticated via OAuth (Auth.js compatible). */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
  provider: authProviderEnum("provider"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** OAuth account linkage for Auth.js. */
export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

/** Database sessions for Auth.js. */
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

/** Verification tokens for Auth.js magic link / email provider. */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

/** Morning/evening editions published on a specific date. */
export const editions = pgTable("editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: editionTypeEnum("type").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  status: editionStatusEnum("status").default("draft").notNull(),
});

/** Articles collected from various sources, linked to an edition. */
export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id")
    .references(() => editions.id, { onDelete: "cascade" })
    .notNull(),
  source: articleSourceEnum("source").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  excerpt: text("excerpt"),
  score: integer("score").default(0),
  externalId: text("external_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** User bookmarks with unique constraint on (userId, articleId). */
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    articleId: uuid("article_id")
      .references(() => articles.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_article_idx").on(
      table.userId,
      table.articleId,
    ),
  ],
);

/** Items hidden by users — articles, sources, or topics. */
export const hiddenItems = pgTable("hidden_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  targetType: hiddenTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Cached weather data per location. */
export const weatherCache = pgTable("weather_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  location: text("location").notNull(),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Cached stock market data per symbol. */
export const stockCache = pgTable("stock_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  symbol: text("symbol").notNull(),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  bookmarks: many(bookmarks),
  hiddenItems: many(hiddenItems),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const editionsRelations = relations(editions, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  edition: one(editions, {
    fields: [articles.editionId],
    references: [editions.id],
  }),
  bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  article: one(articles, {
    fields: [bookmarks.articleId],
    references: [articles.id],
  }),
}));

export const hiddenItemsRelations = relations(hiddenItems, ({ one }) => ({
  user: one(users, {
    fields: [hiddenItems.userId],
    references: [users.id],
  }),
}));
