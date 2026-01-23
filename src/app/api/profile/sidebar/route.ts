import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const sidebarConfigSchema = z.object({
  hidden: z.array(z.string()).default([]),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const result = sidebarConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        sidebar_config: result.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('[Sidebar PATCH] 사이드바 설정 저장 실패:', error);
      return NextResponse.json({ error: '설정 저장에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '사이드바 설정이 저장되었습니다' });
  } catch (error) {
    console.error('[Sidebar PATCH] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
