import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Brand,
  BrandMonthTarget,
  ContentType,
  Festival,
  Post,
  PostStatus,
} from "@/lib/types";

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type BrandInsert = Partial<Omit<Brand, "id" | "created_at">> & { name: string };
type TargetInsert = Omit<BrandMonthTarget, "id">;
type FestivalInsert = Partial<Omit<Festival, "id" | "created_at">> & { name: string };
type PostInsert = Partial<Omit<Post, "id" | "created_at" | "updated_at">> & {
  brand_id: string;
  title: string;
};

export type Database = {
  public: {
    Tables: {
      brands: Table<Brand, BrandInsert>;
      brand_month_targets: Table<BrandMonthTarget, TargetInsert>;
      festivals: Table<Festival, FestivalInsert>;
      posts: Table<Post, PostInsert>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: { content_type: ContentType; post_status: PostStatus };
    CompositeTypes: Record<never, never>;
  };
};

export function isDbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient<Database> | undefined;

/** The one Supabase client. Server only: it uses the secret key. */
export function db(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

type PgError = { message: string; code?: string };

/** Turns a Supabase error into a readable Error and throws it. */
export function fail(context: string, error: PgError): never {
  if (error.code === "23505") {
    throw new Error("That name is already taken.");
  }
  if (error.code === "23503") {
    throw new Error("This is still used by other entries.");
  }
  if (error.code === "42P01" || error.code === "PGRST205") {
    throw new Error(
      "The database tables are missing. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor.",
    );
  }
  throw new Error(`${context}: ${error.message}`);
}
