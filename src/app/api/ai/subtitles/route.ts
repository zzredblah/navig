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

// Request schema
const generateSubtitleSchema = z.object({
  video_version_id: z.string().uuid(),
  language: z.string().length(2).default('ko'),
  format: z.enum(['srt', 'vtt', 'json']).default('srt'),
});

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

    const { video_version_id, language, format } = validationResult.data;
    const adminClient = createAdminClient();

    // Check AI usage limits
    const usageCheck = await checkAIUsage(user.id, 'subtitle_generation');
    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason, remaining: 0 },
        { status: 403 }
      );
    }

    // Get video version and verify access
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

    // Determine which URL to use (prioritize: file_url > stream download)
    // Note: hls_url (HLS stream) cannot be used for Whisper - needs actual file
    let audioSourceUrl: string | null = videoVersion.file_url || null;

    // If no file_url but has stream_video_id, get download URL from Stream API
    if (!audioSourceUrl && videoVersion.stream_video_id) {
      console.log('[Subtitles] Stream video detected, checking download availability...');
      try {
        const downloadResult = await enableDownload(videoVersion.stream_video_id);

        if (downloadResult.ready && downloadResult.url) {
          audioSourceUrl = downloadResult.url;
          console.log('[Subtitles] Stream download URL:', audioSourceUrl);

          // Update DB with download URL
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

    // Fallback to existing download_url if still no URL
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

    console.log('[Subtitles] Final URL:', audioSourceUrl.substring(0, 100));

    // Check project access
    const { data: accessCheck } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', videoVersion.project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: ownerCheck } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', videoVersion.project_id)
      .eq('client_id', user.id)
      .single();

    if (!accessCheck && !ownerCheck) {
      return NextResponse.json(
        { error: '이 영상에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Check if subtitle already exists for this video/language
    const { data: existingSubtitle } = await adminClient
      .from('video_subtitles')
      .select('id, status')
      .eq('video_version_id', video_version_id)
      .eq('language', language)
      .single();

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
    const { data: subtitleRecord, error: createError } = await adminClient
      .from('video_subtitles')
      .insert({
        video_version_id,
        language,
        format,
        content: '',
        status: 'processing',
        is_auto_generated: true,
        created_by: user.id,
        metadata: { model: 'whisper-1' },
      })
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
        video_version_id,
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

// GET /api/ai/subtitles?video_version_id=xxx - Get subtitles for a video
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
    if (!videoVersionId) {
      return NextResponse.json(
        { error: 'video_version_id가 필요합니다' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Get video version to check access
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

    // Check project access
    const { data: accessCheck } = await adminClient
      .from('project_members')
      .select('user_id')
      .eq('project_id', videoVersion.project_id)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single();

    const { data: ownerCheck } = await adminClient
      .from('projects')
      .select('client_id')
      .eq('id', videoVersion.project_id)
      .eq('client_id', user.id)
      .single();

    if (!accessCheck && !ownerCheck) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다' },
        { status: 403 }
      );
    }

    // Get all subtitles for this video
    const { data: subtitles, error } = await adminClient
      .from('video_subtitles')
      .select('*')
      .eq('video_version_id', videoVersionId)
      .order('created_at', { ascending: false });

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
