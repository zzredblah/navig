/**
 * AI 영상 차이점 감지 라이브러리
 *
 * OpenAI Vision API를 사용하여 두 영상 버전 간의 차이점을 분석합니다.
 */

import OpenAI from 'openai';
import type { AIDetectedChange, ChangeMarkerType } from '@/types/video-diff';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI 영상 차이점 감지가 설정되었는지 확인
 */
export function isVideoDiffConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

interface VideoMetadata {
  duration: number | null;
  resolution: string | null;
  file_size: number;
  codec: string | null;
  change_notes: string;
}

interface ThumbnailPair {
  timestamp: number;
  oldThumbnail: string | null;
  newThumbnail: string | null;
}

/**
 * 영상 메타데이터 기반 차이점 분석
 * (빠른 분석, 기본 변경사항 감지)
 */
export async function analyzeMetadataDiff(
  oldVideo: VideoMetadata,
  newVideo: VideoMetadata
): Promise<AIDetectedChange[]> {
  const changes: AIDetectedChange[] = [];

  // 영상 길이 변경 감지
  if (oldVideo.duration && newVideo.duration) {
    const durationDiff = Math.abs(newVideo.duration - oldVideo.duration);
    if (durationDiff > 1) {
      // 1초 이상 차이
      changes.push({
        type: 'other',
        start_time: 0,
        end_time: Math.min(oldVideo.duration, newVideo.duration),
        description:
          durationDiff > 0
            ? `영상 길이가 ${formatDuration(durationDiff)} ${newVideo.duration > oldVideo.duration ? '증가' : '감소'}했습니다.`
            : '',
        confidence: 1.0,
      });
    }
  }

  // 해상도 변경 감지
  if (oldVideo.resolution !== newVideo.resolution) {
    changes.push({
      type: 'visual',
      start_time: 0,
      end_time: newVideo.duration || 0,
      description: `해상도가 ${oldVideo.resolution || '알 수 없음'}에서 ${newVideo.resolution || '알 수 없음'}으로 변경되었습니다.`,
      confidence: 1.0,
    });
  }

  // 파일 크기 변화 분석 (코덱/품질 변경 가능성)
  const sizeDiffPercent = Math.abs(
    ((newVideo.file_size - oldVideo.file_size) / oldVideo.file_size) * 100
  );
  if (sizeDiffPercent > 20) {
    // 20% 이상 변화
    changes.push({
      type: 'other',
      start_time: 0,
      end_time: newVideo.duration || 0,
      description: `파일 크기가 ${sizeDiffPercent.toFixed(0)}% ${newVideo.file_size > oldVideo.file_size ? '증가' : '감소'}했습니다. 인코딩 품질 또는 컨텐츠 변경이 있을 수 있습니다.`,
      confidence: 0.8,
    });
  }

  return changes;
}

/**
 * 변경 노트 기반 AI 분석
 * OpenAI를 사용하여 변경 노트에서 구체적인 변경사항 추출
 */
export async function analyzeChangeNotes(
  oldNotes: string,
  newNotes: string,
  videoDuration: number
): Promise<AIDetectedChange[]> {
  if (!isVideoDiffConfigured() || !newNotes?.trim()) {
    return [];
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 영상 편집 변경사항을 분석하는 전문가입니다.
사용자가 제공하는 변경 노트를 분석하여 구체적인 변경사항 목록을 추출해주세요.

각 변경사항에 대해 다음 정보를 JSON 형식으로 반환해주세요:
- type: 'visual' (영상/화면), 'audio' (오디오/음성), 'text' (텍스트/자막), 'effect' (효과/트랜지션), 'other' (기타) 중 하나
- description: 변경사항 설명 (한국어, 1-2문장)
- time_hint: 변경이 발생한 시간대에 대한 힌트 ('전체', '시작부분', '중간', '끝부분', 또는 '불명확')
- confidence: 확신도 (0.0 ~ 1.0)

JSON 배열 형식으로만 응답해주세요.`,
        },
        {
          role: 'user',
          content: `영상 변경 노트를 분석해주세요.

영상 총 길이: ${formatDuration(videoDuration)}

이전 버전 노트:
${oldNotes || '(없음)'}

현재 버전 노트:
${newNotes}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const items = parsed.changes || parsed.items || (Array.isArray(parsed) ? parsed : []);

    return items.map(
      (item: {
        type?: string;
        description?: string;
        time_hint?: string;
        confidence?: number;
      }) => {
        // 시간 힌트를 실제 시간으로 변환
        let startTime = 0;
        let endTime = videoDuration;

        switch (item.time_hint) {
          case '시작부분':
            startTime = 0;
            endTime = videoDuration * 0.3;
            break;
          case '중간':
            startTime = videoDuration * 0.3;
            endTime = videoDuration * 0.7;
            break;
          case '끝부분':
            startTime = videoDuration * 0.7;
            endTime = videoDuration;
            break;
        }

        return {
          type: validateChangeType(item.type),
          start_time: startTime,
          end_time: endTime,
          description: item.description || '',
          confidence: item.confidence || 0.7,
        };
      }
    );
  } catch (error) {
    console.error('[Video Diff] AI 분석 실패:', error);
    return [];
  }
}

