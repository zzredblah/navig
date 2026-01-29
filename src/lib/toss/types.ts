/**
 * Toss Payments API Types
 * 토스페이먼츠 API 타입 정의
 */

// ============================================
// 결제 승인 응답
// ============================================

export interface TossPaymentResponse {
  mId: string;
  version: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  currency: string;
  method: string;
  status: TossPaymentStatus;
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  cultureExpense: boolean;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  receipt?: {
    url: string;
  };
  card?: TossCardInfo;
  virtualAccount?: TossVirtualAccountInfo;
  transfer?: TossTransferInfo;
  mobilePhone?: TossMobilePhoneInfo;
  giftCertificate?: TossGiftCertificateInfo;
  cashReceipt?: TossCashReceiptInfo;
  discount?: TossDiscountInfo;
  cancels?: TossCancelInfo[];
  easyPay?: TossEasyPayInfo;
}

export type TossPaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED';

export interface TossCardInfo {
  company: string;
  number: string;
  installmentPlanMonths: number;
  isInterestFree: boolean;
  interestPayer: string | null;
  approveNo: string;
  useCardPoint: boolean;
  cardType: 'CREDIT' | 'CHECK' | 'GIFT';
  ownerType: 'PERSONAL' | 'CORPORATE';
  acquireStatus: string;
  receiptUrl: string;
}

export interface TossVirtualAccountInfo {
  accountType: string;
  accountNumber: string;
  bankCode: string;
  customerName: string;
  dueDate: string;
  refundStatus: string;
  expired: boolean;
  settlementStatus: string;
}

export interface TossTransferInfo {
  bankCode: string;
  settlementStatus: string;
}

export interface TossMobilePhoneInfo {
  carrier: string;
  customerMobilePhone: string;
  settlementStatus: string;
}

export interface TossGiftCertificateInfo {
  approveNo: string;
  settlementStatus: string;
}

export interface TossCashReceiptInfo {
  type: string;
  amount: number;
  taxFreeAmount: number;
  issueNumber: string;
  receiptUrl: string;
}

export interface TossDiscountInfo {
  amount: number;
}

export interface TossCancelInfo {
  cancelAmount: number;
  cancelReason: string;
  taxFreeAmount: number;
  taxExemptionAmount: number;
  refundableAmount: number;
  easyPayDiscountAmount: number;
  canceledAt: string;
  transactionKey: string;
}

export interface TossEasyPayInfo {
  provider: 'TOSSPAY' | 'NAVERPAY' | 'KAKAOPAY' | 'PAYCO' | 'SAMSUNGPAY' | 'APPLEPAY';
  amount: number;
  discountAmount: number;
}

// ============================================
// 빌링키 발급 응답
// ============================================

export interface TossBillingKeyResponse {
  mId: string;
  customerKey: string;
  billingKey: string;
  method: string;
  authenticatedAt: string;
  card: {
    company: string;
    number: string;
    cardType: 'CREDIT' | 'CHECK' | 'GIFT';
    ownerType: 'PERSONAL' | 'CORPORATE';
  };
}

// ============================================
// 빌링키로 결제 요청
// ============================================

export interface TossBillingPaymentRequest {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  taxFreeAmount?: number;
}

// ============================================
// 결제 취소 요청
// ============================================

export interface TossCancelRequest {
  cancelReason: string;
  cancelAmount?: number;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

export interface TossCancelResponse {
  paymentKey: string;
  orderId: string;
  status: TossPaymentStatus;
  cancels: TossCancelInfo[];
}

// ============================================
// 에러 응답
// ============================================

export interface TossErrorResponse {
  code: string;
  message: string;
}

// ============================================
// 웹훅 페이로드
// ============================================

export type TossWebhookEventType =
  | 'PAYMENT_STATUS_CHANGED'
  | 'BILLING_KEY_DELETED'
  | 'PAYMENT_CANCELED'
  | 'VIRTUAL_ACCOUNT_DEPOSIT_CALLBACK';

export interface TossWebhookPayload {
  eventType: TossWebhookEventType;
  createdAt: string;
  data: TossPaymentResponse;
}
