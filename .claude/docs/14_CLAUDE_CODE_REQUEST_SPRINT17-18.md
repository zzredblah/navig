# Claude Code 개발 요청서 - Phase 2 Sprint 17-18

## AI 기능 + 워터마크

**기간**: Week 13-16 (Month 6)
**목표**: AI 음성 피드백, 워터마크 자동 적용, 스마트 알림 다이제스트

---

## 작업 1: 음성 피드백 (Whisper API)

### 요청 내용

```
영상 보면서 음성으로 피드백을 녹음하고 자동으로 텍스트로 변환하는 기능을 구현해주세요.

환경 변수:
OPENAI_API_KEY=sk-...

플로우:
1. 영상 재생 중 🎤 녹음 버튼 클릭
2. 음성 녹음 시작 (현재 타임코드 저장)
3. 녹음 완료 버튼 클릭
4. Whisper API로 텍스트 변환
5. 타임코드 + 텍스트로 피드백 자동 생성

API 엔드포인트:

# 음성 → 텍스트 변환
POST /api/transcribe
- body: FormData { audio: Blob, language?: 'ko' | 'en' | 'ja' }
- response: {
    text: string,
    duration: number,
    language: string,
    confidence?: number
  }

# 음성 피드백 생성 (변환 + 피드백 생성 통합)
POST /api/videos/:videoId/versions/:versionId/voice-feedback
- body: FormData {
    audio: Blob,
    timecode: number,
    language?: string
  }
- response: {
    feedback: Feedback,
    transcription: {
      text: string,
      duration: number
    }
  }

서버 구현:

// app/api/transcribe/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audioFile = formData.get('audio') as Blob;
  const language = formData.get('language') as string || 'ko';

  // Blob → File 변환
  const file = new File([audioFile], 'audio.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: 'json',
  });

  return NextResponse.json({
    text: transcription.text,
    duration: 0, // 클라이언트에서 제공
    language,
  });
}

클라이언트 구현:

// hooks/useVoiceRecorder.ts
import { useState, useRef } from 'react';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      chunksRef.current = [];

      // 스트림 정리
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, audioBlob, startRecording, stopRecording };
}

UI 컴포넌트:

┌─────────────────────────────────────────────────────────────┐
│                      영상 플레이어                          │
│                                                             │
│                    00:15 / 02:30                            │
├─────────────────────────────────────────────────────────────┤
│ 피드백 작성                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 피드백 내용을 입력하세요...                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│   [🎤 음성으로 피드백]        [타임코드: 00:15]  [전송]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

녹음 중 UI:
┌─────────────────────────────────────────────────────────────┐
│                      음성 녹음 중                           │
│                                                             │
│              🔴 00:05                                       │
│                                                             │
│              [■ 녹음 완료]                                  │
│                                                             │
│        영상 타임코드 00:15에서 녹음 시작됨                  │
└─────────────────────────────────────────────────────────────┘

변환 중 UI:
┌─────────────────────────────────────────────────────────────┐
│                      변환 중...                             │
│                                                             │
│                    ◐ 음성을 텍스트로 변환하고 있습니다     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. 마이크 권한 요청 처리
2. 녹음 시간 제한 (최대 2분)
3. 녹음 품질 설정
4. 로딩 상태 표시
5. 에러 핸들링 (권한 거부, API 실패)
6. Pro 플랜 이상만 사용 가능
7. 모바일 지원
```

---

## 작업 2: AI 템플릿 추천

### 요청 내용

```
프로젝트 설명을 분석하여 적합한 문서 템플릿을 추천하는 기능을 구현해주세요.

API 엔드포인트:

# 템플릿 추천
POST /api/ai/recommend-template
- body: {
    project_description: string,
    document_type?: 'work_request' | 'quote' | 'contract'
  }
- response: {
    recommendations: [{
      template_id: string,
      template_name: string,
      template_type: string,
      match_score: number, // 0-100
      reason: string,
      suggested_fields: Record<string, string>
    }],
    analysis: {
      project_type: string,
      keywords: string[],
      complexity: 'simple' | 'medium' | 'complex'
    }
  }

구현:

// GPT를 사용한 분석
const analyzeProject = async (description: string) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 영상 제작 프로젝트 분석 전문가입니다.
          프로젝트 설명을 분석하여 다음 정보를 JSON으로 추출하세요:
          - project_type: 영상 유형 (홍보영상, 제품소개, 교육영상, 뮤직비디오 등)
          - keywords: 핵심 키워드 배열
          - complexity: 프로젝트 복잡도
          - suggested_duration: 예상 제작 기간
          - budget_range: 예상 예산 범위`
      },
      { role: 'user', content: description }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
};

UI:

