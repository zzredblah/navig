import { createClient } from '@/lib/supabase/server';
import { signUpSchema } from '@/lib/validations/auth';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    console.log('[Signup API] 요청 시작');

    const body = await request.json();
    console.log('[Signup API] 요청 본문:', { ...body, password: '***' });

    const validatedData = signUpSchema.parse(body);
    console.log('[Signup API] 유효성 검증 통과');

    const supabase = await createClient();
    console.log('[Signup API] Supabase 클라이언트 생성 완료');

    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          name: validatedData.name,
          role: 'client',
        },
      },
    });

    if (error) {
      console.error('[Signup API] Supabase 에러:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[Signup API] 회원가입 성공:', data.user?.id);
    console.log('[Signup API] Profile은 데이터베이스 트리거로 자동 생성됨');

    return NextResponse.json({
      message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      data: {
        user: data.user,
      },
    });
  } catch (error) {
    console.error('[Signup API] 예외 발생:', error);

    if (error instanceof ZodError) {
      console.error('[Signup API] Zod 유효성 에러:', error.errors);
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
