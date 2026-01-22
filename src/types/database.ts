/**
 * Navig Database Types - Sprint 1-2
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

export type MemberRole = 'owner' | 'editor' | 'viewer';

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
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      member_role: MemberRole;
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

// 확장 타입 (조인된 데이터)
export type ProjectWithClient = Project & {
  client: Profile;
};

export type ProjectMemberWithUser = ProjectMember & {
  user: Profile;
};
