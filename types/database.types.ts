// Hand-written starter types matching commons_schema.sql.
// Once the schema is stable, replace this file by running:
//   npx supabase gen types typescript --project-id <ref> --schema public > types/database.types.ts
// That command produces exhaustive, always-accurate types — treat this
// file as a placeholder so the app compiles before that's wired up.

export type MemberRole = "member" | "moderator" | "admin";
export type MemberStatus = "pending" | "active" | "suspended" | "removed";
export type ItemStatus = "available" | "requested" | "checked_out" | "unavailable";
export type LoanStatus =
  | "requested"
  | "approved"
  | "denied"
  | "checked_out"
  | "returned"
  | "overdue"
  | "cancelled";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTarget = "item" | "comment" | "user";

export interface Database {
  public: {
    Tables: {
      neighborhoods: {
        Row: {
          id: string;
          name: string;
          slug: string;
          city: string | null;
          state: string | null;
          zip: string | null;
          accent_color: string | null;
          banner_image_url: string | null;
          invite_code: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["neighborhoods"]["Row"]> & {
          name: string;
          slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["neighborhoods"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          profile_image_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      neighborhood_members: {
        Row: {
          id: string;
          neighborhood_id: string;
          user_id: string;
          role: MemberRole;
          status: MemberStatus;
          address_line1: string | null;
          address_line2: string | null;
          show_exact_address: boolean;
          joined_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["neighborhood_members"]["Row"]> & {
          neighborhood_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["neighborhood_members"]["Row"]>;
      };
      categories: {
        Row: { id: string; name: string; icon: string | null };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      items: {
        Row: {
          id: string;
          neighborhood_id: string;
          owner_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          image_url: string | null;
          status: ItemStatus;
          is_active: boolean;
          content_flag: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["items"]["Row"]> & {
          neighborhood_id: string;
          owner_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Row"]>;
      };
      loans: {
        Row: {
          id: string;
          item_id: string;
          neighborhood_id: string;
          borrower_id: string;
          owner_id: string;
          status: LoanStatus;
          borrower_message: string | null;
          owner_response_message: string | null;
          requested_at: string;
          approved_at: string | null;
          checked_out_at: string | null;
          due_date: string | null;
          returned_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["loans"]["Row"]> & {
          item_id: string;
          borrower_id: string;
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["loans"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          item_id: string;
          neighborhood_id: string;
          user_id: string;
          comment: string;
          content_flag: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]> & {
          item_id: string;
          user_id: string;
          comment: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
      };
      favorites: {
        Row: { user_id: string; item_id: string; created_at: string };
        Insert: { user_id: string; item_id: string };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          neighborhood_id: string;
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: string;
          status: ReportStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reports"]["Row"]> & {
          neighborhood_id: string;
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          device_type: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]> & {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Row"]>;
      };
    };
  };
}
