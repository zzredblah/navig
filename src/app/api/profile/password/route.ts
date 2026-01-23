import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const body = await request.json();
    const result = passwordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || '입력값이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    // Verify current password by attempting sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: result.data.currentPassword,
    });

    if (signInError) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다' }, { status: 400 });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: result.data.newPassword,
    });

    if (updateError) {
      console.error('[Password POST] 비밀번호 변경 실패:', updateError);
      return NextResponse.json({ error: '비밀번호 변경에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({ message: '비밀번호가 변경되었습니다' });
  } catch (error) {
    console.error('[Password POST] 예외:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
