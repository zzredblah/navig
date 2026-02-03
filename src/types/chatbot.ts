/**
 * AI 챗봇 관련 타입 정의
 */

// 챗봇 메시지 역할
export type ChatbotRole = 'user' | 'assistant';

// 챗봇 메시지
export interface ChatbotMessage {
  id: string;
  role: ChatbotRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  sources?: ChatbotSource[];
}

// 응답 소스 (출처)
export interface ChatbotSource {
  type: 'project' | 'feedback' | 'faq';
  title: string;
}

// API 요청
export interface ChatbotRequest {
  message: string;
  project_id?: string;
  history?: { role: ChatbotRole; content: string }[];
}

// API 응답
export interface ChatbotResponse {
  data: {
    message: string;
    sources?: ChatbotSource[];
    isFaq: boolean;
  };
  remaining: number;
}

// 프로젝트 컨텍스트
export interface ChatbotProjectContext {
  title: string;
  status: string;
  deadline: string | null;
  description: string | null;
  members: {
    name: string;
    role: string;
  }[];
}

// 피드백 통계 컨텍스트
export interface ChatbotFeedbackStats {
  total: number;
  pending: number;
  urgent: number;
  resolved: number;
}

// 사용자 컨텍스트
export interface ChatbotUserContext {
  name: string;
  role: 'client' | 'worker' | 'admin';
}

// 전체 컨텍스트
export interface ChatbotContext {
  project?: ChatbotProjectContext;
  feedbackStats?: ChatbotFeedbackStats;
  user: ChatbotUserContext;
}

// FAQ 패턴
export interface FAQPattern {
  pattern: RegExp;
  answer: string;
  source: ChatbotSource;
}
