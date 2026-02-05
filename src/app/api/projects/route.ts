import { createAdminClient } from '@/lib/supabase/server';
import { createProjectSchema, projectQuerySchema } from '@/lib/validations/project';
import { checkUsage } from '@/lib/usage/checker';
import { ActivityLogger } from '@/lib/activity/logger';
import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  getUserAccessibleProjectIds,
  handleError,
  handleZodError,
} from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any; // chat_rooms, chat_room_members 테이블 타입 미정의로 any 사용

// 프로젝트 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const queryResult = projectQuerySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    });

    if (!queryResult.success) {
      return handleZodError(queryResult.error);
    }

    const { page, limit, search, status } = queryResult.data;
    const offset = (page - 1) * limit;

    // 사용자가 접근 가능한 모든 프로젝트 ID 조회
    const allProjectIds = await getUserAccessibleProjectIds(user!.id);

    if (allProjectIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // 프로젝트 목록 쿼리 빌드
    const adminClient = createAdminClient();
    let query = adminClient
      .from('projects')
      .select('*, project_members(user_id, role)', { count: 'exact' })
      .in('id', allProjectIds)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: projects, error: queryError, count } = await query
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('[Projects API] 조회 실패:', queryError);
      return NextResponse.json(
        { error: '프로젝트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (error) {
    return handleError(error, 'Projects API GET');
  }
}

// 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // 사용량 제한 체크
    const usageCheck = await checkUsage(user!.id, 'create_project');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.message || '프로젝트 생성 제한에 도달했습니다',
          code: 'USAGE_LIMIT_EXCEEDED',
          current: usageCheck.current,
          limit: usageCheck.limit,
          upgrade_required: usageCheck.upgrade_required,
        },
        { status: 403 }
      );
    }

    // Admin 클라이언트 사용 (RLS 우회)
    const adminClient = createAdminClient();

    // 프로젝트 생성
    const { data: project, error: createError } = await adminClient
      .from('projects')
      .insert({
        title: validatedData.title,
        description: validatedData.description || null,
        client_id: user!.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Projects API] 프로젝트 생성 실패:', createError);
      return NextResponse.json(
        { error: `프로젝트 생성에 실패했습니다: ${createError.message}` },
        { status: 400 }
      );
    }

    // 생성자를 owner로 project_members에 추가 (즉시 참여 상태)
    const { error: memberError } = await adminClient
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user!.id,
        role: 'owner',
        joined_at: new Date().toISOString(), // 소유자는 즉시 참여 상태
      });

    if (memberError) {
      console.error('[Projects API] 멤버 추가 실패:', memberError);
    }

    // 프로젝트 채팅방 자동 생성
    const chatClient = adminClient as AdminClient;
    const { data: chatRoom, error: chatRoomError } = await chatClient
      .from('chat_rooms')
      .insert({
        type: 'project',
        project_id: project.id,
        name: project.title,
      })
      .select()
      .single();

    if (chatRoomError) {
      console.error('[Projects API] 채팅방 생성 실패:', chatRoomError);
    } else if (chatRoom) {
      // 소유자를 채팅방 멤버로 추가
      const { error: chatMemberError } = await chatClient
        .from('chat_room_members')
        .insert({
          room_id: chatRoom.id,
          user_id: user!.id,
        });

      if (chatMemberError) {
        console.error('[Projects API] 채팅방 멤버 추가 실패:', chatMemberError);
      }
    }

    // 활동 로그 기록
    await ActivityLogger.logProjectCreated(project.id, user!.id, project.title);

    return NextResponse.json({
      message: '프로젝트가 생성되었습니다',
      data: { project },
    }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Projects API POST');
  }
}
