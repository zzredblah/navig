/**
 * NAVIG Database Types - Sprint 1-2
 * Supabase 스키마와 호환되는 타입 정의
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// Enums
// ============================================

export type UserRole = 'client' | 'worker' | 'admin';

export type ProjectStatus = 'planning' | 'production' | 'review' | 'completed';

export type MemberRole = 'owner' | 'approver' | 'editor' | 'viewer';

export type DocumentType = 'request' | 'estimate' | 'contract';

export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'signed';

export type VideoStatus = 'uploading' | 'encoding' | 'processing' | 'ready' | 'error';

export type FeedbackStatus = 'open' | 'resolved' | 'wontfix';

export type TemplateFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select' | 'file';

export type NotificationType =
  | 'new_feedback'
  | 'urgent_feedback'
  | 'feedback_status'
  | 'feedback_reply'
  | 'new_version'
  | 'video_approved'
  | 'document_status'
  | 'project_invite'
  | 'deadline_reminder'
  | 'chat_message';

export interface TemplateField {
  name: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  options?: string[];
}

// ============================================
// Sidebar Config
// ============================================

export interface SidebarConfig {
  hidden?: string[];
}

// ============================================
// Database Interface (Supabase 호환)
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          role: UserRole;
          phone: string | null;
          company: string | null;
          sidebar_config: SidebarConfig | null;
          feedback_templates: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          role?: UserRole;
          phone?: string | null;
          company?: string | null;
          sidebar_config?: SidebarConfig | null;
          feedback_templates?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          phone?: string | null;
          company?: string | null;
          sidebar_config?: SidebarConfig | null;
          feedback_templates?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: ProjectStatus;
          client_id: string;
          deadline: string | null;
          watermark_settings: Json | null;
          // Cloudflare Stream 워터마크 프로필 ID
          stream_watermark_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: ProjectStatus;
          client_id: string;
          deadline?: string | null;
          watermark_settings?: Json | null;
          stream_watermark_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: ProjectStatus;
          client_id?: string;
          deadline?: string | null;
          watermark_settings?: Json | null;
          stream_watermark_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: MemberRole;
          invited_at: string;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: MemberRole;
          invited_at?: string;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: MemberRole;
          invited_at?: string;
          joined_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      document_templates: {
        Row: {
          id: string;
          type: DocumentType;
          name: string;
          description: string | null;
          fields: TemplateField[];
          is_default: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: DocumentType;
          name: string;
          description?: string | null;
          fields?: TemplateField[];
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: DocumentType;
          name?: string;
          description?: string | null;
          fields?: TemplateField[];
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          template_id: string | null;
          type: DocumentType;
          title: string;
          content: Record<string, unknown>;
          status: DocumentStatus;
          version: number;
          file_url: string | null;
          reject_reason: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          template_id?: string | null;
          type: DocumentType;
          title: string;
          content?: Record<string, unknown>;
          status?: DocumentStatus;
          version?: number;
          file_url?: string | null;
          reject_reason?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          template_id?: string | null;
          type?: DocumentType;
          title?: string;
          content?: Record<string, unknown>;
          status?: DocumentStatus;
          version?: number;
          file_url?: string | null;
          reject_reason?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_template_id_fkey';
            columns: ['template_id'];
            referencedRelation: 'document_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version: number;
          content: Record<string, unknown>;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version: number;
          content: Record<string, unknown>;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version?: number;
          content?: Record<string, unknown>;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_versions_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
      signatures: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          signature_data: string;
          ip_address: string | null;
          user_agent: string | null;
          signed_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          user_id: string;
          signature_data: string;
          ip_address?: string | null;
          user_agent?: string | null;
          signed_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          user_id?: string;
          signature_data?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          signed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signatures_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'signatures_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      video_versions: {
        Row: {
          id: string;
          project_id: string;
          version_number: number;
          version_name: string | null;
          original_filename: string;
          file_url: string | null;
          file_key: string | null;
          thumbnail_url: string | null;
          thumbnail_key: string | null;
          duration: number | null;
          resolution: string | null;
          file_size: number;
          codec: string | null;
          change_notes: string;
          status: VideoStatus;
          upload_id: string | null;
          uploaded_by: string;
          approved_at: string | null;
          approved_by: string | null;
          watermark_enabled: boolean;
          // Cloudflare Stream 관련 필드
          stream_video_id: string | null;
          stream_ready: boolean;
          hls_url: string | null;
          download_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          version_number?: number;
          version_name?: string | null;
          original_filename: string;
          file_url?: string | null;
          file_key?: string | null;
          thumbnail_url?: string | null;
          thumbnail_key?: string | null;
          duration?: number | null;
          resolution?: string | null;
          file_size: number;
          codec?: string | null;
          change_notes: string;
          status?: VideoStatus;
          upload_id?: string | null;
          uploaded_by: string;
          approved_at?: string | null;
          approved_by?: string | null;
          watermark_enabled?: boolean;
          // Cloudflare Stream 관련 필드
          stream_video_id?: string | null;
          stream_ready?: boolean;
          hls_url?: string | null;
          download_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          version_number?: number;
          version_name?: string | null;
          original_filename?: string;
          file_url?: string | null;
          file_key?: string | null;
          thumbnail_url?: string | null;
          thumbnail_key?: string | null;
          duration?: number | null;
          resolution?: string | null;
          file_size?: number;
          codec?: string | null;
          change_notes?: string;
          status?: VideoStatus;
          upload_id?: string | null;
          uploaded_by?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          watermark_enabled?: boolean;
          // Cloudflare Stream 관련 필드
          stream_video_id?: string | null;
          stream_ready?: boolean;
          hls_url?: string | null;
          download_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'video_versions_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_versions_uploaded_by_fkey';
            columns: ['uploaded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      video_feedbacks: {
        Row: {
          id: string;
          video_id: string;
          project_id: string;
          content: string;
          timestamp_seconds: number;
          position_x: number | null;
          position_y: number | null;
          drawing_image: string | null;
          is_urgent: boolean;
          status: FeedbackStatus;
          resolved_at: string | null;
          resolved_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          project_id: string;
          content: string;
          timestamp_seconds: number;
          position_x?: number | null;
          position_y?: number | null;
          drawing_image?: string | null;
          is_urgent?: boolean;
          status?: FeedbackStatus;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          project_id?: string;
          content?: string;
          timestamp_seconds?: number;
          position_x?: number | null;
          position_y?: number | null;
          drawing_image?: string | null;
          is_urgent?: boolean;
          status?: FeedbackStatus;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'video_feedbacks_video_id_fkey';
            columns: ['video_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_feedbacks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_feedbacks_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      feedback_replies: {
        Row: {
          id: string;
          feedback_id: string;
          content: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feedback_id: string;
          content: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          feedback_id?: string;
          content?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'feedback_replies_feedback_id_fkey';
            columns: ['feedback_id'];
            referencedRelation: 'video_feedbacks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'feedback_replies_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          content: string | null;
          link: string | null;
          metadata: Record<string, unknown>;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          content?: string | null;
          link?: string | null;
          metadata?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          content?: string | null;
          link?: string | null;
          metadata?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notification_settings: {
        Row: {
          user_id: string;
          email_new_feedback: boolean;
          email_urgent_feedback: boolean;
          email_version_upload: boolean;
          email_document_status: boolean;
          email_deadline_reminder: boolean;
          email_chat_message: boolean;
          inapp_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email_new_feedback?: boolean;
          email_urgent_feedback?: boolean;
          email_version_upload?: boolean;
          email_document_status?: boolean;
          email_deadline_reminder?: boolean;
          email_chat_message?: boolean;
          inapp_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email_new_feedback?: boolean;
          email_urgent_feedback?: boolean;
          email_version_upload?: boolean;
          email_document_status?: boolean;
          email_deadline_reminder?: boolean;
          email_chat_message?: boolean;
          inapp_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_settings_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      boards: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          thumbnail_url: string | null;
          is_public: boolean;
          share_token: string | null;
          background_color: string;
          grid_enabled: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          share_token?: string | null;
          background_color?: string;
          grid_enabled?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          share_token?: string | null;
          background_color?: string;
          grid_enabled?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'boards_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'boards_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      board_elements: {
        Row: {
          id: string;
          board_id: string;
          type: string;
          position_x: number;
          position_y: number;
          width: number;
          height: number;
          rotation: number;
          z_index: number;
          locked: boolean;
          content: Record<string, unknown>;
          style: Record<string, unknown>;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          type: string;
          position_x?: number;
          position_y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          z_index?: number;
          locked?: boolean;
          content?: Record<string, unknown>;
          style?: Record<string, unknown>;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          type?: string;
          position_x?: number;
          position_y?: number;
          width?: number;
          height?: number;
          rotation?: number;
          z_index?: number;
          locked?: boolean;
          content?: Record<string, unknown>;
          style?: Record<string, unknown>;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'board_elements_board_id_fkey';
            columns: ['board_id'];
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'board_elements_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      video_change_markers: {
        Row: {
          id: string;
          version_id: string;
          compared_version_id: string | null;
          type: 'visual' | 'audio' | 'text' | 'effect' | 'other';
          start_time: number;
          end_time: number;
          description: string | null;
          is_ai_generated: boolean;
          confidence: number | null;
          ai_metadata: Record<string, unknown> | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          version_id: string;
          compared_version_id?: string | null;
          type: 'visual' | 'audio' | 'text' | 'effect' | 'other';
          start_time: number;
          end_time: number;
          description?: string | null;
          is_ai_generated?: boolean;
          confidence?: number | null;
          ai_metadata?: Record<string, unknown> | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          version_id?: string;
          compared_version_id?: string | null;
          type?: 'visual' | 'audio' | 'text' | 'effect' | 'other';
          start_time?: number;
          end_time?: number;
          description?: string | null;
          is_ai_generated?: boolean;
          confidence?: number | null;
          ai_metadata?: Record<string, unknown> | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'video_change_markers_version_id_fkey';
            columns: ['version_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_change_markers_compared_version_id_fkey';
            columns: ['compared_version_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_change_markers_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      video_diff_analyses: {
        Row: {
          id: string;
          version_id: string;
          compared_version_id: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          error_message: string | null;
          markers_count: number;
          processing_time_ms: number | null;
          model: string | null;
          metadata: Record<string, unknown> | null;
          created_by: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          version_id: string;
          compared_version_id: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          markers_count?: number;
          processing_time_ms?: number | null;
          model?: string | null;
          metadata?: Record<string, unknown> | null;
          created_by: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          version_id?: string;
          compared_version_id?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          markers_count?: number;
          processing_time_ms?: number | null;
          model?: string | null;
          metadata?: Record<string, unknown> | null;
          created_by?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'video_diff_analyses_version_id_fkey';
            columns: ['version_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_diff_analyses_compared_version_id_fkey';
            columns: ['compared_version_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_diff_analyses_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      portfolios: {
        Row: {
          user_id: string;
          slug: string | null;
          display_name: string | null;
          bio: string | null;
          skills: string[];
          website_url: string | null;
          contact_email: string | null;
          social_links: Record<string, string>;
          is_public: boolean;
          theme: string;
          custom_css: string | null;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          slug?: string | null;
          display_name?: string | null;
          bio?: string | null;
          skills?: string[];
          website_url?: string | null;
          contact_email?: string | null;
          social_links?: Record<string, string>;
          is_public?: boolean;
          theme?: string;
          custom_css?: string | null;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          slug?: string | null;
          display_name?: string | null;
          bio?: string | null;
          skills?: string[];
          website_url?: string | null;
          contact_email?: string | null;
          social_links?: Record<string, string>;
          is_public?: boolean;
          theme?: string;
          custom_css?: string | null;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolios_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      portfolio_works: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          thumbnail_url: string | null;
          video_url: string | null;
          external_url: string | null;
          project_id: string | null;
          tags: string[];
          is_featured: boolean;
          is_public: boolean;
          view_count: number;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          thumbnail_url?: string | null;
          video_url?: string | null;
          external_url?: string | null;
          project_id?: string | null;
          tags?: string[];
          is_featured?: boolean;
          is_public?: boolean;
          view_count?: number;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          thumbnail_url?: string | null;
          video_url?: string | null;
          external_url?: string | null;
          project_id?: string | null;
          tags?: string[];
          is_featured?: boolean;
          is_public?: boolean;
          view_count?: number;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolio_works_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'portfolios';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'portfolio_works_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          }
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          device_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_used_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          device_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          device_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      push_notification_logs: {
        Row: {
          id: string;
          subscription_id: string | null;
          user_id: string;
          notification_type: string;
          title: string;
          body: string | null;
          data: Record<string, unknown>;
          status: string;
          error_message: string | null;
          sent_at: string | null;
          clicked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id?: string | null;
          user_id: string;
          notification_type: string;
          title: string;
          body?: string | null;
          data?: Record<string, unknown>;
          status?: string;
          error_message?: string | null;
          sent_at?: string | null;
          clicked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string | null;
          user_id?: string;
          notification_type?: string;
          title?: string;
          body?: string | null;
          data?: Record<string, unknown>;
          status?: string;
          error_message?: string | null;
          sent_at?: string | null;
          clicked_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notification_logs_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_notification_logs_subscription_id_fkey';
            columns: ['subscription_id'];
            referencedRelation: 'push_subscriptions';
            referencedColumns: ['id'];
          }
        ];
      };
      push_notification_settings: {
        Row: {
          user_id: string;
          enabled: boolean;
          feedback_enabled: boolean;
          chat_enabled: boolean;
          project_enabled: boolean;
          system_enabled: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          enabled?: boolean;
          feedback_enabled?: boolean;
          chat_enabled?: boolean;
          project_enabled?: boolean;
          system_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          enabled?: boolean;
          feedback_enabled?: boolean;
          chat_enabled?: boolean;
          project_enabled?: boolean;
          system_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notification_settings_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      video_subtitles: {
        Row: {
          id: string;
          video_version_id: string;
          language: string;
          format: 'srt' | 'vtt' | 'json';
          content: string;
          status: 'processing' | 'completed' | 'failed';
          error_message: string | null;
          duration_seconds: number | null;
          word_count: number | null;
          confidence_score: number | null;
          is_auto_generated: boolean;
          metadata: Record<string, unknown>;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          video_version_id: string;
          language: string;
          format?: 'srt' | 'vtt' | 'json';
          content?: string;
          status?: 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          duration_seconds?: number | null;
          word_count?: number | null;
          confidence_score?: number | null;
          is_auto_generated?: boolean;
          metadata?: Record<string, unknown>;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          video_version_id?: string;
          language?: string;
          format?: 'srt' | 'vtt' | 'json';
          content?: string;
          status?: 'processing' | 'completed' | 'failed';
          error_message?: string | null;
          duration_seconds?: number | null;
          word_count?: number | null;
          confidence_score?: number | null;
          is_auto_generated?: boolean;
          metadata?: Record<string, unknown>;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'video_subtitles_video_version_id_fkey';
            columns: ['video_version_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'video_subtitles_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      subtitle_segments: {
        Row: {
          id: string;
          subtitle_id: string;
          segment_index: number;
          start_time: number;
          end_time: number;
          text: string;
          confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subtitle_id: string;
          segment_index: number;
          start_time: number;
          end_time: number;
          text: string;
          confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subtitle_id?: string;
          segment_index?: number;
          start_time?: number;
          end_time?: number;
          text?: string;
          confidence?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subtitle_segments_subtitle_id_fkey';
            columns: ['subtitle_id'];
            referencedRelation: 'video_subtitles';
            referencedColumns: ['id'];
          }
        ];
      };
      external_integrations: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          access_token: string;
          refresh_token: string | null;
          token_expires_at: string | null;
          provider_user_id: string | null;
          provider_email: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          access_token: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          provider_user_id?: string | null;
          provider_email?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          access_token?: string;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          provider_user_id?: string | null;
          provider_email?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'external_integrations_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      edit_projects: {
        Row: {
          id: string;
          project_id: string;
          source_video_id: string | null;
          source_url: string | null;
          source_key: string | null;
          original_duration: number | null;
          title: string;
          description: string | null;
          status: 'draft' | 'registered' | 'approved' | 'rejected';
          edit_metadata: Record<string, unknown>;
          preview_thumbnail_url: string | null;
          registered_at: string | null;
          registered_video_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          source_video_id?: string | null;
          source_url?: string | null;
          source_key?: string | null;
          original_duration?: number | null;
          title: string;
          description?: string | null;
          status?: 'draft' | 'registered' | 'approved' | 'rejected';
          edit_metadata?: Record<string, unknown>;
          preview_thumbnail_url?: string | null;
          registered_at?: string | null;
          registered_video_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          source_video_id?: string | null;
          source_url?: string | null;
          source_key?: string | null;
          original_duration?: number | null;
          title?: string;
          description?: string | null;
          status?: 'draft' | 'registered' | 'approved' | 'rejected';
          edit_metadata?: Record<string, unknown>;
          preview_thumbnail_url?: string | null;
          registered_at?: string | null;
          registered_video_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'edit_projects_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'edit_projects_source_video_id_fkey';
            columns: ['source_video_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'edit_projects_registered_video_id_fkey';
            columns: ['registered_video_id'];
            referencedRelation: 'video_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'edit_projects_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_project_access: {
        Args: { project_uuid: string };
        Returns: boolean;
      };
      is_project_owner: {
        Args: { project_uuid: string };
        Returns: boolean;
      };
      is_project_member: {
        Args: { project_uuid: string };
        Returns: boolean;
      };
      is_project_admin: {
        Args: { project_uuid: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      member_role: MemberRole;
      document_type: DocumentType;
      document_status: DocumentStatus;
      video_status: VideoStatus;
      feedback_status: FeedbackStatus;
      notification_type: NotificationType;
      edit_project_status: 'draft' | 'registered' | 'approved' | 'rejected';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ============================================
// Utility Types
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// 자주 사용하는 타입 별칭
export type Profile = Tables<'profiles'>;
export type Project = Tables<'projects'>;
export type ProjectMember = Tables<'project_members'>;
export type DocumentTemplate = Tables<'document_templates'>;
export type Document = Tables<'documents'>;
export type DocumentVersion = Tables<'document_versions'>;
export type Signature = Tables<'signatures'>;
export type VideoVersion = Tables<'video_versions'>;
export type VideoFeedback = Tables<'video_feedbacks'>;
export type FeedbackReply = Tables<'feedback_replies'>;
export type Notification = Tables<'notifications'>;
export type NotificationSettings = Tables<'notification_settings'>;
export type Board = Tables<'boards'>;
export type BoardElement = Tables<'board_elements'>;
export type PortfolioRow = Tables<'portfolios'>;
export type PortfolioWorkRow = Tables<'portfolio_works'>;
export type PushSubscriptionRow = Tables<'push_subscriptions'>;
export type PushNotificationLogRow = Tables<'push_notification_logs'>;
export type PushNotificationSettingsRow = Tables<'push_notification_settings'>;
export type VideoSubtitleRow = Tables<'video_subtitles'>;
export type SubtitleSegmentRow = Tables<'subtitle_segments'>;
export type VideoChangeMarkerRow = Tables<'video_change_markers'>;
export type VideoDiffAnalysisRow = Tables<'video_diff_analyses'>;
export type EditProjectRow = Tables<'edit_projects'>;

// Re-export editing types
export type {
  EditProjectStatus,
  EditMetadata,
  EditProject,
  EditProjectWithDetails,
  TrimSettings,
  TextOverlay,
  FilterSettings,
  AudioSettings,
  EditTool,
} from './editing';

// Re-export subscription types
export type {
  SubscriptionPlan,
  Subscription,
  Payment,
  UsageRecord,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  BillingCycle,
  PlanLimits,
  PlanFeature,
} from './subscription';

// 확장 타입 (조인된 데이터)
export type ProjectWithClient = Project & {
  client: Profile;
};

export type ProjectMemberWithUser = ProjectMember & {
  user: Profile;
};

export type DocumentWithTemplate = Document & {
  template: DocumentTemplate | null;
  creator: Profile;
};

export type DocumentWithSignatures = Document & {
  signatures: Signature[];
};

export type DocumentVersionWithCreator = DocumentVersion & {
  creator: Profile;
};
