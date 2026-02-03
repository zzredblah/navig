import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { SubtitleSegment, SegmentUpdateRequest } from '@/types/subtitle';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/ai/subtitles/[id]/segments - Get all segments for a subtitle
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

    // Get subtitle with project info to check access
    const { data: subtitle, error: subtitleError } = await adminClient
      .from('video_subtitles')
      .select(`
        id,
        video_version:video_versions(project_id)
      `)
      .eq('id', id)
      .single();

    if (subtitleError || !subtitle) {
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

    // Get segments ordered by segment_index
    const { data: segments, error: segmentsError } = await adminClient
      .from('subtitle_segments')
      .select('*')
      .eq('subtitle_id', id)
      .order('segment_index', { ascending: true });

    if (segmentsError) {
      console.error('[Segments] GET error:', segmentsError);
      return NextResponse.json(
        { error: '세그먼트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: segments || [] });
  } catch (error) {
    console.error('[Segments] GET error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// PATCH /api/ai/subtitles/[id]/segments - Batch update segments
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
    const { segments: updates } = body as { segments: SegmentUpdateRequest[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: '수정할 세그먼트가 필요합니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get subtitle with project info to check access
    const { data: subtitle, error: subtitleError } = await adminClient
      .from('video_subtitles')
      .select(`
        id,
        format,
        video_version:video_versions(project_id)
      `)
      .eq('id', id)
      .single();

    if (subtitleError || !subtitle) {
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

    // Update each segment
    const updatePromises = updates.map(async (update) => {
      const { id: segmentId, ...changes } = update;
      if (Object.keys(changes).length === 0) return null;

      const { data, error } = await adminClient
        .from('subtitle_segments')
        .update(changes)
        .eq('id', segmentId)
        .eq('subtitle_id', id) // Ensure segment belongs to this subtitle
        .select()
        .single();

      if (error) {
        console.error('[Segments] Update segment error:', error);
        return null;
      }
      return data;
    });

    await Promise.all(updatePromises);

    // Get all segments after update
    const { data: allSegments, error: fetchError } = await adminClient
      .from('subtitle_segments')
      .select('*')
      .eq('subtitle_id', id)
      .order('segment_index', { ascending: true });

    if (fetchError || !allSegments) {
      return NextResponse.json(
        { error: '세그먼트 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    // Regenerate content based on format
    const content = generateSubtitleContent(allSegments as SubtitleSegment[], subtitle.format);

    // Update subtitle content and mark as manually edited
    const { error: updateError } = await adminClient
      .from('video_subtitles')
      .update({
        content,
        is_auto_generated: false,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Segments] Update subtitle content error:', updateError);
    }

    return NextResponse.json({
      data: allSegments,
      content,
    });
  } catch (error) {
    console.error('[Segments] PATCH error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// Helper function to generate subtitle content from segments
function generateSubtitleContent(
  segments: SubtitleSegment[],
  format: string
): string {
  switch (format) {
    case 'srt':
      return generateSRT(segments);
    case 'vtt':
      return generateVTT(segments);
    case 'json':
      return JSON.stringify(segments.map(s => ({
        start: s.start_time,
        end: s.end_time,
        text: s.text,
      })), null, 2);
    default:
      return generateSRT(segments);
  }
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function generateSRT(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      return `${index + 1}\n${formatSRTTime(segment.start_time)} --> ${formatSRTTime(segment.end_time)}\n${segment.text}`;
    })
    .join('\n\n');
}

function generateVTT(segments: SubtitleSegment[]): string {
  const cues = segments
    .map((segment) => {
      return `${formatVTTTime(segment.start_time)} --> ${formatVTTTime(segment.end_time)}\n${segment.text}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${cues}`;
}
