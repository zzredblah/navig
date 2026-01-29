/**
 * Toss Payments Client
 * 토스페이먼츠 API 클라이언트
 */

import {
  TossPaymentResponse,
  TossBillingKeyResponse,
  TossBillingPaymentRequest,
  TossCancelRequest,
  TossCancelResponse,
  TossErrorResponse,
} from './types';

// ============================================
// 환경 변수
// ============================================

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_API_URL = 'https://api.tosspayments.com/v1';

// ============================================
// 헬퍼 함수
// ============================================

function getAuthHeader(): string {
  if (!TOSS_SECRET_KEY) {
    throw new Error('TOSS_SECRET_KEY is not configured');
  }
  const encoded = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function handleTossResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const error = data as TossErrorResponse;
    throw new TossPaymentError(error.code, error.message);
  }

  return data as T;
}

// ============================================
// 커스텀 에러
// ============================================

export class TossPaymentError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TossPaymentError';
    this.code = code;
  }
}

// ============================================
// API 설정 여부 확인
// ============================================

export function isTossConfigured(): boolean {
  return !!TOSS_SECRET_KEY;
}

// ============================================
// 결제 승인
// ============================================

export async function confirmPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  });

  return handleTossResponse<TossPaymentResponse>(response);
}

// ============================================
// 결제 조회
// ============================================

export async function getPayment(paymentKey: string): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  return handleTossResponse<TossPaymentResponse>(response);
}

export async function getPaymentByOrderId(orderId: string): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_URL}/payments/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  return handleTossResponse<TossPaymentResponse>(response);
}

// ============================================
// 결제 취소
// ============================================

export async function cancelPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<TossCancelResponse> {
  const body: TossCancelRequest = {
    cancelReason,
  };

  if (cancelAmount !== undefined) {
    body.cancelAmount = cancelAmount;
  }

  const response = await fetch(`${TOSS_API_URL}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleTossResponse<TossCancelResponse>(response);
}

// ============================================
// 빌링키 발급 (정기결제용)
// ============================================

export async function issueBillingKey(
  authKey: string,
  customerKey: string
): Promise<TossBillingKeyResponse> {
  const response = await fetch(`${TOSS_API_URL}/billing/authorizations/issue`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      authKey,
      customerKey,
    }),
  });

  return handleTossResponse<TossBillingKeyResponse>(response);
}

// ============================================
// 빌링키로 결제 (정기결제)
// ============================================

export async function chargeWithBillingKey(
  request: TossBillingPaymentRequest
): Promise<TossPaymentResponse> {
  const { billingKey, ...body } = request;

  const response = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return handleTossResponse<TossPaymentResponse>(response);
}

// ============================================
// 빌링키 삭제
// ============================================

export async function deleteBillingKey(billingKey: string): Promise<void> {
  const response = await fetch(`${TOSS_API_URL}/billing/${billingKey}`, {
    method: 'DELETE',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    const data = (await response.json()) as TossErrorResponse;
    throw new TossPaymentError(data.code, data.message);
  }
}

// ============================================
// 주문 ID 생성
// ============================================

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `navig_${timestamp}_${random}`;
}

// ============================================
// 고객 키 생성
// ============================================

export function generateCustomerKey(userId: string): string {
  return `customer_${userId}`;
}
