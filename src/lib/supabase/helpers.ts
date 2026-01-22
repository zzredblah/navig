import { SupabaseClient } from '@supabase/supabase-js';
import {
  Database,
  TablesInsert,
  TablesUpdate,
  ProjectStatus,
} from '@/types/database';

type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Supabase 헬퍼 함수 - Sprint 1-2
 */

// ============================================
// Profile Helpers
// ============================================

export async function getProfile(supabase: TypedSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getCurrentProfile(supabase: TypedSupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return getProfile(supabase, user.id);
}

export async function updateProfile(
  supabase: TypedSupabaseClient,
  userId: string,
  updates: TablesUpdate<'profiles'>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Project Helpers
// ============================================

export async function getProjects(
  supabase: TypedSupabaseClient,
  options?: {
    status?: ProjectStatus;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('projects')
    .select('*, client:profiles!projects_client_id_fkey(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.search) {
    query = query.ilike('title', `%${options.search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

export async function getProject(supabase: TypedSupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, client:profiles!projects_client_id_fkey(*)')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

export async function createProject(
  supabase: TypedSupabaseClient,
  project: TablesInsert<'projects'>
) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select('*, client:profiles!projects_client_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  supabase: TypedSupabaseClient,
  projectId: string,
  updates: TablesUpdate<'projects'>
) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select('*, client:profiles!projects_client_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(supabase: TypedSupabaseClient, projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) throw error;
}

// ============================================
// Project Member Helpers
// ============================================

export async function getProjectMembers(
  supabase: TypedSupabaseClient,
  projectId: string
) {
  const { data, error } = await supabase
    .from('project_members')
    .select('*, user:profiles!project_members_user_id_fkey(*)')
    .eq('project_id', projectId)
    .order('invited_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addProjectMember(
  supabase: TypedSupabaseClient,
  member: TablesInsert<'project_members'>
) {
  const { data, error } = await supabase
    .from('project_members')
    .insert(member)
    .select('*, user:profiles!project_members_user_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectMember(
  supabase: TypedSupabaseClient,
  memberId: string,
  updates: TablesUpdate<'project_members'>
) {
  const { data, error } = await supabase
    .from('project_members')
    .update(updates)
    .eq('id', memberId)
    .select('*, user:profiles!project_members_user_id_fkey(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function removeProjectMember(
  supabase: TypedSupabaseClient,
  memberId: string
) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function findUserByEmail(
  supabase: TypedSupabaseClient,
  email: string
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}
