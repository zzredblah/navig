/**
 * 커뮤니티 게시글 API
 * GET  - 게시글 목록 조회
 * POST - 새 게시글 작성
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

// 쿼리 스키마
const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  tag: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['latest', 'votes', 'unanswered']).optional().default('latest'),
  solved: z.enum(['all', 'solved', 'unsolved']).optional().default('all'),
});

// 게시글 생성 스키마
const createPostSchema = z.object({
  title: z.string().min(5, '제목은 5자 이상 입력해주세요').max(200),
  content: z.string().min(10, '내용은 10자 이상 입력해주세요'),
  tag_ids: z.array(z.string().uuid()).max(5, '태그는 최대 5개까지 선택 가능합니다').optional(),
});

// GET: 게시글 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || undefined,
      solved: searchParams.get('solved') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: '잘못된 쿼리 파라미터입니다' },
        { status: 400 }
      );
    }

    const { page, limit, tag, search, sort, solved } = queryResult.data;
    const offset = (page - 1) * limit;

    // 커뮤니티 테이블은 아직 타입 정의에 없으므로 any 사용
    const adminClient = createAdminClient() as any;

    // 기본 쿼리
    let query = adminClient
      .from('posts')
      .select(
        `
        *,
        author:profiles!author_id(id, name, avatar_url),
        post_tags(
          tag:tags(id, name, color)
        )
      `,
        { count: 'exact' }
      );

    // 태그 필터
    if (tag) {
      const { data: postIds } = await adminClient
        .from('post_tags')
        .select('post_id')
        .eq('tag_id', tag);

      if (postIds && postIds.length > 0) {
        query = query.in('id', postIds.map((p: any) => p.post_id));
      } else {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }
    }

    // 검색
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 해결 상태 필터
    if (solved === 'solved') {
      query = query.eq('is_solved', true);
    } else if (solved === 'unsolved') {
      query = query.eq('is_solved', false);
    }

    // 정렬
    if (sort === 'votes') {
      query = query.order('vote_count', { ascending: false });
    } else if (sort === 'unanswered') {
      query = query.eq('answer_count', 0).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: posts, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[Community Posts GET] 조회 오류:', error);
      return NextResponse.json(
        { error: '게시글 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // 통계 조회 (필터 없는 전체 통계)
    const [
      { count: totalPosts },
      { count: solvedPosts },
      { data: answersData },
    ] = await Promise.all([
      adminClient.from('posts').select('*', { count: 'exact', head: true }),
      adminClient.from('posts').select('*', { count: 'exact', head: true }).eq('is_solved', true),
      adminClient.from('answers').select('id'),
    ]);

    return NextResponse.json({
      data: posts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
      stats: {
        totalPosts: totalPosts || 0,
        solvedPosts: solvedPosts || 0,
        totalAnswers: answersData?.length || 0,
      },
    });
  } catch (error) {
    console.error('[Community Posts GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: 새 게시글 작성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = createPostSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: '유효하지 않은 요청입니다',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, content, tag_ids } = validationResult.data;

    // 커뮤니티 테이블은 아직 타입 정의에 없으므로 any 사용
    const adminClient = createAdminClient() as any;

    // 게시글 생성
    const { data: post, error: insertError } = await adminClient
      .from('posts')
      .insert({
        author_id: user.id,
        title,
        content,
      })
      .select(
        `
        *,
        author:profiles!author_id(id, name, avatar_url)
      `
      )
      .single();

    if (insertError) {
      console.error('[Community Posts POST] 생성 오류:', insertError);
      return NextResponse.json(
        { error: '게시글 작성에 실패했습니다' },
        { status: 500 }
      );
    }

    // 태그 연결
    if (tag_ids && tag_ids.length > 0) {
      const postTags = tag_ids.map((tagId) => ({
        post_id: post.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await adminClient
        .from('post_tags')
        .insert(postTags);

      if (tagError) {
        console.error('[Community Posts POST] 태그 연결 오류:', tagError);
        // 태그 연결 실패해도 게시글은 성공으로 처리
      }
    }

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error('[Community Posts POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
