import { describe, it, expect } from 'vitest';
import {
  createDocumentSchema,
  updateDocumentSchema,
  changeStatusSchema,
  signDocumentSchema,
  createTemplateSchema,
  documentQuerySchema,
  validTransitions,
} from '@/lib/validations/document';

describe('createDocumentSchema', () => {
  it('유효한 데이터를 통과시킨다', () => {
    const result = createDocumentSchema.safeParse({
      type: 'request',
      title: '작업 요청서',
      content: { project_name: '테스트' },
    });
    expect(result.success).toBe(true);
  });

  it('template_id가 UUID인 경우 통과시킨다', () => {
    const result = createDocumentSchema.safeParse({
      type: 'estimate',
      title: '견적서',
      template_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('title이 비어있으면 실패한다', () => {
    const result = createDocumentSchema.safeParse({
      type: 'request',
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('type이 유효하지 않으면 실패한다', () => {
    const result = createDocumentSchema.safeParse({
      type: 'invalid',
      title: '테스트',
    });
    expect(result.success).toBe(false);
  });

  it('title이 255자를 초과하면 실패한다', () => {
    const result = createDocumentSchema.safeParse({
      type: 'request',
      title: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateDocumentSchema', () => {
  it('title만 변경할 수 있다', () => {
    const result = updateDocumentSchema.safeParse({ title: '새 제목' });
    expect(result.success).toBe(true);
  });

  it('content만 변경할 수 있다', () => {
    const result = updateDocumentSchema.safeParse({ content: { field1: 'value1' } });
    expect(result.success).toBe(true);
  });

  it('빈 객체도 유효하다', () => {
    const result = updateDocumentSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('changeStatusSchema', () => {
  it('유효한 상태 변경을 통과시킨다', () => {
    const result = changeStatusSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(true);
  });

  it('rejected 시 reject_reason이 없으면 실패한다', () => {
    const result = changeStatusSchema.safeParse({ status: 'rejected' });
    expect(result.success).toBe(false);
  });

  it('rejected 시 reject_reason이 있으면 통과한다', () => {
    const result = changeStatusSchema.safeParse({
      status: 'rejected',
      reject_reason: '수정 필요',
    });
    expect(result.success).toBe(true);
  });

  it('유효하지 않은 상태는 실패한다', () => {
    const result = changeStatusSchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('signDocumentSchema', () => {
  it('서명 데이터가 있으면 통과한다', () => {
    const result = signDocumentSchema.safeParse({
      signature_data: 'data:image/png;base64,iVBOR...',
    });
    expect(result.success).toBe(true);
  });

  it('서명 데이터가 비어있으면 실패한다', () => {
    const result = signDocumentSchema.safeParse({ signature_data: '' });
    expect(result.success).toBe(false);
  });
});

describe('createTemplateSchema', () => {
  it('유효한 템플릿 데이터를 통과시킨다', () => {
    const result = createTemplateSchema.safeParse({
      type: 'request',
      name: '기본 요청서',
      fields: [
        { name: 'title', label: '제목', type: 'text', required: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('fields가 비어있으면 실패한다', () => {
    const result = createTemplateSchema.safeParse({
      type: 'request',
      name: '템플릿',
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 필드 타입은 실패한다', () => {
    const result = createTemplateSchema.safeParse({
      type: 'request',
      name: '템플릿',
      fields: [
        { name: 'field', label: '필드', type: 'invalid', required: true },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('documentQuerySchema', () => {
  it('빈 쿼리를 기본값으로 파싱한다', () => {
    const result = documentQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(1);
    expect(result.data?.limit).toBe(20);
  });

  it('page, limit을 숫자로 변환한다', () => {
    const result = documentQuerySchema.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(2);
    expect(result.data?.limit).toBe(10);
  });

  it('limit이 100을 초과하면 실패한다', () => {
    const result = documentQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });
});

describe('validTransitions', () => {
  it('draft에서 pending으로 전환 가능하다', () => {
    expect(validTransitions['draft']).toContain('pending');
  });

  it('pending에서 approved/rejected로 전환 가능하다', () => {
    expect(validTransitions['pending']).toContain('approved');
    expect(validTransitions['pending']).toContain('rejected');
  });

  it('approved에서 signed로 전환 가능하다', () => {
    expect(validTransitions['approved']).toContain('signed');
  });

  it('rejected에서 draft로 전환 가능하다', () => {
    expect(validTransitions['rejected']).toContain('draft');
  });

  it('draft에서 approved로 직접 전환할 수 없다', () => {
    expect(validTransitions['draft']).not.toContain('approved');
  });

  it('signed에서는 어디로도 전환할 수 없다', () => {
    expect(validTransitions['signed']).toBeUndefined();
  });
});
