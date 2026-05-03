// Stub types. Run `npm run db:types` after linking a Supabase project to
// regenerate this file. The runtime works without it, but you lose end-to-end
// type safety on table names and columns.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Timestamp = string;
type UUID = string;

type Mood = "loved" | "liked" | "neutral" | "disliked" | "refused";
type Method = "spoon" | "self_feed" | "bottle" | "breast";
type Storage = "fridge" | "freezer" | "pantry";
type Unit = "cube" | "jar" | "pouch" | "g" | "ml" | "serving";
type Texture = "puree" | "mash" | "soft" | "finger";
type PlanStatus = "planned" | "in_progress" | "done" | "skipped";
type Reason = "prep" | "feeding" | "waste" | "correction" | "restock";
type SleepKind = "night" | "nap";
type DiaperKind = "wet" | "dirty" | "both" | "dry";
type ActivityKind =
  | "feeding_logged"
  | "feeding_edited"
  | "feeding_deleted"
  | "inventory_added"
  | "inventory_adjusted"
  | "inventory_archived"
  | "prep_planned"
  | "prep_completed"
  | "recipe_added"
  | "recipe_edited"
  | "baby_added"
  | "member_joined";

interface Table<Row, Insert = Partial<Row>, Update = Partial<Row>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: UUID;
        display_name: string | null;
        avatar_url: string | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      households: Table<{
        id: UUID;
        name: string;
        created_by: UUID | null;
        default_freezer_expiry_days: number;
        default_fridge_expiry_days: number;
        default_pantry_expiry_days: number;
        theme_color: string | null;
        accent_emoji: string | null;
        activity_retention_days: number | null;
        shared_foods_opt_in: boolean;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      household_members: Table<{
        household_id: UUID;
        user_id: UUID;
        role: "owner" | "member";
        joined_at: Timestamp;
      }>;
      household_member_prefs: Table<{
        household_id: UUID;
        user_id: UUID;
        active_baby_id: UUID | null;
        notify_on_partner_log: boolean;
        notify_on_low_stock: boolean;
        notify_feed_reminder_hours: number | null;
        notify_weekly_digest: boolean;
        digest_send_dow: number | null;
        digest_send_hour: number | null;
      }>;
      household_invites: Table<{
        id: UUID;
        household_id: UUID;
        code: string;
        created_by: UUID | null;
        expires_at: Timestamp;
        max_uses: number | null;
        use_count: number;
        revoked_at: Timestamp | null;
        created_at: Timestamp;
      }>;
      babies: Table<{
        id: UUID;
        household_id: UUID;
        name: string;
        birth_date: string;
        notes: string | null;
        known_allergens: string[];
        photo_path: string | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      foods: Table<{
        id: UUID;
        household_id: UUID;
        name: string;
        category: string | null;
        min_age_months: number | null;
        allergens: string[];
        texture: Texture | null;
        notes: string | null;
        photo_path: string | null;
        archived_at: Timestamp | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      inventory_items: Table<{
        id: UUID;
        household_id: UUID;
        food_id: UUID | null;
        name: string | null;
        storage: Storage;
        unit: Unit;
        quantity: number;
        initial_quantity: number;
        prep_date: string | null;
        expiry_date: string | null;
        batch_id: UUID | null;
        notes: string | null;
        low_stock_threshold: number | null;
        photo_path: string | null;
        archived_at: Timestamp | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      inventory_movements: Table<{
        id: UUID;
        household_id: UUID;
        inventory_item_id: UUID;
        delta: number;
        reason: Reason;
        feeding_id: UUID | null;
        prep_plan_id: UUID | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      prep_plans: Table<{
        id: UUID;
        household_id: UUID;
        scheduled_for: string;
        status: PlanStatus;
        notes: string | null;
        completed_at: Timestamp | null;
        created_by: UUID | null;
        recipe_id: UUID | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      prep_plan_items: Table<{
        id: UUID;
        prep_plan_id: UUID;
        food_id: UUID | null;
        planned_quantity: number;
        unit: Unit;
        actual_quantity: number | null;
        produced_inventory_item_id: UUID | null;
        created_at: Timestamp;
      }>;
      feedings: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        fed_at: Timestamp;
        fed_by: UUID | null;
        method: Method | null;
        mood: Mood | null;
        amount_consumed: number | null;
        notes: string | null;
        photo_path: string | null;
        archived_at: Timestamp | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      feeding_items: Table<{
        id: UUID;
        feeding_id: UUID;
        food_id: UUID | null;
        inventory_item_id: UUID | null;
        quantity: number | null;
        notes: string | null;
        is_first_try: boolean;
        created_at: Timestamp;
      }>;
      recipes: Table<{
        id: UUID;
        household_id: UUID;
        name: string;
        description: string | null;
        min_age_months: number | null;
        yield_quantity: number | null;
        yield_unit: Unit | null;
        prep_minutes: number | null;
        storage_default: Storage | null;
        default_expiry_days: number | null;
        steps: string | null;
        source_url: string | null;
        photo_path: string | null;
        archived_at: Timestamp | null;
        created_by: UUID | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      recipe_ingredients: Table<{
        id: UUID;
        recipe_id: UUID;
        ingredient: string;
        quantity: string | null;
        position: number;
      }>;
      shopping_list_items: Table<{
        id: UUID;
        household_id: UUID;
        text: string;
        quantity: string | null;
        completed_at: Timestamp | null;
        source_recipe_id: UUID | null;
        source_prep_plan_id: UUID | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      push_subscriptions: Table<{
        id: UUID;
        user_id: UUID;
        endpoint: string;
        p256dh: string;
        auth: string;
        user_agent: string | null;
        created_at: Timestamp;
        last_used_at: Timestamp | null;
      }>;
      activity_log: Table<{
        id: UUID;
        household_id: UUID;
        actor_id: UUID | null;
        kind: ActivityKind;
        ref_id: UUID | null;
        summary: string | null;
        created_at: Timestamp;
      }>;
      growth_measurements: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        measured_on: string;
        weight_kg: number | null;
        length_cm: number | null;
        head_cm: number | null;
        notes: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      sleep_logs: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        started_at: Timestamp;
        ended_at: Timestamp | null;
        kind: SleepKind;
        notes: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      diaper_logs: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        changed_at: Timestamp;
        kind: DiaperKind;
        notes: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      milestones: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID | null;
        kind: string;
        achieved_at: Timestamp;
        detail: string | null;
        created_at: Timestamp;
      }>;
      shared_foods: Table<{
        id: UUID;
        name: string;
        category: string | null;
        min_age_months: number | null;
        allergens: string[];
        texture: Texture | null;
        intro_count: number;
        loved_share: number | null;
        source_household_id: UUID | null;
        contributed_at: Timestamp;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      redeem_invite: { Args: { p_code: string }; Returns: UUID };
      log_activity: {
        Args: {
          p_household_id: UUID;
          p_kind: ActivityKind;
          p_ref_id: UUID | null;
          p_summary: string | null;
        };
        Returns: UUID;
      };
      contribute_shared_food: {
        Args: {
          p_name: string;
          p_category: string | null;
          p_min_age_months: number | null;
          p_allergens: string[];
          p_texture: string | null;
        };
        Returns: UUID;
      };
      prune_activity_log: { Args: { p_household_id: UUID }; Returns: number };
      delete_account: { Args: Record<string, never>; Returns: void };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
