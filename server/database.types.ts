export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
                };
                Returns: Json;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    public: {
        Tables: {
            entitlements: {
                Row: {
                    created_at: string;
                    daily_lessons_limit: number;
                    daily_messages_limit: number;
                    id: string;
                    plan: string;
                    updated_at: string;
                    user_id: string;
                };
                ComputedFields: never;
                Insert: {
                    created_at?: string;
                    daily_lessons_limit?: number;
                    daily_messages_limit?: number;
                    id?: string;
                    plan?: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    daily_lessons_limit?: number;
                    daily_messages_limit?: number;
                    id?: string;
                    plan?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            lessons: {
                Row: {
                    daily_minutes: number;
                    id: string;
                    plan: Json | null;
                    session_id: string;
                    started_at: string;
                    status: string;
                    updated_at: string;
                };
                ComputedFields: never;
                Insert: {
                    daily_minutes: number;
                    id?: string;
                    plan?: Json | null;
                    session_id: string;
                    started_at?: string;
                    status?: string;
                    updated_at?: string;
                };
                Update: {
                    daily_minutes?: number;
                    id?: string;
                    plan?: Json | null;
                    session_id?: string;
                    started_at?: string;
                    status?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "lessons_session_id_fkey";
                        columns: ["session_id"];
                        isOneToOne: false;
                        referencedRelation: "sessions";
                        referencedColumns: ["id"];
                    },
                ];
            };
            messages: {
                Row: {
                    content: string;
                    created_at: string;
                    id: string;
                    lesson_id: string;
                    role: string;
                };
                ComputedFields: never;
                Insert: {
                    content: string;
                    created_at?: string;
                    id?: string;
                    lesson_id: string;
                    role: string;
                };
                Update: {
                    content?: string;
                    created_at?: string;
                    id?: string;
                    lesson_id?: string;
                    role?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "messages_lesson_id_fkey";
                        columns: ["lesson_id"];
                        isOneToOne: false;
                        referencedRelation: "lessons";
                        referencedColumns: ["id"];
                    },
                ];
            };
            placement_results: {
                Row: {
                    created_at: string;
                    id: string;
                    level: string;
                    score: number;
                    user_id: string;
                };
                ComputedFields: never;
                Insert: {
                    created_at?: string;
                    id?: string;
                    level: string;
                    score: number;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    level?: string;
                    score?: number;
                    user_id?: string;
                };
                Relationships: [];
            };
            profiles: {
                Row: {
                    avatar_path: string | null;
                    created_at: string;
                    daily_minutes: number;
                    display_name: string;
                    id: string;
                    locale: string;
                    onboarding_completed_at: string | null;
                    updated_at: string;
                };
                ComputedFields: never;
                Insert: {
                    avatar_path?: string | null;
                    created_at?: string;
                    daily_minutes?: number;
                    display_name?: string;
                    id: string;
                    locale?: string;
                    onboarding_completed_at?: string | null;
                    updated_at?: string;
                };
                Update: {
                    avatar_path?: string | null;
                    created_at?: string;
                    daily_minutes?: number;
                    display_name?: string;
                    id?: string;
                    locale?: string;
                    onboarding_completed_at?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            sessions: {
                Row: {
                    created_at: string;
                    id: string;
                    mode: string;
                    tutor_id: string;
                    updated_at: string;
                    user_id: string;
                };
                ComputedFields: never;
                Insert: {
                    created_at?: string;
                    id?: string;
                    mode: string;
                    tutor_id: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    mode?: string;
                    tutor_id?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            ticket_messages: {
                Row: {
                    author: string;
                    content: string;
                    created_at: string;
                    id: string;
                    ticket_id: string;
                };
                ComputedFields: never;
                Insert: {
                    author: string;
                    content: string;
                    created_at?: string;
                    id?: string;
                    ticket_id: string;
                };
                Update: {
                    author?: string;
                    content?: string;
                    created_at?: string;
                    id?: string;
                    ticket_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "ticket_messages_ticket_id_fkey";
                        columns: ["ticket_id"];
                        isOneToOne: false;
                        referencedRelation: "tickets";
                        referencedColumns: ["id"];
                    },
                ];
            };
            tickets: {
                Row: {
                    created_at: string;
                    id: string;
                    status: string;
                    subject: string;
                    updated_at: string;
                    user_id: string;
                };
                ComputedFields: never;
                Insert: {
                    created_at?: string;
                    id?: string;
                    status?: string;
                    subject: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    status?: string;
                    subject?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            usage_counters: {
                Row: {
                    created_at: string;
                    date: string;
                    id: string;
                    lessons_used: number;
                    messages_used: number;
                    updated_at: string;
                    user_id: string;
                };
                ComputedFields: never;
                Insert: {
                    created_at?: string;
                    date?: string;
                    id?: string;
                    lessons_used?: number;
                    messages_used?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    date?: string;
                    id?: string;
                    lessons_used?: number;
                    messages_used?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [];
            };
            vocabulary: {
                Row: {
                    context: string | null;
                    created_at: string;
                    id: string;
                    next_due_at: string;
                    source_lesson_id: string | null;
                    stage: number;
                    term: string;
                    translation: string | null;
                    updated_at: string;
                    user_id: string;
                };
                ComputedFields: never;
                Insert: {
                    context?: string | null;
                    created_at?: string;
                    id?: string;
                    next_due_at?: string;
                    source_lesson_id?: string | null;
                    stage?: number;
                    term: string;
                    translation?: string | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    context?: string | null;
                    created_at?: string;
                    id?: string;
                    next_due_at?: string;
                    source_lesson_id?: string | null;
                    stage?: number;
                    term?: string;
                    translation?: string | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "vocabulary_source_lesson_id_fkey";
                        columns: ["source_lesson_id"];
                        isOneToOne: false;
                        referencedRelation: "lessons";
                        referencedColumns: ["id"];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            get_or_create_entitlements: {
                Args: { p_user_id: string };
                Returns: {
                    created_at: string;
                    daily_lessons_limit: number;
                    daily_messages_limit: number;
                    id: string;
                    plan: string;
                    updated_at: string;
                    user_id: string;
                };
                SetofOptions: {
                    from: "*";
                    to: "entitlements";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            release_lesson: { Args: { p_user_id: string }; Returns: Json };
            release_message: { Args: { p_user_id: string }; Returns: Json };
            reserve_lesson: { Args: { p_user_id: string }; Returns: Json };
            reserve_message: { Args: { p_user_id: string }; Returns: Json };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {},
    },
} as const;