/**
 * 썸네일/프레임 이미지 기반 시각적 차이점 분석
 * OpenAI Vision API 사용
 */
export async function analyzeVisualDiff(
  thumbnailPairs: ThumbnailPair[],
  videoDuration: number
): Promise<AIDetectedChange[]> {
  if (!isVideoDiffConfigured() || thumbnailPairs.length === 0) {
    return [];
  }

  const changes: AIDetectedChange[] = [];

  // 이미지가 있는 페어만 필터링
  const validPairs = thumbnailPairs.filter(
    (p) => p.oldThumbnail && p.newThumbnail
  );

  if (validPairs.length === 0) return [];

  // 각 썸네일 쌍을 분석
  for (const pair of validPairs.slice(0, 5)) {
    // 최대 5개 분석
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 영상 편집자입니다. 두 이미지(영상의 같은 타임스탬프에서 추출)를 비교하여 차이점을 분석해주세요.
시각적 차이점만 JSON 형식으로 응답해주세요:
{
  "has_changes": boolean,
  "changes": [
    {
      "type": "visual" | "text" | "effect",
      "description": "한국어로 차이점 설명",
      "confidence": 0.0~1.0
    }
  ]
}`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `타임스탬프 ${formatDuration(pair.timestamp)}에서의 두 프레임을 비교해주세요. 첫 번째는 이전 버전, 두 번째는 새 버전입니다.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: pair.oldThumbnail!,
                  detail: 'low',
                },
              },
              {
                type: 'image_url',
                image_url: {
                  url: pair.newThumbnail!,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      // JSON 추출 (마크다운 코드 블록 처리)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;

      const result = JSON.parse(jsonStr);
      if (result.has_changes && result.changes) {
        for (const change of result.changes) {
          // 해당 타임스탬프 주변 구간으로 설정
          const segmentDuration = videoDuration / Math.max(validPairs.length, 1);
          changes.push({
            type: validateChangeType(change.type),
            start_time: Math.max(0, pair.timestamp - segmentDuration / 2),
            end_time: Math.min(videoDuration, pair.timestamp + segmentDuration / 2),
            description: change.description,
            confidence: change.confidence || 0.8,
          });
        }
      }
    } catch (error) {
      console.error(`[Video Diff] 프레임 ${pair.timestamp} 분석 실패:`, error);
    }
  }

  return changes;
}

/**
 * 종합 분석 실행
 */
export async function analyzeVideoDiff(
  oldVideo: {
    duration: number | null;
    resolution: string | null;
    file_size: number;
    codec: string | null;
    change_notes: string;
    thumbnail_url: string | null;
  },
  newVideo: {
    duration: number | null;
    resolution: string | null;
    file_size: number;
    codec: string | null;
    change_notes: string;
    thumbnail_url: string | null;
  }
): Promise<AIDetectedChange[]> {
  const videoDuration = newVideo.duration || oldVideo.duration || 60;
  const allChanges: AIDetectedChange[] = [];

  // 1. 메타데이터 분석
  const metadataChanges = await analyzeMetadataDiff(oldVideo, newVideo);
  allChanges.push(...metadataChanges);

  // 2. 변경 노트 AI 분석
  const noteChanges = await analyzeChangeNotes(
    oldVideo.change_notes,
    newVideo.change_notes,
    videoDuration
  );
  allChanges.push(...noteChanges);

  // 3. 썸네일 시각적 분석 (둘 다 있는 경우)
  if (oldVideo.thumbnail_url && newVideo.thumbnail_url) {
    const visualChanges = await analyzeVisualDiff(
      [
        {
          timestamp: 0,
          oldThumbnail: oldVideo.thumbnail_url,
          newThumbnail: newVideo.thumbnail_url,
        },
      ],
      videoDuration
    );
    allChanges.push(...visualChanges);
  }

  // 중복 제거 및 병합
  return mergeOverlappingChanges(allChanges);
}

/**
 * 겹치는 변경사항 병합
 */
function mergeOverlappingChanges(changes: AIDetectedChange[]): AIDetectedChange[] {
  if (changes.length <= 1) return changes;

  // 타입별로 정렬
  const sorted = [...changes].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.start_time - b.start_time;
  });

  const merged: AIDetectedChange[] = [];
  let current: AIDetectedChange | null = null;

  for (const change of sorted) {
    if (!current) {
      current = { ...change };
      continue;
    }

    // 같은 타입이고 시간이 겹치면 병합
    if (current.type === change.type && change.start_time <= current.end_time + 5) {
      current.end_time = Math.max(current.end_time, change.end_time);
      current.description =
        current.description + ' ' + change.description;
      current.confidence = Math.max(current.confidence, change.confidence);
    } else {
      merged.push(current);
      current = { ...change };
    }
  }

  if (current) merged.push(current);

  return merged;
}

/**
 * 변경 타입 검증
 */
function validateChangeType(type: string | undefined): ChangeMarkerType {
  const validTypes: ChangeMarkerType[] = [
    'visual',
    'audio',
    'text',
    'effect',
    'other',
  ];
  return validTypes.includes(type as ChangeMarkerType)
    ? (type as ChangeMarkerType)
    : 'other';
}

/**
 * 시간 포맷팅 (초 -> MM:SS)
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
