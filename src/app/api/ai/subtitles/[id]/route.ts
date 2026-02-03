import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/ai/subtitles/[id] - Get a specific subtitle
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get subtitle with video version info
    const { data: subtitle, error } = await adminClient
      .from('video_subtitles')
      .select(`
        *,
        video_version:video_versions(project_id)
      `)
      .eq('id', id)
      .single();

    if (error || !subtitle) {
      return NextResponse.json(
        { error: '자막을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check project access
    const projectId = subtitle.video_version?.project_id;
    if (projectId) {
      const { data: accessCheck } = await adminClient
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .not('joined_at', 'is', null)
        .single();

      const { data: ownerCheck } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .eq('client_id', user.id)
        .single();

      if (!accessCheck && !ownerCheck) {
        return NextResponse.json(
          { error: '접근 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // Check if download format is requested
    const formatParam = request.nextUrl.searchParams.get('format');
    const download = request.nextUrl.searchParams.get('download') === 'true';

    if (download) {
      // Return file download
      const format = formatParam || subtitle.format;
      const content = subtitle.content;
      const contentType =
        format === 'vtt'
          ? 'text/vtt'
          : format === 'json'
          ? 'application/json'
          : 'text/plain';
      const extension = format === 'vtt' ? 'vtt' : format === 'json' ? 'json' : 'srt';

      return new NextResponse(content, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="subtitle_${subtitle.language}.${extension}"`,
        },
      });
    }

    return NextResponse.json({ data: subtitle });
  } catch (error) {
    console.error('[Subtitles] GET error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/subtitles/[id] - Delete a subtitle
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get subtitle to check access
    const { data: subtitle, error: fetchError } = await adminClient
      .from('video_subtitles')
      .select(`
        *,
        video_version:video_versions(project_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !subtitle) {
      return NextResponse.json(
        { error: '자막을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check project access (only project owner or creator can delete)
    const projectId = subtitle.video_version?.project_id;
    if (projectId) {
      const { data: ownerCheck } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .eq('client_id', user.id)
        .single();

      const isCreator = subtitle.created_by === user.id;

      if (!ownerCheck && !isCreator) {
        return NextResponse.json(
          { error: '삭제 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // Delete subtitle (cascade will delete segments)
    const { error: deleteError } = await adminClient
      .from('video_subtitles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Subtitles] Delete error:', deleteError);
      return NextResponse.json(
        { error: '자막 삭제에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '자막이 삭제되었습니다' });
  } catch (error) {
    console.error('[Subtitles] DELETE error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH /api/ai/subtitles/[id] - Update subtitle content (for manual edits)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content가 필요합니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get subtitle to check access
    const { data: subtitle, error: fetchError } = await adminClient
      .from('video_subtitles')
      .select(`
        *,
        video_version:video_versions(project_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !subtitle) {
      return NextResponse.json(
        { error: '자막을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check project access
    const projectId = subtitle.video_version?.project_id;
    if (projectId) {
      const { data: accessCheck } = await adminClient
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .not('joined_at', 'is', null)
        .single();

      const { data: ownerCheck } = await adminClient
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .eq('client_id', user.id)
        .single();

      if (!accessCheck && !ownerCheck) {
        return NextResponse.json(
          { error: '수정 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // Update subtitle content
    const { data: updatedSubtitle, error: updateError } = await adminClient
      .from('video_subtitles')
      .update({
        content,
        is_auto_generated: false, // Mark as manually edited
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Subtitles] Update error:', updateError);
      return NextResponse.json(
        { error: '자막 수정에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedSubtitle });
  } catch (error) {
    console.error('[Subtitles] PATCH error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
