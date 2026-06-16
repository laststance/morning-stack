import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

export const authProviderAvailability = {
  github:
    Boolean(process.env.AUTH_GITHUB_ID?.trim()) &&
    Boolean(process.env.AUTH_GITHUB_SECRET?.trim()),
  google:
    Boolean(process.env.AUTH_GOOGLE_ID?.trim()) &&
    Boolean(process.env.AUTH_GOOGLE_SECRET?.trim()),
};

export const hasAuthProvider =
  authProviderAvailability.github || authProviderAvailability.google;

const providers = [
  ...(authProviderAvailability.github ? [GitHub] : []),
  ...(authProviderAvailability.google ? [Google] : []),
];

/**
 * Auth.js v5 configuration with Google and GitHub OAuth providers.
 * Uses Drizzle adapter for database session persistence in Supabase PostgreSQL.
 *
 * Environment variables (auto-detected by Auth.js):
 * - AUTH_GITHUB_ID, AUTH_GITHUB_SECRET
 * - AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
 * - AUTH_SECRET (for JWT/session encryption)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    /** Attach user ID to the session for client-side access. */
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
