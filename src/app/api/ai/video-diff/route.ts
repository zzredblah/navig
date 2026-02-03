import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import { analyzeVideoDiff, isVideoDiffConfigured } from '@/lib/ai/video-diff';
import { z } from 'zod';

// Request schema
const analyzeSchema = z.object({
  version_id: z.string().uuid(),
  compared_version_id: z.string().uuid(),
});

// POST /api/ai/video-diff - Analyze differences between two video versions
export async function POST(request: NextRequest) {
  try {
    // Check if configured
    if (!isVideoDiffConfigured()) {
      return NextResponse.json(
        { error: 'AI 영상 분석 기능이 설정되지 않았습니다' },
        { status: 503 }
      );
    }

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // Validate request
    const body = await request.json();
    const validationResult = analyzeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { version_id, compared_version_id } = validationResult.data;

    // Same version check
    if (version_id === compared_version_id) {
      return NextResponse.json(
        { error: '같은 버전끼리는 비교할 수 없습니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check AI usage limits
    const usageCheck = await checkAIUsage(user.id, 'video_diff');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason, remaining: 0 },
        { status: 403 }
      );
    }

    // Get both video versions
    const { data: versions, error: versionsError } = await adminClient
      .from('video_versions')
      .select('id, project_id, duration, resolution, file_size, codec, change_notes, thumbnail_url')
      .in('id', [version_id, compared_version_id]);

    if (versionsError || !versions || versions.length !== 2) {
      return NextResponse.json(
        { error: '영상 버전을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const newVersion = versions.find((v) => v.id === version_id);
    const oldVersion = versions.find((v) => v.id === compared_version_id);

    if (!newVersion || !oldVersion) {
      return NextResponse.json(
        { error: '영상 버전을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check same project
    if (newVersion.project_id !== oldVersion.project_id) {
      return NextResponse.json(
        { error: '같은 프로젝트의 영상만 비교할 수 있습니다' },
        { status: 400 }
      );
    }

    // Check project access
    const { data: accessCheck } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', newVersion.project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: ownerCheck } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', newVersion.project_id)
      .eq('client_id', user.id)
      .single();

    if (!accessCheck && !ownerCheck) {
      return NextResponse.json(
        { error: '이 영상에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Check for existing analysis
    const { data: existingAnalysis } = await adminClient
      .from('video_diff_analyses')
      .select('id, status')
      .eq('version_id', version_id)
      .eq('compared_version_id', compared_version_id)
      .single();

    if (existingAnalysis?.status === 'processing') {
      return NextResponse.json(
        { error: '이미 분석이 진행 중입니다' },
        { status: 409 }
      );
    }

    // Create analysis record
    const { data: analysisRecord, error: createError } = await adminClient
      .from('video_diff_analyses')
      .insert({
        version_id,
        compared_version_id,
        status: 'processing',
        model: 'gpt-4o-mini',
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('[Video Diff] Create analysis record error:', createError);
      return NextResponse.json(
        { error: '분석을 시작할 수 없습니다' },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    try {
      // Perform AI analysis
      const detectedChanges = await analyzeVideoDiff(
        {
          duration: oldVersion.duration,
          resolution: oldVersion.resolution,
          file_size: oldVersion.file_size,
          codec: oldVersion.codec,
          change_notes: oldVersion.change_notes,
          thumbnail_url: oldVersion.thumbnail_url,
        },
        {
          duration: newVersion.duration,
          resolution: newVersion.resolution,
          file_size: newVersion.file_size,
          codec: newVersion.codec,
          change_notes: newVersion.change_notes,
          thumbnail_url: newVersion.thumbnail_url,
        }
      );

      const processingTime = Date.now() - startTime;

      // Create markers for detected changes
      const markersToInsert = detectedChanges.map((change) => ({
        version_id,
        compared_version_id,
        type: change.type,
        start_time: change.start_time,
        end_time: change.end_time,
        description: change.description,
        is_ai_generated: true,
        confidence: change.confidence,
        ai_metadata: {
          analysis_id: analysisRecord.id,
          model: 'gpt-4o-mini',
        },
        created_by: user.id,
      }));

      let markers: Array<Record<string, unknown>> = [];
      if (markersToInsert.length > 0) {
        const { data: insertedMarkers, error: markersError } = await adminClient
          .from('video_change_markers')
          .insert(markersToInsert)
          .select(`
            *,
            creator:profiles!created_by(id, name, avatar_url)
          `);

        if (markersError) {
          console.error('[Video Diff] Insert markers error:', markersError);
        } else if (insertedMarkers) {
          markers = insertedMarkers;
        }
      }

      // Update analysis record
      const { data: updatedAnalysis } = await adminClient
        .from('video_diff_analyses')
        .update({
          status: 'completed',
          markers_count: markers.length,
          processing_time_ms: processingTime,
          completed_at: new Date().toISOString(),
        })
        .eq('id', analysisRecord.id)
        .select()
        .single();

      // Record AI usage
      await recordAIUsage(user.id, 'video_diff', {
        version_id,
        compared_version_id,
        markers_count: markers.length,
        processing_time_ms: processingTime,
      });

      return NextResponse.json({
        data: {
          analysis: updatedAnalysis,
          markers,
        },
        remaining: usageCheck.remaining - 1,
      });
    } catch (analysisError) {
      console.error('[Video Diff] Analysis error:', analysisError);

      // Update analysis record with error
      await adminClient
        .from('video_diff_analyses')
        .update({
          status: 'failed',
          error_message:
            analysisError instanceof Error
              ? analysisError.message
              : '알 수 없는 오류',
        })
        .eq('id', analysisRecord.id);

      return NextResponse.json(
        { error: '영상 분석에 실패했습니다' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Video Diff] API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// GET /api/ai/video-diff - Get analysis history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const versionId = request.nextUrl.searchParams.get('version_id');
    const comparedVersionId = request.nextUrl.searchParams.get('compared_version_id');

    if (!versionId) {
      return NextResponse.json(
        { error: 'version_id가 필요합니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Build query
    let query = adminClient
      .from('video_diff_analyses')
      .select('*')
      .eq('version_id', versionId)
      .order('created_at', { ascending: false });

    if (comparedVersionId) {
      query = query.eq('compared_version_id', comparedVersionId);
    }

    const { data: analyses, error } = await query;

    if (error) {
      console.error('[Video Diff] Get analyses error:', error);
      return NextResponse.json(
        { error: '분석 기록 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: analyses || [] });
  } catch (error) {
    console.error('[Video Diff] API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