프로젝트 생성 시 자동 추천:
┌─────────────────────────────────────────────────────────────┐
│ 새 프로젝트                                           [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 프로젝트 설명                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 스타트업 앱 런칭을 위한 30초 홍보 영상 제작.            │ │
│ │ 모바일 앱 사용 화면과 사용자 인터뷰 포함.               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 💡 AI 추천 템플릿                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⭐ 앱 홍보영상 작업요청서 (95% 일치)                    │ │
│ │    모바일 앱 런칭에 최적화된 템플릿                      │ │
│ │                                        [이 템플릿 사용]  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │    IT/스타트업 홍보영상 템플릿 (80% 일치)               │ │
│ │                                        [이 템플릿 사용]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                      [건너뛰기]  [다음]    │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. 프로젝트 생성 시 자동 분석
2. 설명 입력 후 디바운스 (1초)
3. 추천 이유 표시
4. 템플릿 미리보기
5. Pro 플랜 이상만 사용 가능
```

---

## 작업 3: 워터마크 자동 적용

### 요청 내용

```
검토용 영상에 워터마크를 자동으로 적용하는 기능을 구현해주세요.

워터마크 옵션:

interface WatermarkOptions {
  enabled: boolean;
  type: 'logo' | 'text' | 'timecode' | 'combined';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // 0-1
  text?: string; // "검토용 - 무단 배포 금지"
  logo_url?: string;
  show_timecode: boolean;
}

DB 스키마:

-- 프로젝트별 워터마크 설정
ALTER TABLE projects ADD COLUMN watermark_settings JSONB DEFAULT '{
  "enabled": false,
  "type": "text",
  "position": "bottom-right",
  "opacity": 0.5,
  "text": "검토용 - 무단 배포 금지",
  "show_timecode": false
}';

-- 버전별 워터마크 적용 여부
ALTER TABLE video_versions ADD COLUMN has_watermark BOOLEAN DEFAULT FALSE;
ALTER TABLE video_versions ADD COLUMN watermark_url TEXT;

방법 1: Canvas API (클라이언트, 실시간)
- 영상 재생 시 캔버스 오버레이로 워터마크 표시
- 원본 영상은 변경 없음
- 스크린샷 방지 효과

// components/VideoPlayerWithWatermark.tsx
const VideoPlayerWithWatermark = ({ src, watermark }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!watermark.enabled) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const drawWatermark = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 텍스트 워터마크
      if (watermark.text) {
        ctx.globalAlpha = watermark.opacity;
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        const x = getPositionX(watermark.position, canvas.width);
        const y = getPositionY(watermark.position, canvas.height);

        ctx.strokeText(watermark.text, x, y);
        ctx.fillText(watermark.text, x, y);
      }

      // 타임코드
      if (watermark.show_timecode) {
        const timecode = formatTimecode(video.currentTime);
        // 타임코드 그리기
      }

      requestAnimationFrame(drawWatermark);
    };

    video.addEventListener('play', drawWatermark);
    return () => video.removeEventListener('play', drawWatermark);
  }, [watermark]);

  return (
    <div className="relative">
      <video ref={videoRef} src={src} />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
};

방법 2: FFmpeg (서버, 영구 적용)
- 업로드 시 별도 워터마크 버전 생성
- 다운로드 시 워터마크 버전 제공
- Cloudflare Workers + FFmpeg

// 비동기 처리
await queue.add('apply-watermark', {
  version_id: versionId,
  original_url: originalUrl,
  watermark: watermarkSettings,
});

API:

# 워터마크 설정 조회
GET /api/projects/:projectId/watermark
- response: { settings: WatermarkOptions }

# 워터마크 설정 변경
PATCH /api/projects/:projectId/watermark
- body: WatermarkOptions
- response: { settings: WatermarkOptions }

# 워터마크 버전 생성 요청 (Pro)
POST /api/videos/:videoId/versions/:versionId/watermark
- body: WatermarkOptions
- response: { job_id: string, status: 'processing' }

# 워터마크 처리 상태 확인
GET /api/jobs/:jobId
- response: { status: 'processing' | 'completed' | 'failed', result_url?: string }

UI:

프로젝트 설정 > 워터마크
┌─────────────────────────────────────────────────────────────┐
│ 워터마크 설정                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [✓] 검토용 워터마크 활성화                                  │
│                                                             │
│ 워터마크 유형                                               │
│ ○ 텍스트만                                                  │
│ ○ 로고만                                                    │
│ ● 텍스트 + 타임코드                                         │
│                                                             │
│ 텍스트                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 검토용 - 무단 배포 금지                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 위치: [우측 하단 ▼]    투명도: 50%  ═══●═══                │
│                                                             │
│ 미리보기                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │                                                         │ │
│ │                        검토용 - 무단 배포 금지  00:15   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                              [저장]         │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. 실시간 미리보기
2. 원본 영상 보존
3. 다운로드 시 워터마크 적용 여부 선택
4. 모바일 대응
5. 성능 최적화
```

---

## 작업 4: 스마트 알림 다이제스트

### 요청 내용

```
매일 중요 알림을 요약해서 이메일로 발송하는 기능을 구현해주세요.

