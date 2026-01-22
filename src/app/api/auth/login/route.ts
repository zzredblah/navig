import { createClient } from '@/lib/supabase/server';
import { signInSchema } from '@/lib/validations/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signInSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      console.error('[Login API] 로그인 에러:', error.message, error.code);

      // 이메일 미인증
      if (error.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: '이메일 인증이 필요합니다. 이메일을 확인해주세요.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    // 프로필 정보 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return NextResponse.json({
      message: '로그인 성공',
      data: {
        user: data.user,
        profile,
        session: data.session,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '입력값이 유효하지 않습니다' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
