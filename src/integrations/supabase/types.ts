export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_answers: {
        Row: {
          created_at: string
          id: string
          question_id: string
          submission_id: string
          value_bool: boolean | null
          value_choices: Json | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          submission_id: string
          value_bool?: boolean | null
          value_choices?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          submission_id?: string
          value_bool?: boolean | null
          value_choices?: Json | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "feedback_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_questions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
          required: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          options?: Json | null
          order_index?: number
          question_text: string
          question_type: string
          required?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
          required?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          age: number | null
          consent_timestamp: string | null
          created_at: string
          dialect: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          last_name: string
          phone_number: string
          phone_number_updated: boolean
          pseudonym: string
          transcription_approved: boolean
          transcription_guidelines_agreed: boolean
          transcription_guidelines_agreed_at: string | null
          updated_at: string
          verified: boolean
          voice_recording_consent: boolean | null
        }
        Insert: {
          account_type?: string
          age?: number | null
          consent_timestamp?: string | null
          created_at?: string
          dialect?: string | null
          email: string
          first_name: string
          gender?: string | null
          id: string
          last_name: string
          phone_number: string
          phone_number_updated?: boolean
          pseudonym: string
          transcription_approved?: boolean
          transcription_guidelines_agreed?: boolean
          transcription_guidelines_agreed_at?: string | null
          updated_at?: string
          verified?: boolean
          voice_recording_consent?: boolean | null
        }
        Update: {
          account_type?: string
          age?: number | null
          consent_timestamp?: string | null
          created_at?: string
          dialect?: string | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          phone_number?: string
          phone_number_updated?: boolean
          pseudonym?: string
          transcription_approved?: boolean
          transcription_guidelines_agreed?: boolean
          transcription_guidelines_agreed_at?: string | null
          updated_at?: string
          verified?: boolean
          voice_recording_consent?: boolean | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_attribution: string | null
          image_url: string | null
          order_index: number
          question_text: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          order_index?: number
          question_text: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          order_index?: number
          question_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_locks: {
        Row: {
          expires_at: string
          id: string
          locked_at: string
          user_id: string
          voice_response_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          locked_at?: string
          user_id: string
          voice_response_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          locked_at?: string
          user_id?: string
          voice_response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcription_locks_voice_response_id_fkey"
            columns: ["voice_response_id"]
            isOneToOne: true
            referencedRelation: "voice_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          created_at: string
          edit_count: number
          id: string
          status: string
          transcription_text: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          voice_response_id: string
        }
        Insert: {
          created_at?: string
          edit_count?: number
          id?: string
          status?: string
          transcription_text: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          voice_response_id: string
        }
        Update: {
          created_at?: string
          edit_count?: number
          id?: string
          status?: string
          transcription_text?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          voice_response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_voice_response_id_fkey"
            columns: ["voice_response_id"]
            isOneToOne: false
            referencedRelation: "voice_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          page: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          page?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          page?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          category_id: string
          completed_questions: number
          created_at: string
          id: string
          last_question_id: string | null
          total_questions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          completed_questions?: number
          created_at?: string
          id?: string
          last_question_id?: string | null
          total_questions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          completed_questions?: number
          created_at?: string
          id?: string
          last_question_id?: string | null
          total_questions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_last_question_id_fkey"
            columns: ["last_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_responses: {
        Row: {
          audio_file_url: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          question_id: string
          response_type: string | null
          status: Database["public"]["Enums"]["response_status"]
          text_response: string | null
          user_id: string
        }
        Insert: {
          audio_file_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_id: string
          response_type?: string | null
          status?: Database["public"]["Enums"]["response_status"]
          text_response?: string | null
          user_id: string
        }
        Update: {
          audio_file_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          question_id?: string
          response_type?: string | null
          status?: Database["public"]["Enums"]["response_status"]
          text_response?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_random_transcription: {
        Args: { _user_id: string }
        Returns: {
          audio_file_url: string
          duration_seconds: number
          id: string
          question_id: string
        }[]
      }
      get_admin_chart_data: { Args: never; Returns: Json }
      get_question_counts: {
        Args: never
        Returns: {
          question_id: string
          unique_user_count: number
        }[]
      }
      get_question_unique_user_counts: {
        Args: never
        Returns: {
          question_id: string
          unique_user_count: number
        }[]
      }
      get_transcription_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_transcription_lock: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      response_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      response_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
