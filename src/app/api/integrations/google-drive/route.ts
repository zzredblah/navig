/**
 * Google Drive 연동 관리 API
 * DELETE /api/integrations/google-drive - 연결 해제
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// DELETE - 연결 해제
export async function DELETE() {
  try {
    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 연동 정보 삭제
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient
      .from('external_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'google_drive');

    if (deleteError) {
      console.error('[Google Drive] Delete error:', deleteError);
      return NextResponse.json(
        { error: '연결 해제에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { success: true, message: 'Google Drive 연결이 해제되었습니다' },
    });
  } catch (error) {
    console.error('[Google Drive] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
