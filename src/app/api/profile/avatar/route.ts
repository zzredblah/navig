/**
 * 아바타 업로드 API
 *
 * 변경 이력:
 * - 2026-01-26: Supabase Storage → Cloudflare R2 마이그레이션
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { uploadFile, deleteFile, getPublicUrl } from '@/lib/cloudflare/r2';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일을 선택해주세요' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPG, PNG, WebP, GIF 형식만 지원됩니다' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 2MB 이하여야 합니다' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileKey = `${user.id}.${ext}`;

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // R2 환경 변수 확인 - R2가 설정되지 않았으면 기존 Supabase Storage 사용
    const isR2Configured = !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_URL_AVATARS
    );

    let avatarUrl: string;

    if (isR2Configured) {
      // Cloudflare R2에 업로드
      try {
        const { url } = await uploadFile('avatars', fileKey, buffer, file.type);
        // Cache busting을 위한 timestamp 추가
        avatarUrl = `${url}?t=${Date.now()}`;
      } catch (r2Error) {
        console.error('[Avatar POST] R2 업로드 실패:', r2Error);
        return NextResponse.json(
          {
            error: '파일 업로드에 실패했습니다',
            details: r2Error instanceof Error ? r2Error.message : 'R2 error',
          },
          { status: 500 }
        );
      }
    } else {
      // Fallback: Supabase Storage 사용
      console.log('[Avatar POST] R2 미설정, Supabase Storage 사용');
      const adminClient = createAdminClient();

      const { error: uploadError } = await adminClient.storage
        .from('avatars')
        .upload(fileKey, buffer, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('[Avatar POST] Supabase 업로드 실패:', uploadError);
        return NextResponse.json(
          { error: '파일 업로드에 실패했습니다', details: uploadError.message },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = adminClient.storage.from('avatars').getPublicUrl(fileKey);

      avatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    // Update profile with avatar URL
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Avatar POST] 프로필 업데이트 실패:', updateError);
      return NextResponse.json(
        { error: '프로필 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { avatar_url: avatarUrl },
      message: '아바타가 업데이트되었습니다',
    });
  } catch (error) {
    console.error('[Avatar POST] 예외:', error);
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
