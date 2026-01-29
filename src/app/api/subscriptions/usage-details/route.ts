/**
 * GET /api/subscriptions/usage-details
 * 상세 사용량 정보 (어디에 사용되었는지)
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient, createUntypedAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // 인증 확인
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 프로젝트 상세 (소유한 프로젝트 + 멤버로 참여한 프로젝트)
    const [ownedProjects, memberProjects] = await Promise.all([
      adminClient
        .from('projects')
        .select('id, title, created_at, status')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false }),
      adminClient
        .from('project_members')
        .select(`
          project:projects(id, title, created_at, status)
        `)
        .eq('user_id', user.id)
        .not('joined_at', 'is', null),
    ]);

    // 중복 제거하여 프로젝트 목록 생성
    const ownedProjectsList = ownedProjects.data || [];
    const memberProjectsList = (memberProjects.data || [])
      .map((m) => m.project)
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const allProjectIds = new Set(ownedProjectsList.map(p => p.id));
    const uniqueMemberProjects = memberProjectsList.filter(p => !allProjectIds.has(p.id));

    const projectsDetail = [
      ...ownedProjectsList.map(p => ({ ...p, role: 'owner' as const })),
      ...uniqueMemberProjects.map(p => ({ ...p, role: 'member' as const })),
    ];

    // 스토리지 상세
    // 1. 영상 파일
    const { data: videoVersions } = await adminClient
      .from('video_versions')
      .select(`
        id,
        file_size,
        original_filename,
        version_name,
        created_at,
        project:projects(id, title)
      `)
      .eq('uploaded_by', user.id)
      .order('file_size', { ascending: false })
      .limit(15);

    const videoStorageItems = (videoVersions || []).map((v) => ({
      id: v.id,
      type: 'video' as const,
      file_name: v.version_name || v.original_filename,
      file_size_mb: Math.round((v.file_size || 0) / (1024 * 1024) * 100) / 100,
      file_size_bytes: v.file_size || 0,
      created_at: v.created_at,
      project_id: v.project?.id,
      project_title: v.project?.title,
    }));

    const videoStorageBytes = (videoVersions || []).reduce(
      (sum, v) => sum + (v.file_size || 0),
      0
    );

    // 2. 채팅 첨부파일
    const untypedClient = createUntypedAdminClient();
    const { data: chatMessagesData } = await untypedClient
      .from('chat_messages')
      .select('id, attachments, created_at, room:chat_rooms(project:projects(id, title))')
      .eq('sender_id', user.id)
      .not('attachments', 'eq', '[]')
      .order('created_at', { ascending: false })
      .limit(20);

    interface ChatAttachment {
      type: string;
      name: string;
      size?: number;
      url: string;
    }

    const chatStorageItems: Array<{
      id: string;
      type: 'chat';
      file_name: string;
      file_size_mb: number;
      file_size_bytes: number;
      created_at: string;
      project_id?: string;
      project_title?: string;
    }> = [];

    let chatStorageBytes = 0;
    if (chatMessagesData) {
      for (const msg of chatMessagesData) {
        const attachments = msg.attachments as ChatAttachment[] | null;
        if (attachments && Array.isArray(attachments)) {
          for (const att of attachments) {
            const sizeBytes = att.size || 0;
            chatStorageBytes += sizeBytes;
            chatStorageItems.push({
              id: `${msg.id}-${att.name}`,
              type: 'chat',
              file_name: att.name || '첨부파일',
              file_size_mb: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
              file_size_bytes: sizeBytes,
              created_at: msg.created_at,
              project_id: (msg.room as { project?: { id?: string; title?: string } })?.project?.id,
              project_title: (msg.room as { project?: { id?: string; title?: string } })?.project?.title,
            });
          }
        }
      }
    }

    // 모든 스토리지 항목 합치고 크기순 정렬
    const allStorageItems = [...videoStorageItems, ...chatStorageItems]
      .sort((a, b) => b.file_size_bytes - a.file_size_bytes)
      .slice(0, 20);

    const totalStorageBytes = videoStorageBytes + chatStorageBytes;

    // 멤버 상세 (프로젝트별 초대한 멤버)
    const { data: membersData } = await adminClient
      .from('project_members')
      .select(`
        id,
        role,
        joined_at,
        user:profiles!project_members_user_id_fkey(id, name, email, avatar_url),
        project:projects!inner(id, title, client_id)
      `)
      .eq('projects.client_id', user.id)
      .neq('user_id', user.id);

    // 프로젝트별로 멤버 그룹화
    const membersByProject: Record<string, {
      project_id: string;
      project_title: string;
      members: Array<{
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        role: string;
        joined: boolean;
      }>;
    }> = {};

    (membersData || []).forEach((m) => {
      const projectId = m.project?.id;
      const projectTitle = m.project?.title;
      if (!projectId || !projectTitle) return;

      if (!membersByProject[projectId]) {
        membersByProject[projectId] = {
          project_id: projectId,
          project_title: projectTitle,
          members: [],
        };
      }

      membersByProject[projectId].members.push({
        id: m.user?.id || '',
        name: m.user?.name || '알 수 없음',
        email: m.user?.email || '',
        avatar_url: m.user?.avatar_url || null,
        role: m.role,
        joined: !!m.joined_at,
      });
    });

    const membersDetail = Object.values(membersByProject);
    const totalMembers = membersDetail.reduce(
      (sum, p) => sum + p.members.length,
      0
    );

    return NextResponse.json({
      data: {
        projects: {
          count: projectsDetail.length,
          items: projectsDetail,
        },
        storage: {
          total_gb: Math.round(totalStorageBytes / (1024 * 1024 * 1024) * 100) / 100,
          total_mb: Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100,
          video_mb: Math.round(videoStorageBytes / (1024 * 1024) * 100) / 100,
          chat_mb: Math.round(chatStorageBytes / (1024 * 1024) * 100) / 100,
          items: allStorageItems,
        },
        members: {
          count: totalMembers,
          by_project: membersDetail,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/subscriptions/usage-details] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
