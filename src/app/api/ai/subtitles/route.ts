import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkAIUsage, recordAIUsage } from '@/lib/ai/usage';
import {
  transcribeAudio,
  segmentsToSRT,
  segmentsToVTT,
  segmentsToJSON,
  calculateAverageConfidence,
  countWords,
  isWhisperConfigured,
} from '@/lib/ai/whisper';
import { z } from 'zod';
import { sanitizeStreamUrl, enableDownload } from '@/lib/cloudflare/stream';

// Request schema - video_version_id 또는 edit_project_id 중 하나 필수
const generateSubtitleSchema = z.object({
  video_version_id: z.string().uuid().optional(),
  edit_project_id: z.string().uuid().optional(),
  language: z.string().length(2).default('ko'),
  format: z.enum(['srt', 'vtt', 'json']).default('srt'),
}).refine(
  (data) => data.video_version_id || data.edit_project_id,
  { message: 'video_version_id 또는 edit_project_id 중 하나가 필요합니다' }
);

// POST /api/ai/subtitles - Generate subtitles for a video
export async function POST(request: NextRequest) {
  try {
    // Check if Whisper is configured
    if (!isWhisperConfigured()) {
      return NextResponse.json(
        { error: 'AI 자막 생성 기능이 설정되지 않았습니다' },
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

    // Validate request body
    const body = await request.json();
    const validationResult = generateSubtitleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: '잘못된 요청입니다', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { video_version_id, edit_project_id, language, format } = validationResult.data;
    const adminClient = createAdminClient();

    // Check AI usage limits
    const usageCheck = await checkAIUsage(user.id, 'subtitle_generation');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason, remaining: 0 },
        { status: 403 }
      );
    }

    let audioSourceUrl: string | null = null;
    let projectId: string | null = null;

    // Case 1: video_version_id가 제공된 경우 (기존 영상 피드백 페이지)
    if (video_version_id) {
      const { data: videoVersion, error: videoError } = await adminClient
        .from('video_versions')
        .select('id, project_id, file_url, download_url, hls_url, stream_video_id, file_size, duration')
        .eq('id', video_version_id)
        .single();

      if (videoError || !videoVersion) {
        return NextResponse.json(
          { error: '영상을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      projectId = videoVersion.project_id;

      // Determine which URL to use (prioritize: file_url > stream download)
      audioSourceUrl = videoVersion.file_url || null;

      // If no file_url but has stream_video_id, get download URL from Stream API
      if (!audioSourceUrl && videoVersion.stream_video_id) {
        console.log('[Subtitles] Stream video detected, checking download availability...');
        try {
          const downloadResult = await enableDownload(videoVersion.stream_video_id);

          if (downloadResult.ready && downloadResult.url) {
            audioSourceUrl = downloadResult.url;
            console.log('[Subtitles] Stream download URL:', audioSourceUrl);

            await adminClient
              .from('video_versions')
              .update({ download_url: audioSourceUrl })
              .eq('id', video_version_id);
          } else {
            console.log('[Subtitles] Stream download not ready yet');
          }
        } catch (streamError) {
          console.error('[Subtitles] Failed to get Stream download:', streamError);
        }
      }

      // Fallback to existing download_url
      if (!audioSourceUrl && videoVersion.download_url) {
        audioSourceUrl = sanitizeStreamUrl(videoVersion.download_url) || videoVersion.download_url;
      }

      if (!audioSourceUrl) {
        return NextResponse.json(
          {
            error: '자막 생성을 위한 영상 파일을 가져올 수 없습니다.',
            details: videoVersion.stream_video_id
              ? 'Cloudflare Stream 다운로드가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.'
              : '이 영상은 원본 파일이 없습니다.'
          },
          { status: 400 }
        );
      }
    }
    // Case 2: edit_project_id가 제공된 경우 (편집 워크스페이스)
    else if (edit_project_id) {
      const { data: editProject, error: editError } = await adminClient
        .from('edit_projects')
        .select(`
          id, project_id, source_url, source_video_id, created_by,
          source_video:video_versions!source_video_id(file_url, download_url, hls_url, stream_video_id)
        `)
        .eq('id', edit_project_id)
        .single();

      if (editError || !editProject) {
        return NextResponse.json(
          { error: '편집 프로젝트를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      projectId = editProject.project_id;

      // source_video가 있으면 해당 영상의 URL 사용
      if (editProject.source_video) {
        const sv = editProject.source_video as {
          file_url?: string;
          download_url?: string;
          hls_url?: string;
          stream_video_id?: string;
        };
        audioSourceUrl = sv.file_url || sv.download_url || null;

        // Stream 다운로드 시도
        if (!audioSourceUrl && sv.stream_video_id) {
          try {
            const downloadResult = await enableDownload(sv.stream_video_id);
            if (downloadResult.ready && downloadResult.url) {
              audioSourceUrl = downloadResult.url;
            }
          } catch (streamError) {
            console.error('[Subtitles] Failed to get Stream download:', streamError);
          }
        }
      }

      // source_url (직접 업로드)이 있으면 사용
      if (!audioSourceUrl && editProject.source_url) {
        audioSourceUrl = editProject.source_url;
      }

      if (!audioSourceUrl) {
        return NextResponse.json(
          { error: '자막 생성을 위한 영상 파일이 없습니다. 먼저 영상을 업로드해주세요.' },
          { status: 400 }
        );
      }

      // 편집 프로젝트 생성자만 접근 가능
      if (editProject.created_by !== user.id) {
        // 프로젝트 멤버/소유자 체크
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
            { error: '이 편집 프로젝트에 접근할 권한이 없습니다' },
            { status: 403 }
          );
        }
      }
    }

    console.log('[Subtitles] Final URL:', audioSourceUrl?.substring(0, 100));

    // Check project access (video_version_id인 경우만 - edit_project_id는 위에서 체크)
    if (video_version_id && projectId) {
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
          { error: '이 영상에 접근할 권한이 없습니다' },
          { status: 403 }
        );
      }
    }

    // Check if subtitle already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let existingSubtitleQuery: any = adminClient
      .from('video_subtitles')
      .select('id, status')
      .eq('language', language);

    if (video_version_id) {
      existingSubtitleQuery = existingSubtitleQuery.eq('video_version_id', video_version_id);
    } else if (edit_project_id) {
      existingSubtitleQuery = existingSubtitleQuery.eq('edit_project_id', edit_project_id);
    }

    const { data: existingSubtitle } = await existingSubtitleQuery.single();

    if (existingSubtitle) {
      if (existingSubtitle.status === 'processing') {
        return NextResponse.json(
          { error: '자막이 이미 생성 중입니다' },
          { status: 409 }
        );
      }
      // Delete existing to regenerate
      await adminClient
        .from('video_subtitles')
        .delete()
        .eq('id', existingSubtitle.id);
    }

    // Create subtitle record with processing status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: Record<string, any> = {
      language,
      format,
      content: '',
      status: 'processing',
      is_auto_generated: true,
      created_by: user.id,
      metadata: { model: 'whisper-1' },
    };

    if (video_version_id) {
      insertData.video_version_id = video_version_id;
    }
    if (edit_project_id) {
      insertData.edit_project_id = edit_project_id;
    }

    const { data: subtitleRecord, error: createError } = await adminClient
      .from('video_subtitles')
      .insert(insertData as never)
      .select()
      .single();

    if (createError) {
      console.error('[Subtitles] Create record error:', createError);
      return NextResponse.json(
        { error: '자막 생성을 시작할 수 없습니다' },
        { status: 500 }
      );
    }

    // Start async processing
    const startTime = Date.now();

    try {
      console.log('[Subtitles] Fetching video from:', audioSourceUrl);

      // Fetch video/audio file with retry for Stream downloads
      let audioResponse: Response | null = null;
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          audioResponse = await fetch(audioSourceUrl, {
            headers: {
              'User-Agent': 'NAVIG-Server/1.0',
            },
          });

          if (audioResponse.ok) {
            break; // Success
          }

          // If 404 on Stream download URL, wait and retry (download might be generating)
          if (audioResponse.status === 404 && audioSourceUrl.includes('cloudflarestream.com') && attempt < maxRetries) {
            console.log(`[Subtitles] Download not ready, retrying in ${retryDelay}ms... (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }

          throw new Error(`영상 파일을 불러올 수 없습니다 (HTTP ${audioResponse.status})`);
        } catch (fetchError) {
          if (attempt === maxRetries) {
            console.error('[Subtitles] Fetch error:', fetchError);
            throw new Error(`영상 파일 다운로드 실패: ${fetchError instanceof Error ? fetchError.message : 'Unknown'}`);
          }
          console.log(`[Subtitles] Fetch failed, retrying... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (!audioResponse || !audioResponse.ok) {
        throw new Error('영상 파일을 불러올 수 없습니다. Cloudflare Stream 다운로드가 아직 준비되지 않았을 수 있습니다. 잠시 후 다시 시도해주세요.');
      }

      const arrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      console.log('[Subtitles] Video buffer size:', audioBuffer.length, 'bytes');

      if (audioBuffer.length === 0) {
        throw new Error('영상 파일이 비어있습니다');
      }

      if (audioBuffer.length > 25 * 1024 * 1024) {
        throw new Error('파일 크기가 25MB를 초과합니다. Whisper API 제한입니다.');
      }

      // Transcribe using Whisper
      console.log('[Subtitles] Starting Whisper transcription...');
      const transcription = await transcribeAudio(audioBuffer, {
        language,
        response_format: 'verbose_json',
      });

      console.log('[Subtitles] Transcription completed, segments:', transcription.segments?.length || 0);

      // Validate transcription result
      if (!transcription || !transcription.segments) {
        throw new Error('자막 변환 결과가 비어있습니다');
      }

      // Convert to requested format
      let content: string;
      switch (format) {
        case 'vtt':
          content = segmentsToVTT(transcription.segments);
          break;
        case 'json':
          content = segmentsToJSON(transcription.segments);
          break;
        case 'srt':
        default:
          content = segmentsToSRT(transcription.segments);
          break;
      }

      const processingTime = Date.now() - startTime;
      const confidenceScore = calculateAverageConfidence(transcription.segments);
      const wordCount = countWords(transcription.text);

      // Update subtitle record
      const { data: updatedSubtitle, error: updateError } = await adminClient
        .from('video_subtitles')
        .update({
          content,
          duration_seconds: Math.round(transcription.duration),
          word_count: wordCount,
          confidence_score: confidenceScore,
          status: 'completed',
          metadata: {
            model: 'whisper-1',
            processing_time_ms: processingTime,
            detected_language: transcription.language,
            segment_count: transcription.segments.length,
          },
        })
        .eq('id', subtitleRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Subtitles] Update error:', updateError);
        throw new Error('자막 저장에 실패했습니다');
      }

      // Save individual segments
      if (transcription.segments.length > 0) {
        const segmentInserts = transcription.segments.map((seg, index) => ({
          subtitle_id: subtitleRecord.id,
          segment_index: index,
          start_time: seg.start,
          end_time: seg.end,
          text: seg.text.trim(),
          confidence: Math.exp(seg.avg_logprob),
        }));

        await adminClient.from('subtitle_segments').insert(segmentInserts);
      }

      // Record AI usage
      await recordAIUsage(user.id, 'subtitle_generation', {
        video_version_id: video_version_id || null,
        edit_project_id: edit_project_id || null,
        language,
        format,
        duration_seconds: transcription.duration,
        processing_time_ms: processingTime,
      });

      return NextResponse.json({
        data: updatedSubtitle,
        remaining: usageCheck.remaining - 1,
      });
    } catch (processingError) {
      const errorMessage = processingError instanceof Error ? processingError.message : '알 수 없는 오류';
      console.error('[Subtitles] Processing error:', errorMessage, processingError);

      // Update record with error status
      await adminClient
        .from('video_subtitles')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', subtitleRecord.id);

      return NextResponse.json(
        { error: '자막 생성에 실패했습니다', details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Subtitles] API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// GET /api/ai/subtitles?video_version_id=xxx OR ?edit_project_id=xxx
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

    const videoVersionId = request.nextUrl.searchParams.get('video_version_id');
    const editProjectId = request.nextUrl.searchParams.get('edit_project_id');

    if (!videoVersionId && !editProjectId) {
      return NextResponse.json(
        { error: 'video_version_id 또는 edit_project_id가 필요합니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    let projectId: string | null = null;

    // Case 1: video_version_id로 조회
    if (videoVersionId) {
      const { data: videoVersion } = await adminClient
        .from('video_versions')
        .select('project_id')
        .eq('id', videoVersionId)
        .single();

      if (!videoVersion) {
        return NextResponse.json(
          { error: '영상을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      projectId = videoVersion.project_id;
    }
    // Case 2: edit_project_id로 조회
    else if (editProjectId) {
      const { data: editProject } = await adminClient
        .from('edit_projects')
        .select('project_id, created_by')
        .eq('id', editProjectId)
        .single();

      if (!editProject) {
        return NextResponse.json(
          { error: '편집 프로젝트를 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      projectId = editProject.project_id;

      // 편집 프로젝트 생성자는 바로 접근 가능
      if (editProject.created_by === user.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subtitles, error } = await (adminClient
          .from('video_subtitles')
          .select('*') as any)
          .eq('edit_project_id', editProjectId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Subtitles] Get error:', error);
          return NextResponse.json(
            { error: '자막 조회에 실패했습니다' },
            { status: 500 }
          );
        }

        return NextResponse.json({ data: subtitles });
      }
    }

    // Check project access
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

    // Get subtitles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = adminClient
      .from('video_subtitles')
      .select('*')
      .order('created_at', { ascending: false });

    if (videoVersionId) {
      query = query.eq('video_version_id', videoVersionId);
    } else if (editProjectId) {
      query = query.eq('edit_project_id', editProjectId);
    }

    const { data: subtitles, error } = await query;

    if (error) {
      console.error('[Subtitles] Get error:', error);
      return NextResponse.json(
        { error: '자막 조회에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: subtitles });
  } catch (error) {
    console.error('[Subtitles] API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
