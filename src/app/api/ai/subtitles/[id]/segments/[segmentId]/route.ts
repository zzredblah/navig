import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { SubtitleSegment } from '@/types/subtitle';

interface RouteParams {
  params: Promise<{ id: string; segmentId: string }>;
}

// DELETE /api/ai/subtitles/[id]/segments/[segmentId] - Delete a segment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, segmentId } = await params;
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
          { error: '삭제 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // Delete the segment
    const { error: deleteError } = await adminClient
      .from('subtitle_segments')
      .delete()
      .eq('id', segmentId)
      .eq('subtitle_id', id);

    if (deleteError) {
      console.error('[Segment] Delete error:', deleteError);
      return NextResponse.json(
        { error: '세그먼트 삭제에 실패했습니다' },
        { status: 500 }
      );
    }

    // Reindex remaining segments
    const { data: remainingSegments } = await adminClient
      .from('subtitle_segments')
      .select('id')
      .eq('subtitle_id', id)
      .order('segment_index', { ascending: true });

    if (remainingSegments) {
      const reindexPromises = remainingSegments.map((seg, index) =>
        adminClient
          .from('subtitle_segments')
          .update({ segment_index: index })
          .eq('id', seg.id)
      );
      await Promise.all(reindexPromises);
    }

    // Mark subtitle as manually edited
    await adminClient
      .from('video_subtitles')
      .update({ is_auto_generated: false })
      .eq('id', id);

    return NextResponse.json({ message: '세그먼트가 삭제되었습니다' });
  } catch (error) {
    console.error('[Segment] DELETE error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST /api/ai/subtitles/[id]/segments/[segmentId] - Split or merge segment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, segmentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const { action, splitTime, targetSegmentId } = body as {
      action: 'split' | 'merge';
      splitTime?: number;
      targetSegmentId?: string;
    };

    if (!action) {
      return NextResponse.json(
        { error: 'action이 필요합니다 (split 또는 merge)' },
        { status: 400 }
      );
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
          { error: '수정 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    if (action === 'split') {
      if (typeof splitTime !== 'number') {
        return NextResponse.json(
          { error: 'splitTime이 필요합니다' },
          { status: 400 }
        );
      }

      // Get the segment to split
      const { data: segmentData, error: segmentError } = await adminClient
        .from('subtitle_segments')
        .select('*')
        .eq('id', segmentId)
        .eq('subtitle_id', id)
        .single();

      if (segmentError || !segmentData) {
        return NextResponse.json(
          { error: '세그먼트를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      const segment = segmentData as SubtitleSegment;

      // Validate split time
      if (splitTime <= segment.start_time || splitTime >= segment.end_time) {
        return NextResponse.json(
          { error: '분할 시간이 세그먼트 범위를 벗어났습니다' },
          { status: 400 }
        );
      }

      // Split the text (simple approach: split at middle)
      const text = segment.text || '';
      const words = text.split(' ');
      const midPoint = Math.floor(words.length / 2);
      const firstHalf = words.slice(0, midPoint).join(' ');
      const secondHalf = words.slice(midPoint).join(' ');

      // Update original segment (first half)
      await adminClient
        .from('subtitle_segments')
        .update({
          end_time: splitTime,
          text: firstHalf || text,
        })
        .eq('id', segmentId);

      // Shift indices of following segments
      const { data: followingSegments } = await adminClient
        .from('subtitle_segments')
        .select('id, segment_index')
        .eq('subtitle_id', id)
        .gt('segment_index', segment.segment_index)
        .order('segment_index', { ascending: false });

      if (followingSegments) {
        for (const seg of followingSegments) {
          await adminClient
            .from('subtitle_segments')
            .update({ segment_index: seg.segment_index + 1 })
            .eq('id', seg.id);
        }
      }

      // Create new segment (second half)
      const { data: newSegment, error: insertError } = await adminClient
        .from('subtitle_segments')
        .insert({
          subtitle_id: id,
          segment_index: segment.segment_index + 1,
          start_time: splitTime,
          end_time: segment.end_time,
          text: secondHalf || '',
          confidence: segment.confidence,
          speaker: segment.speaker,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Segment] Split insert error:', insertError);
        return NextResponse.json(
          { error: '세그먼트 분할에 실패했습니다' },
          { status: 500 }
        );
      }

      // Mark subtitle as manually edited
      await adminClient
        .from('video_subtitles')
        .update({ is_auto_generated: false })
        .eq('id', id);

      return NextResponse.json({
        message: '세그먼트가 분할되었습니다',
        data: { originalId: segmentId, newSegment },
      });
    }

    if (action === 'merge') {
      if (!targetSegmentId) {
        return NextResponse.json(
          { error: 'targetSegmentId가 필요합니다' },
          { status: 400 }
        );
      }

      // Get both segments
      const { data: segments, error: segmentsError } = await adminClient
        .from('subtitle_segments')
        .select('*')
        .eq('subtitle_id', id)
        .in('id', [segmentId, targetSegmentId])
        .order('segment_index', { ascending: true });

      if (segmentsError || !segments || segments.length !== 2) {
        return NextResponse.json(
          { error: '세그먼트를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      const [firstSegment, secondSegment] = segments;

      // Check if segments are consecutive
      if (secondSegment.segment_index - firstSegment.segment_index !== 1) {
        return NextResponse.json(
          { error: '연속된 세그먼트만 병합할 수 있습니다' },
          { status: 400 }
        );
      }

      // Merge into first segment
      const mergedText = `${firstSegment.text} ${secondSegment.text}`.trim();
      await adminClient
        .from('subtitle_segments')
        .update({
          end_time: secondSegment.end_time,
          text: mergedText,
        })
        .eq('id', firstSegment.id);

      // Delete second segment
      await adminClient
        .from('subtitle_segments')
        .delete()
        .eq('id', secondSegment.id);

      // Reindex following segments
      const { data: followingSegments } = await adminClient
        .from('subtitle_segments')
        .select('id, segment_index')
        .eq('subtitle_id', id)
        .gt('segment_index', secondSegment.segment_index)
        .order('segment_index', { ascending: true });

      if (followingSegments) {
        for (const seg of followingSegments) {
          await adminClient
            .from('subtitle_segments')
            .update({ segment_index: seg.segment_index - 1 })
            .eq('id', seg.id);
        }
      }

      // Mark subtitle as manually edited
      await adminClient
        .from('video_subtitles')
        .update({ is_auto_generated: false })
        .eq('id', id);

      return NextResponse.json({
        message: '세그먼트가 병합되었습니다',
        data: { mergedId: firstSegment.id, deletedId: secondSegment.id },
      });
    }

    return NextResponse.json(
      { error: '알 수 없는 action입니다' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Segment] POST error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
