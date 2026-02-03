/**
 * OpenAI Whisper API Integration for Subtitle Generation
 */

import OpenAI from 'openai';
import type { WhisperResponse, SRTEntry, VTTEntry } from '@/types/subtitle';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Check if Whisper API is configured
 */
export function isWhisperConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Transcribe audio using Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: {
    language?: string;
    prompt?: string;
    response_format?: 'json' | 'verbose_json' | 'srt' | 'vtt' | 'text';
    temperature?: number;
  } = {}
): Promise<WhisperResponse> {
  if (!isWhisperConfigured()) {
    throw new Error('OpenAI API key is not configured');
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Audio buffer is empty');
  }

  const {
    language,
    prompt,
    response_format = 'verbose_json',
    temperature = 0,
  } = options;

  try {
    // Create a Blob then File from the buffer (more compatible approach)
    const uint8Array = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
    const file = new File([blob], 'audio.mp3', { type: 'audio/mpeg' });

    console.log('[Whisper] Sending to API, file size:', file.size);

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: language || undefined,
      prompt: prompt || undefined,
      response_format,
      temperature,
    });

    console.log('[Whisper] API response received');

    // verbose_json returns the full response with segments
    if (response_format === 'verbose_json') {
      return response as unknown as WhisperResponse;
    }

    // For other formats, wrap in a basic response structure
    return {
      task: 'transcribe',
      language: language || 'unknown',
      duration: 0,
      text: typeof response === 'string' ? response : (response as { text?: string }).text || '',
      segments: [],
    };
  } catch (error) {
    console.error('[Whisper] API error:', error);
    throw error;
  }
}

/**
 * Convert Whisper segments to SRT format
 */
export function segmentsToSRT(segments: WhisperResponse['segments']): string {
  return segments
    .map((segment, index) => {
      const startTime = formatTimeSRT(segment.start);
      const endTime = formatTimeSRT(segment.end);
      return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Convert Whisper segments to VTT format
 */
export function segmentsToVTT(segments: WhisperResponse['segments']): string {
  const header = 'WEBVTT\n\n';
  const cues = segments
    .map((segment) => {
      const startTime = formatTimeVTT(segment.start);
      const endTime = formatTimeVTT(segment.end);
      return `${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
    })
    .join('\n');
  return header + cues;
}

/**
 * Convert Whisper segments to JSON format
 */
export function segmentsToJSON(segments: WhisperResponse['segments']): string {
  const formatted = segments.map((segment, index) => ({
    index,
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
    confidence: Math.exp(segment.avg_logprob), // Convert log probability to confidence
  }));
  return JSON.stringify(formatted, null, 2);
}

/**
 * Parse SRT content to entries
 */
export function parseSRT(content: string): SRTEntry[] {
  const entries: SRTEntry[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    const timeLine = lines[1];
    const text = lines.slice(2).join('\n');

    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;

    entries.push({
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text,
    });
  }

  return entries;
}

/**
 * Parse VTT content to entries
 */
export function parseVTT(content: string): VTTEntry[] {
  const entries: VTTEntry[] = [];

  // Remove WEBVTT header and any metadata
  const lines = content
    .replace(/^WEBVTT.*$/m, '')
    .trim()
    .split('\n');

  let i = 0;
  while (i < lines.length) {
    // Skip empty lines
    if (!lines[i].trim()) {
      i++;
      continue;
    }

    // Check for timestamp line
    const timeMatch = lines[i].match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*(.*)?/);
    if (timeMatch) {
      const startTime = timeMatch[1];
      const endTime = timeMatch[2];
      const settings = timeMatch[3]?.trim() || undefined;

      // Collect text lines
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
        textLines.push(lines[i]);
        i++;
      }

      entries.push({
        startTime,
        endTime,
        text: textLines.join('\n'),
        settings,
      });
    } else {
      i++;
    }
  }

  return entries;
}

/**
 * Format seconds to SRT timestamp (00:00:00,000)
 */
function formatTimeSRT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Format seconds to VTT timestamp (00:00:00.000)
 */
function formatTimeVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * Pad number with leading zeros
 */
function pad(num: number, size = 2): string {
  return num.toString().padStart(size, '0');
}

/**
 * Calculate average confidence from segments
 */
export function calculateAverageConfidence(segments: WhisperResponse['segments']): number {
  if (segments.length === 0) return 0;

  const totalConfidence = segments.reduce((sum, segment) => {
    // Convert log probability to confidence (0-1 scale)
    const confidence = Math.exp(segment.avg_logprob);
    return sum + Math.min(1, Math.max(0, confidence));
  }, 0);

  return totalConfidence / segments.length;
}

/**
 * Count words in transcription
 */
export function countWords(text: string): number {
  // Handle various languages
  // For CJK languages, count characters as words
  const cjkMatch = text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjkMatch ? cjkMatch.length : 0;

  // For other languages, count space-separated words
  const otherWords = text
    .replace(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return cjkCount + otherWords.length;
}