DB 스키마:

-- 다이제스트 설정
ALTER TABLE notification_settings ADD COLUMN digest_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_settings ADD COLUMN digest_time TIME DEFAULT '09:00:00';
ALTER TABLE notification_settings ADD COLUMN digest_last_sent_at TIMESTAMPTZ;

-- 다이제스트 발송 기록
CREATE TABLE digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  item_count INTEGER,
  email_id TEXT -- Resend/SendGrid 이메일 ID
);

크론 작업:

// Vercel Cron: 매시 0분 실행
// vercel.json
{
  "crons": [{
    "path": "/api/cron/digest",
    "schedule": "0 * * * *"
  }]
}

// app/api/cron/digest/route.ts
export async function GET(request: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentHour = new Date().getHours();

  // 현재 시간대에 다이제스트 받을 사용자 조회
  const { data: users } = await supabase
    .from('notification_settings')
    .select('user_id, profiles(email, name)')
    .eq('digest_enabled', true)
    .eq('digest_time', `${currentHour}:00:00`);

  for (const user of users) {
    await sendDigestEmail(user);
  }

  return NextResponse.json({ processed: users.length });
}

async function sendDigestEmail(user) {
  // 지난 다이제스트 이후 알림 조회
  const lastSent = user.digest_last_sent_at || new Date(0);

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.user_id)
    .gt('created_at', lastSent)
    .order('created_at', { ascending: false })
    .limit(20);

  if (notifications.length === 0) return;

  // 카테고리별 분류
  const urgent = notifications.filter(n => n.type.includes('urgent'));
  const feedbacks = notifications.filter(n => n.type === 'new_feedback');
  const versions = notifications.filter(n => n.type === 'new_version');
  const deadlines = notifications.filter(n => n.type === 'deadline');

  // 이메일 발송
  await resend.emails.send({
    from: 'NAVIG <noreply@navig.app>',
    to: user.profiles.email,
    subject: `📬 NAVIG 일일 요약 - ${format(new Date(), 'M월 d일')}`,
    react: DigestEmailTemplate({
      name: user.profiles.name,
      urgent,
      feedbacks,
      versions,
      deadlines,
    }),
  });

  // 발송 기록
  await supabase
    .from('notification_settings')
    .update({ digest_last_sent_at: new Date() })
    .eq('user_id', user.user_id);
}

이메일 템플릿:

// emails/DigestEmail.tsx
import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components';

export function DigestEmailTemplate({ name, urgent, feedbacks, versions, deadlines }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* 헤더 */}
          <Section style={header}>
            <Text style={logo}>NAVIG</Text>
            <Text style={title}>📬 일일 요약</Text>
            <Text style={date}>{format(new Date(), 'yyyy년 M월 d일')}</Text>
          </Section>

          <Hr />

          {/* 긴급 */}
          {urgent.length > 0 && (
            <Section>
              <Text style={sectionTitle}>🔥 긴급</Text>
              {urgent.map(item => (
                <Link href={item.link} style={itemLink}>
                  {item.title}
                </Link>
              ))}
            </Section>
          )}

          {/* 새 피드백 */}
          {feedbacks.length > 0 && (
            <Section>
              <Text style={sectionTitle}>💬 새 피드백 ({feedbacks.length})</Text>
              {feedbacks.slice(0, 5).map(item => (
                <Link href={item.link} style={itemLink}>
                  {item.title}
                </Link>
              ))}
            </Section>
          )}

          {/* 새 버전 */}
          {versions.length > 0 && (
            <Section>
              <Text style={sectionTitle}>📹 새 버전 ({versions.length})</Text>
              {versions.slice(0, 5).map(item => (
                <Link href={item.link} style={itemLink}>
                  {item.title}
                </Link>
              ))}
            </Section>
          )}

          {/* 마감 임박 */}
          {deadlines.length > 0 && (
            <Section>
              <Text style={sectionTitle}>⏰ 마감 임박</Text>
              {deadlines.map(item => (
                <Link href={item.link} style={itemLink}>
                  {item.title}
                </Link>
              ))}
            </Section>
          )}

          <Hr />

          {/* 푸터 */}
          <Section style={footer}>
            <Link href={`${baseUrl}/settings/notifications`}>
              알림 설정 변경
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

설정 UI:

