// Stub types. Run `npm run db:types` after linking a Supabase project to
// regenerate this file from your live schema. The runtime works without it,
// but you lose end-to-end type safety on table names and columns.

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
        created_at: Timestamp;
        updated_at: Timestamp;
      }>;
      household_members: Table<{
        household_id: UUID;
        user_id: UUID;
        role: "owner" | "member";
        joined_at: Timestamp;
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
        created_at: Timestamp;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      redeem_invite: {
        Args: { p_code: string };
        Returns: UUID;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
