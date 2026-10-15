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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          created_at: string
          event_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          amount_cents: number
          code: string
          created_at: string
          event_id: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          max_uses: number | null
          percent_off: number | null
          uses_count: number
        }
        Insert: {
          active?: boolean
          amount_cents: number
          code: string
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number | null
          uses_count?: number
        }
        Update: {
          active?: boolean
          amount_cents?: number
          code?: string
          created_at?: string
          event_id?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reminders: {
        Row: {
          event_id: string
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_join_requests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_join_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          event_id: string
          file_size: number | null
          id: string
          storage_key: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          event_id: string
          file_size?: number | null
          id?: string
          storage_key?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          event_id?: string
          file_size?: number | null
          id?: string
          storage_key?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_poll_options: {
        Row: {
          id: string
          poll_id: string
          position: number
          text: string
        }
        Insert: {
          id?: string
          poll_id: string
          position?: number
          text: string
        }
        Update: {
          id?: string
          poll_id?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "event_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      event_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "event_poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "event_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_polls: {
        Row: {
          closes_at: string | null
          created_at: string
          event_id: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          question: string
          user_id: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_polls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ratings: {
        Row: {
          comment: string | null
          created_at: string
          event_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_teams: {
        Row: {
          capacity: number
          created_at: string
          event_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          capacity: number
          created_at?: string
          event_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          capacity?: number
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string
          cancel_before_hours: number | null
          capacity: number
          category: string | null
          city: string
          confirmed_count: number
          cover_url: string | null
          created_at: string
          custom_rules: string | null
          description: string | null
          ends_at: string | null
          group_id: string | null
          id: string
          invite_token: string | null
          min_check_at: string
          min_participants: number
          mp_access_token: string | null
          organizer_exempt: boolean
          organizer_id: string
          parent_event_id: string | null
          payout_claimed_at: string | null
          price: number
          rating_average: number | null
          rating_count: number | null
          recurrence_index: number | null
          recurrence_rule: string | null
          registration_deadline: string
          search_vec: unknown
          slug: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          visibility: string
          waitlist_capacity: number
        }
        Insert: {
          address: string
          cancel_before_hours?: number | null
          capacity: number
          category?: string | null
          city: string
          confirmed_count?: number
          cover_url?: string | null
          created_at?: string
          custom_rules?: string | null
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          invite_token?: string | null
          min_check_at: string
          min_participants: number
          mp_access_token?: string | null
          organizer_exempt?: boolean
          organizer_id: string
          parent_event_id?: string | null
          payout_claimed_at?: string | null
          price: number
          rating_average?: number | null
          rating_count?: number | null
          recurrence_index?: number | null
          recurrence_rule?: string | null
          registration_deadline: string
          search_vec?: unknown
          slug: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          visibility?: string
          waitlist_capacity?: number
        }
        Update: {
          address?: string
          cancel_before_hours?: number | null
          capacity?: number
          category?: string | null
          city?: string
          confirmed_count?: number
          cover_url?: string | null
          created_at?: string
          custom_rules?: string | null
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          invite_token?: string | null
          min_check_at?: string
          min_participants?: number
          mp_access_token?: string | null
          organizer_exempt?: boolean
          organizer_id?: string
          parent_event_id?: string | null
          payout_claimed_at?: string | null
          price?: number
          rating_average?: number | null
          rating_count?: number | null
          recurrence_index?: number | null
          recurrence_rule?: string | null
          registration_deadline?: string
          search_vec?: unknown
          slug?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          visibility?: string
          waitlist_capacity?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          category: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          invite_token: string
          member_count: number
          name: string
          owner_id: string
          search_vec: unknown
          slug: string
          updated_at: string
          visibility: Database["public"]["Enums"]["group_visibility"]
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_token?: string
          member_count?: number
          name: string
          owner_id: string
          search_vec?: unknown
          slug: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          invite_token?: string
          member_count?: number
          name?: string
          owner_id?: string
          search_vec?: unknown
          slug?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["group_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          contact: string | null
          created_at: string
          description: string
          expires_at: string | null
          group_id: string
          id: string
          payment_methods: string[]
          photo_url: string | null
          photo_urls: string[]
          price: number | null
          price_negotiable: boolean
          published_at: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          description: string
          expires_at?: string | null
          group_id: string
          id?: string
          payment_methods?: string[]
          photo_url?: string | null
          photo_urls?: string[]
          price?: number | null
          price_negotiable?: boolean
          published_at?: string | null
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          description?: string
          expires_at?: string | null
          group_id?: string
          id?: string
          payment_methods?: string[]
          photo_url?: string | null
          photo_urls?: string[]
          price?: number | null
          price_negotiable?: boolean
          published_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          pushed_at: string | null
          read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          pushed_at?: string | null
          read?: boolean
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          pushed_at?: string | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participations: {
        Row: {
          checked_in_at: string | null
          coupon_id: string | null
          created_at: string
          discount_cents: number
          event_id: string
          id: string
          payment_id: string | null
          status: Database["public"]["Enums"]["participation_status"]
          team_changes_used: number
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          event_id: string
          id?: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["participation_status"]
          team_changes_used?: number
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          event_id?: string
          id?: string
          payment_id?: string | null
          status?: Database["public"]["Enums"]["participation_status"]
          team_changes_used?: number
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_participation_payment"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway_fee: number
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          participation_id: string | null
          payer_id: string
          platform_fee: number
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          wallet_transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_fee?: number
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          participation_id?: string | null
          payer_id: string
          platform_fee?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_fee?: number
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          participation_id?: string | null
          payer_id?: string
          platform_fee?: number
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_wallet_tx"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_participation_id_fkey"
            columns: ["participation_id"]
            isOneToOne: false
            referencedRelation: "participations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cpf: string | null
          created_at: string
          full_name: string
          id: string
          mp_account_id: string | null
          notif_email: boolean
          notif_new_event_channel: string
          notif_push: boolean
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
          username: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          full_name: string
          id: string
          mp_account_id?: string | null
          notif_email?: boolean
          notif_new_event_channel?: string
          notif_push?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
          username: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string
          id?: string
          mp_account_id?: string | null
          notif_email?: boolean
          notif_new_event_channel?: string
          notif_push?: boolean
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
          username?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string | null
          id: string
          notified_at: string | null
          position: number
          status: Database["public"]["Enums"]["waitlist_status"]
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          position: number
          status?: Database["public"]["Enums"]["waitlist_status"]
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string | null
          id?: string
          notified_at?: string | null
          position?: number
          status?: Database["public"]["Enums"]["waitlist_status"]
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          payment_id: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          payment_id?: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          payment_id?: string | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_failures: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          payload: Json | null
          source: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          source: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          source?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount_cents: number
          cpf: string
          created_at: string
          fee_cents: number
          id: string
          net_cents: number
          pix_key: string
          pix_key_type: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          cpf: string
          created_at?: string
          fee_cents: number
          id?: string
          net_cents: number
          pix_key: string
          pix_key_type: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          cpf?: string
          created_at?: string
          fee_cents?: number
          id?: string
          net_cents?: number
          pix_key?: string
          pix_key_type?: string
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_waitlist_capacity: { Args: { p_capacity: number }; Returns: number }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      process_waitlist_expiry: { Args: never; Returns: undefined }
      promote_waitlist_next: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      refund_participation_payments: {
        Args: {
          p_description: string
          p_event_id: string
          p_participation_id: string
          p_user_id: string
        }
        Returns: number
      }
      release_coupon_use: {
        Args: { p_coupon_id: string; p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      team_confirmed_count: { Args: { p_team_id: string }; Returns: number }
      transfer_group_ownership: {
        Args: {
          p_current_owner: string
          p_group_id: string
          p_new_owner: string
        }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      wallet_credit: {
        Args: {
          p_amount: number
          p_description?: string
          p_event_id?: string
          p_payment_id?: string
          p_type: Database["public"]["Enums"]["wallet_transaction_type"]
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          payment_id: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_debit: {
        Args: {
          p_amount: number
          p_description?: string
          p_event_id?: string
          p_payment_id?: string
          p_type: Database["public"]["Enums"]["wallet_transaction_type"]
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          payment_id: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      event_status:
        | "DRAFT"
        | "OPEN"
        | "PENDING"
        | "CONFIRMED"
        | "COMPLETED"
        | "CANCELLED"
      group_visibility: "PUBLIC" | "PRIVATE"
      notification_type:
        | "EVENT_CONFIRMED"
        | "EVENT_CANCELLED"
        | "EVENT_REMINDER"
        | "EVENT_STATUS_CHANGE"
        | "WAITLIST_NOTIFIED"
        | "WAITLIST_EXPIRED"
        | "PAYMENT_APPROVED"
        | "PAYMENT_FAILED"
        | "PAYOUT_PROCESSED"
        | "ORGANIZER_STATUS_CHANGE"
        | "GROUP_MESSAGE"
        | "NEW_EVENT"
        | "EVENT_UPDATED"
        | "EVENT_JOIN_REQUEST"
        | "EVENT_JOIN_APPROVED"
        | "EVENT_JOIN_REJECTED"
        | "GROUP_JOIN_REQUEST"
        | "GROUP_JOIN_APPROVED"
        | "GROUP_JOIN_REJECTED"
        | "GROUP_OWNERSHIP_TRANSFERRED"
        | "EVENT_MESSAGE"
        | "WAITLIST_PROMOTED"
      participation_status: "CONFIRMED" | "PENDING" | "CANCELLED" | "WAITLISTED"
      payment_method: "PIX" | "CREDIT_CARD" | "WALLET"
      payment_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "REFUNDED"
        | "CANCELLED"
      waitlist_status: "WAITING" | "NOTIFIED" | "EXPIRED" | "CONFIRMED"
      wallet_transaction_type:
        | "DEPOSIT"
        | "PAYMENT"
        | "REFUND"
        | "WITHDRAWAL"
        | "PAYOUT"
        | "BONUS"
        | "ADJUSTMENT"
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
      event_status: [
        "DRAFT",
        "OPEN",
        "PENDING",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
      ],
      group_visibility: ["PUBLIC", "PRIVATE"],
      notification_type: [
        "EVENT_CONFIRMED",
        "EVENT_CANCELLED",
        "EVENT_REMINDER",
        "EVENT_STATUS_CHANGE",
        "WAITLIST_NOTIFIED",
        "WAITLIST_EXPIRED",
        "PAYMENT_APPROVED",
        "PAYMENT_FAILED",
        "PAYOUT_PROCESSED",
        "ORGANIZER_STATUS_CHANGE",
        "GROUP_MESSAGE",
        "NEW_EVENT",
        "EVENT_UPDATED",
        "EVENT_JOIN_REQUEST",
        "EVENT_JOIN_APPROVED",
        "EVENT_JOIN_REJECTED",
        "GROUP_JOIN_REQUEST",
        "GROUP_JOIN_APPROVED",
        "GROUP_JOIN_REJECTED",
        "GROUP_OWNERSHIP_TRANSFERRED",
        "EVENT_MESSAGE",
        "WAITLIST_PROMOTED",
      ],
      participation_status: ["CONFIRMED", "PENDING", "CANCELLED", "WAITLISTED"],
      payment_method: ["PIX", "CREDIT_CARD", "WALLET"],
      payment_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "REFUNDED",
        "CANCELLED",
      ],
      waitlist_status: ["WAITING", "NOTIFIED", "EXPIRED", "CONFIRMED"],
      wallet_transaction_type: [
        "DEPOSIT",
        "PAYMENT",
        "REFUND",
        "WITHDRAWAL",
        "PAYOUT",
        "BONUS",
        "ADJUSTMENT",
      ],
    },
  },
} as const
