import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { EditWorkspace } from '@/components/editing/workspace/EditWorkspace';
import type { EditProjectWithDetails, EditMetadata } from '@/types/editing';

interface PageProps {
  params: Promise<{ id: string; editId: string }>;
}

export default async function EditWorkspacePage({ params }: PageProps) {
  const { id: projectId, editId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminClient = createAdminClient();

  // 프로젝트 접근 권한 확인
  const { data: member } = await adminClient
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .not('joined_at', 'is', null)
    .single();

  // 멤버가 아니면 소유자인지 확인
  if (!member) {
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', projectId)
      .single();

    if (!project || project.client_id !== user.id) {
      redirect('/dashboard');
    }
  }

  // owner 또는 editor만 편집 가능
  const role = member?.role || 'owner';
  if (role !== 'owner' && role !== 'editor') {
    redirect(`/projects/${projectId}`);
  }

  // 편집 프로젝트 조회
  const { data: editProject, error } = await adminClient
    .from('edit_projects')
    .select(`
      *,
      creator:profiles!created_by(id, name, avatar_url),
      source_video:video_versions!source_video_id(
        id, version_name, original_filename, thumbnail_url, hls_url, file_url, duration
      )
    `)
    .eq('id', editId)
    .eq('project_id', projectId)
    .single();

  if (error || !editProject) {
    notFound();
  }

  // 타입 변환
  const editProjectData: EditProjectWithDetails = {
    ...editProject,
    edit_metadata: editProject.edit_metadata as unknown as EditMetadata,
    creator: editProject.creator as EditProjectWithDetails['creator'],
    source_video: editProject.source_video as EditProjectWithDetails['source_video'],
  };

  return (
    <EditWorkspace
      editProject={editProjectData}
      projectId={projectId}
    />
  );
}