알림 설정에 다이제스트 옵션 추가:
┌─────────────────────────────────────────────────────────────┐
│ 알림 설정                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 이메일 알림                                                 │
│ [✓] 새 피드백                                               │
│ [✓] 긴급 피드백                                             │
│ [✓] 새 영상 버전                                            │
│ [✓] 마감 알림                                               │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 일일 요약 (다이제스트)                                      │
│ [✓] 매일 요약 이메일 받기                                   │
│                                                             │
│ 수신 시간                                                   │
│ [오전 9시 ▼]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. Resend 또는 SendGrid 연동
2. React Email 템플릿
3. 타임존 처리 (KST 기준)
4. 중복 발송 방지
5. 발송 실패 재시도
6. 구독 해지 링크
```

---

## 작업 5: AI 기능 통합 및 제한

### 요청 내용

```
AI 기능들을 통합하고 플랜별 사용 제한을 적용해주세요.

AI 기능 목록:
1. 음성 피드백 (Whisper)
2. 템플릿 추천 (GPT)
3. 향후: 피드백 요약, 차이점 감지

사용량 추적:

-- AI 사용량 테이블
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  feature VARCHAR(100) NOT NULL, -- 'voice_feedback', 'template_recommend', 'feedback_summary'
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user_date ON ai_usage(user_id, created_at);

플랜별 제한:

const AI_LIMITS = {
  free: {
    enabled: false,
    monthly_requests: 0,
  },
  pro: {
    enabled: true,
    monthly_requests: 100, // 월 100회
  },
  team: {
    enabled: true,
    monthly_requests: -1, // 무제한
  },
};

사용량 체크:

// lib/ai-usage.ts
export async function checkAIUsage(userId: string, feature: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset_at: Date;
}> {
  const limits = await getUserAILimits(userId);

  if (!limits.enabled) {
    return { allowed: false, remaining: 0, reset_at: new Date() };
  }

  if (limits.monthly_requests === -1) {
    return { allowed: true, remaining: -1, reset_at: new Date() };
  }

  const startOfMonth = startOfMonth(new Date());
  const { count } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth);

  const remaining = limits.monthly_requests - count;

  return {
    allowed: remaining > 0,
    remaining,
    reset_at: endOfMonth(new Date()),
  };
}

// 사용량 기록
export async function recordAIUsage(
  userId: string,
  feature: string,
  tokensUsed: number
) {
  const costPerToken = 0.00001; // 예시 비용

  await supabase.from('ai_usage').insert({
    user_id: userId,
    feature,
    tokens_used: tokensUsed,
    cost_usd: tokensUsed * costPerToken,
  });
}

UI - 사용량 표시:

설정 > AI 기능
┌─────────────────────────────────────────────────────────────┐
│ AI 기능                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 현재 플랜: Pro                                              │
│                                                             │
│ 이번 달 사용량                                              │
│ ████████░░░░░░░░░░░░  45 / 100회                           │
│                                                             │
│ 다음 리셋: 2월 1일                                          │
│                                                             │
│ ─────────────────────────────────────────────────────────  │
│                                                             │
│ 사용 가능한 AI 기능                                         │
│                                                             │
│ ✓ 음성 피드백                                               │
│   영상 보면서 음성으로 피드백 작성                          │
│                                                             │
│ ✓ AI 템플릿 추천                                            │
│   프로젝트에 맞는 문서 템플릿 추천                          │
│                                                             │
│ ✓ 피드백 요약 (출시 예정)                                   │
│   긴 피드백 스레드 자동 요약                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘

요구사항:
1. 모든 AI API 호출 시 사용량 체크
2. 제한 초과 시 업그레이드 유도
3. 사용량 대시보드
4. 비용 추적 (내부용)
```

---

## 참조 파일

- `rules/CODING_STANDARDS.md` - 코딩 컨벤션
- `rules/DESIGN_SYSTEM.md` - 디자인 시스템
- `10_NAVIG_PRD_PHASE2-3_UNIFIED.md` - 통합 PRD 섹션 2.4
- OpenAI API 문서: https://platform.openai.com/docs/
- Resend 문서: https://resend.com/docs

---

## 완료 기준

### 기능 체크리스트

**음성 피드백**
- [ ] 마이크 녹음 기능
- [ ] Whisper API 연동
- [ ] 피드백 자동 생성
- [ ] 권한 처리
- [ ] 모바일 지원

**AI 템플릿 추천**
- [ ] GPT 분석 API
- [ ] 추천 UI
- [ ] 템플릿 미리보기

**워터마크**
- [ ] Canvas 오버레이
- [ ] 설정 UI
- [ ] 실시간 미리보기
- [ ] 프로젝트별 설정

**알림 다이제스트**
- [ ] 크론 작업 설정
- [ ] 이메일 템플릿
- [ ] 설정 UI
- [ ] 발송 로그

**AI 통합**
- [ ] 사용량 추적 테이블
- [ ] 플랜별 제한
- [ ] 사용량 대시보드

### 품질 체크리스트

- [ ] API 에러 핸들링
- [ ] 사용량 정확성
- [ ] 이메일 테스트
- [ ] 성능 최적화
