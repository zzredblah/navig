import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { TemplateField } from '@/types/database';

type RouteParams = { params: Promise<{ id: string }> };

// PDF용 HTML 생성
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const printMode = request.nextUrl.searchParams.get('print') === 'true';
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: document, error } = await adminClient
      .from('documents')
      .select(`
        *,
        document_templates(id, name, type, fields),
        profiles!documents_created_by_fkey(id, name, email),
        signatures(id, user_id, signature_data, signed_at, profiles!signatures_user_id_fkey(id, name))
      `)
      .eq('id', id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다' }, { status: 404 });
    }

    // 프로젝트 접근 권한 확인
    const { data: project } = await adminClient
      .from('projects')
      .select('client_id, title')
      .eq('id', document.project_id)
      .single();

    const isOwner = project?.client_id === user.id;
    const { data: member } = await adminClient
      .from('project_members')
      .select('id')
      .eq('project_id', document.project_id)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && !member) {
      return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const fields: TemplateField[] = document.document_templates?.fields || [];
    const content = document.content as Record<string, unknown>;
    const typeLabels: Record<string, string> = {
      request: '작업 요청서',
      estimate: '견적서',
      contract: '계약서',
    };

    const html = generatePdfHtml({
      title: document.title,
      type: document.type,
      typeLabel: typeLabels[document.type] || document.type,
      fields,
      content,
      createdAt: document.created_at,
      creatorName: document.profiles?.name || '',
      projectName: project?.title || '',
      signatures: document.signatures || [],
      printMode,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[PDF API] 예외:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 });
  }
}

interface PdfData {
  title: string;
  type: string;
  typeLabel: string;
  fields: TemplateField[];
  content: Record<string, unknown>;
  createdAt: string;
  creatorName: string;
  projectName: string;
  signatures: {
    id: string;
    signature_data: string;
    signed_at: string;
    profiles: { id: string; name: string } | null;
  }[];
  printMode: boolean;
}

function formatValue(field: TemplateField, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  switch (field.type) {
    case 'number':
      return Number(value).toLocaleString('ko-KR');
    case 'date':
      return new Date(String(value)).toLocaleDateString('ko-KR');
    default:
      return String(value);
  }
}

function generatePdfHtml(data: PdfData): string {
  const fieldsHtml = data.fields.map((field) => {
    const value = formatValue(field, data.content[field.name]);
    const isTextarea = field.type === 'textarea';
    return `
      <tr>
        <td class="field-label">${field.label}</td>
        <td class="field-value">${isTextarea ? `<pre>${value}</pre>` : value}</td>
      </tr>
    `;
  }).join('');

  const signaturesHtml = data.signatures.length > 0 ? `
    <div class="signatures">
      <h3>서명</h3>
      <div class="sig-grid">
        ${data.signatures.map((sig) => `
          <div class="sig-item">
            <div class="sig-name">${sig.profiles?.name || ''}</div>
            <img src="${sig.signature_data}" class="sig-image" alt="서명" />
            <div class="sig-date">${new Date(sig.signed_at).toLocaleDateString('ko-KR')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${data.title} - ${data.typeLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      color: #1f2937;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header .type { font-size: 12px; color: #7c3aed; margin-bottom: 4px; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header .meta { font-size: 11px; color: #6b7280; margin-top: 8px; }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .info-table tr { border-bottom: 1px solid #e5e7eb; }
    .info-table td { padding: 10px 8px; vertical-align: top; }
    .field-label {
      width: 30%;
      font-weight: 500;
      color: #4b5563;
      background: #f9fafb;
    }
    .field-value { width: 70%; }
    .field-value pre {
      white-space: pre-wrap;
      font-family: inherit;
      margin: 0;
    }
    .signatures {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .signatures h3 { font-size: 14px; margin-bottom: 16px; }
    .sig-grid { display: flex; gap: 40px; }
    .sig-item { text-align: center; }
    .sig-name { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .sig-image { max-width: 200px; height: 60px; object-fit: contain; }
    .sig-date { font-size: 11px; color: #9ca3af; margin-top: 4px; }
    .disclaimer {
      margin-top: 50px;
      padding: 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 10px;
      color: #6b7280;
      line-height: 1.6;
    }
    .disclaimer p { margin-bottom: 2px; }
    .disclaimer p:last-child { margin-bottom: 0; }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    @media print {
      body { padding: 20mm; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="type">${data.typeLabel}</div>
    <h1>${data.title}</h1>
    <div class="meta">
      프로젝트: ${data.projectName} | 작성자: ${data.creatorName} | 작성일: ${new Date(data.createdAt).toLocaleDateString('ko-KR')}
    </div>
  </div>

  <table class="info-table">
    ${fieldsHtml}
  </table>

  ${signaturesHtml}

  <div class="disclaimer">
    <p>본 문서는 NAVIG 플랫폼을 통해 생성된 문서입니다.</p>
    <p>본 문서의 내용에 대한 정확성과 진위 여부는 작성자 및 관련 당사자에게 있으며, 플랫폼은 문서 내용에 대한 법적 책임을 지지 않습니다.</p>
    <p>계약서의 경우, 모든 당사자의 서명이 완료된 시점부터 법적 효력이 발생할 수 있습니다.</p>
    <p>본 문서의 무단 복제, 위조, 변조 시 관련 법령에 의거하여 처벌받을 수 있습니다.</p>
  </div>

  <div class="footer">
    NAVIG - 영상 제작 협업 플랫폼 | ${new Date().toLocaleDateString('ko-KR')} 생성
  </div>

  ${data.printMode ? `<script>window.onload = function() { window.print(); };</script>` : ''}
</body>
</html>`;
}
