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
        theme_mode: "light" | "dark" | "system" | null;
        units_preference: "metric" | "imperial" | null;
        storage_capacity_freezer: number | null;
        storage_capacity_fridge: number | null;
        storage_capacity_pantry: number | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      household_members: Table<{
        household_id: UUID;
        user_id: UUID;
        role: "owner" | "member" | "caregiver";
        joined_at: Timestamp;
      }>;
      household_member_prefs: Table<{
        household_id: UUID;
        user_id: UUID;
        active_baby_id: UUID | null;
        active_household_id: UUID | null;
        notify_on_partner_log: boolean;
        notify_on_low_stock: boolean;
        notify_feed_reminder_hours: number | null;
        notify_weekly_digest: boolean;
        digest_send_dow: number | null;
        digest_send_hour: number | null;
        vitamin_reminder_hours: number | null;
        iron_reminder_hours: number | null;
        voice_log_enabled: boolean;
        quiet_hours_start: number | null;
        quiet_hours_end: number | null;
      }>;
      household_invites: Table<{
        id: UUID;
        household_id: UUID;
        code: string;
        role: "member" | "caregiver";
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
        theme_color: string | null;
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
        sub_location: string | null;
        cost_cents: number | null;
        reserved_at: Timestamp | null;
        reserved_for: string | null;
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
        recurrence: "weekly" | "biweekly" | null;
        recurrence_until: string | null;
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
        aisle: string | null;
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
      supplement_logs: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        kind: "vitamin_d" | "iron" | "other";
        given_at: Timestamp;
        dose: string | null;
        notes: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      feeding_sessions: Table<{
        feeding_id: UUID;
        bottle_ml: number | null;
        breast_side: "left" | "right" | "both" | null;
        duration_minutes: number | null;
      }>;
      readiness_evaluations: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        evaluated_on: string;
        sits_unsupported: boolean | null;
        has_head_control: boolean | null;
        lost_tongue_thrust: boolean | null;
        shows_interest: boolean | null;
        can_grasp: boolean | null;
        ready: boolean | null;
        notes: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      memories: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID | null;
        photo_path: string | null;
        caption: string | null;
        occurred_on: string;
        milestone_kind: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      recipe_collections: Table<{
        id: UUID;
        household_id: UUID;
        name: string;
        description: string | null;
        is_public_template: boolean;
        created_by: UUID | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      recipe_collection_items: Table<{
        collection_id: UUID;
        recipe_id: UUID;
        position: number;
        added_at: Timestamp;
      }>;
      share_links: Table<{
        id: UUID;
        household_id: UUID;
        token: string;
        scope: "feed" | "growth" | "memories" | "all";
        expires_at: Timestamp;
        revoked_at: Timestamp | null;
        created_by: UUID | null;
        created_at: Timestamp;
        last_viewed_at: Timestamp | null;
        view_count: number;
      }>;
      totp_secrets: Table<{
        user_id: UUID;
        secret_encrypted: string;
        confirmed_at: Timestamp | null;
        recovery_codes: string[] | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      error_logs: Table<{
        id: UUID;
        user_id: UUID | null;
        household_id: UUID | null;
        surface: "client" | "server" | "edge";
        message: string;
        digest: string | null;
        stack: string | null;
        url: string | null;
        user_agent: string | null;
        created_at: Timestamp;
      }>;
      tags: Table<{
        id: UUID;
        household_id: UUID;
        entity_type: "food" | "recipe" | "memory" | "feeding" | "inventory_item";
        entity_id: UUID;
        label: string;
        created_at: Timestamp;
      }>;
      feeding_comments: Table<{
        id: UUID;
        feeding_id: UUID;
        author_id: UUID | null;
        body: string;
        created_at: Timestamp;
      }>;
      voice_notes: Table<{
        id: UUID;
        household_id: UUID;
        feeding_id: UUID | null;
        memory_id: UUID | null;
        storage_path: string;
        duration_seconds: number | null;
        mime_type: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      feeding_edits: Table<{
        id: UUID;
        feeding_id: UUID;
        household_id: UUID;
        editor_id: UUID | null;
        field: string;
        old_value: string | null;
        new_value: string | null;
        created_at: Timestamp;
      }>;
      sticky_notes: Table<{
        id: UUID;
        household_id: UUID;
        body: string;
        color: string | null;
        pinned: boolean;
        created_by: UUID | null;
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      meal_plans: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID;
        planned_for: string;
        meal_slot:
          | "breakfast"
          | "morning_snack"
          | "lunch"
          | "afternoon_snack"
          | "dinner"
          | "bedtime_bottle"
          | "other";
        inventory_item_id: UUID | null;
        recipe_id: UUID | null;
        custom_label: string | null;
        done: boolean;
        notes: string | null;
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      recipe_costs: Table<{
        id: UUID;
        recipe_id: UUID;
        ingredient: string;
        cost_cents: number;
        notes: string | null;
        created_at: Timestamp;
      }>;
      feeding_ratings: Table<{
        feeding_id: UUID;
        rater_id: UUID;
        stars: number;
        created_at: Timestamp;
      }>;
      recipe_ratings: Table<{
        recipe_id: UUID;
        rater_id: UUID;
        stars: number;
        notes: string | null;
        created_at: Timestamp;
      }>;
      recipe_substitutions: Table<{
        id: UUID;
        recipe_id: UUID;
        ingredient: string;
        substitution: string;
        created_at: Timestamp;
      }>;
      recipe_steps: Table<{
        id: UUID;
        recipe_id: UUID;
        position: number;
        body: string;
        photo_path: string | null;
        created_at: Timestamp;
      }>;
      caregiver_shifts: Table<{
        id: UUID;
        household_id: UUID;
        user_id: UUID;
        starts_at: Timestamp;
        ends_at: Timestamp | null;
        notes: string | null;
        created_at: Timestamp;
      }>;
      activity_reactions: Table<{
        id: UUID;
        activity_id: UUID;
        user_id: UUID;
        emoji: string;
        created_at: Timestamp;
      }>;
      goals: Table<{
        id: UUID;
        household_id: UUID;
        baby_id: UUID | null;
        metric: "unique_foods" | "feedings" | "variety_score" | "self_feed_meals";
        target: number;
        period: "week" | "month";
        created_by: UUID | null;
        created_at: Timestamp;
      }>;
      saved_filters: Table<{
        id: UUID;
        user_id: UUID;
        household_id: UUID;
        page: "inventory" | "feedings" | "search";
        name: string;
        query: string;
        created_at: Timestamp;
      }>;
      inventory_snapshots: Table<{
        id: UUID;
        household_id: UUID;
        taken_on: string;
        total_items: number;
        total_units: number;
        total_value_cents: number | null;
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
      report_error: {
        Args: {
          p_surface: "client" | "server" | "edge";
          p_message: string;
          p_digest: string | null;
          p_stack: string | null;
          p_url: string | null;
          p_user_agent: string | null;
          p_household_id: UUID | null;
        };
        Returns: UUID;
      };
      fetch_share_link: {
        Args: { p_token: string };
        Returns: {
          household_id: UUID;
          scope: "feed" | "growth" | "memories" | "all";
          expires_at: Timestamp;
          revoked: boolean;
        }[];
      };
      search_household: {
        Args: { p_household_id: UUID; p_query: string };
        Returns: {
          kind: string;
          id: UUID;
          label: string;
          sublabel: string;
          score: number;
        }[];
      };
      snapshot_inventory: { Args: { p_household_id: UUID }; Returns: void };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
