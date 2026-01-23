import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50).optional(),
  phone: z.string().max(20).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url, role, phone, company, sidebar_config, created_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Profile GET] 프로필 조회 실패:', error);
      return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('[Profile GET] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.phone !== undefined) updateData.phone = result.data.phone;
    if (result.data.company !== undefined) updateData.company = result.data.company;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Profile PATCH] 프로필 업데이트 실패:', error);
      return NextResponse.json({ error: '프로필 업데이트에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ data: profile, message: '프로필이 업데이트되었습니다' });
  } catch (error) {
    console.error('[Profile PATCH] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
