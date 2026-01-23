'use client';

import type { TemplateField } from '@/types/database';

interface DocumentPreviewProps {
  title: string;
  type: string;
  fields: TemplateField[];
  content: Record<string, unknown>;
  creatorName?: string;
  projectName?: string;
  createdAt?: string;
  compact?: boolean;
}

const typeLabels: Record<string, string> = {
  request: '작업 요청서',
  estimate: '견적서',
  contract: '계약서',
};

export function DocumentPreview({ title, type, fields, content, creatorName, projectName, createdAt, compact }: DocumentPreviewProps) {
  const formatValue = (field: TemplateField, value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';

    switch (field.type) {
      case 'number':
        return Number(value).toLocaleString('ko-KR');
      case 'date':
        return new Date(String(value)).toLocaleDateString('ko-KR');
      default:
        return String(value);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden flex flex-col ${compact ? '' : 'max-w-[595px] min-h-[842px] mx-auto'}`}>
      {/* 문서 헤더 - PDF 스타일 */}
      <div className="text-center border-b-2 border-primary-600 px-6 py-5">
        <div className="text-xs font-medium text-primary-600 mb-1">{typeLabels[type] || type}</div>
        <h2 className="text-lg font-bold text-gray-900">{title || '제목 없음'}</h2>
        <div className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-2">
          {projectName && <span>프로젝트: {projectName}</span>}
          {projectName && (creatorName || createdAt) && <span>|</span>}
          {creatorName && <span>작성자: {creatorName}</span>}
          {creatorName && createdAt && <span>|</span>}
          {createdAt ? (
            <span>작성일: {new Date(createdAt).toLocaleDateString('ko-KR')}</span>
          ) : (
            <span>{new Date().toLocaleDateString('ko-KR')}</span>
          )}
        </div>
      </div>

      {/* 문서 내용 - 테이블 형식 (PDF와 동일) */}
      <div className="flex-1">
        <div className="divide-y divide-gray-100">
          {fields.map((field) => (
            <div key={field.name} className="flex">
              <div className="w-[30%] px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 flex-shrink-0">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </div>
              <div className="flex-1 px-4 py-3 text-sm text-gray-900">
                {field.type === 'textarea' ? (
                  <p className="whitespace-pre-wrap">
                    {formatValue(field, content[field.name])}
                  </p>
                ) : (
                  formatValue(field, content[field.name])
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 서명란 */}
        {type === 'contract' && (
          <div className="px-6 py-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">서명</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">의뢰인</div>
                <div className="h-16 border-b border-gray-300" />
                <div className="text-xs text-gray-400 mt-1">(서명)</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">작업자</div>
                <div className="h-16 border-b border-gray-300" />
                <div className="text-xs text-gray-400 mt-1">(서명)</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 안내 사항 */}
      <div className="px-5 py-4 mx-4 my-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          본 문서는 NAVIG 플랫폼을 통해 생성된 문서입니다.
          본 문서의 내용에 대한 정확성과 진위 여부는 작성자 및 관련 당사자에게 있으며, 플랫폼은 문서 내용에 대한 법적 책임을 지지 않습니다.
          계약서의 경우, 모든 당사자의 서명이 완료된 시점부터 법적 효력이 발생할 수 있습니다.
          본 문서의 무단 복제, 위조, 변조 시 관련 법령에 의거하여 처벌받을 수 있습니다.
        </p>
      </div>

      {/* 푸터 */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">NAVIG - 영상 제작 협업 플랫폼</p>
      </div>
    </div>
  );
}
