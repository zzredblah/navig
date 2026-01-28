'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, User, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MenuItem {
  title: string;
  href: string;
  alwaysVisible: boolean;
}

const allMenuItems: MenuItem[] = [
  // 메인 메뉴 (사이드바 순서와 동일)
  { title: '대시보드', href: '/dashboard', alwaysVisible: true },
  { title: '프로젝트', href: '/projects', alwaysVisible: false },
  { title: '문서', href: '/documents', alwaysVisible: false },
  { title: '영상', href: '/videos', alwaysVisible: false },
  { title: '레퍼런스 보드', href: '/boards', alwaysVisible: false },
  { title: '팀 멤버', href: '/team', alwaysVisible: false },
  { title: '알림', href: '/notifications', alwaysVisible: false },
  // 하단 메뉴
  { title: '휴지통', href: '/documents/trash', alwaysVisible: false },
  { title: '설정', href: '/settings', alwaysVisible: true },
  { title: '도움말', href: '/help', alwaysVisible: false },
];

export default function SettingsPage() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const { data } = await res.json();
        setHidden(data?.sidebar_config?.hidden || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (href: string) => {
    setHidden((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/sidebar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden }),
      });
      if (res.ok) {
        setSaved(true);
        // Reload to reflect sidebar changes
        window.location.reload();
      }
    } catch {
      alert('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">앱 환경을 설정합니다</p>
      </div>

      {/* 프로필 설정 링크 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Link
            href="/settings/profile"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900">프로필 설정</div>
              <div className="text-sm text-gray-500">이름, 연락처, 비밀번호, 아바타 변경</div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* 사이드바 메뉴 설정 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary-600" />
            <CardTitle className="text-base">사이드바 메뉴</CardTitle>
          </div>
          <CardDescription className="text-xs">표시할 메뉴 항목을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allMenuItems.map((item) => {
              const isVisible = !hidden.includes(item.href);
              return (
                <label
                  key={item.href}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    item.alwaysVisible
                      ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      : isVisible
                      ? 'border-primary-200 bg-primary-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={item.alwaysVisible}
                    onChange={() => !item.alwaysVisible && toggleItem(item.href)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      isVisible
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300'
                    } ${item.alwaysVisible ? 'opacity-50' : ''}`}
                  >
                    {isVisible && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
                    {item.title}
                  </span>
                  {item.alwaysVisible && (
                    <span className="text-xs text-gray-400 ml-auto">항상 표시</span>
                  )}
                </label>
              );
            })}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className="mt-6 w-full bg-primary-600 hover:bg-primary-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                저장 완료
              </>
            ) : (
              '완료'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
