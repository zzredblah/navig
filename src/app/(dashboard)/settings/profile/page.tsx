'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  company: string;
  avatar_url: string | null;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    avatar_url: null,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const { data } = await res.json();
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          avatar_url: data.avatar_url,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone || null,
          company: profile.company || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('프로필이 저장되었습니다');
        router.refresh();
      } else {
        setMessage(data.error || '저장에 실패했습니다');
      }
    } catch {
      setMessage('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setSavingPassword(true);
    setPasswordMessage('');
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwords),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage('비밀번호가 변경되었습니다');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage(data.error || '비밀번호 변경에 실패했습니다');
      }
    } catch {
      setPasswordMessage('비밀번호 변경에 실패했습니다');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev) => ({ ...prev, avatar_url: data.data.avatar_url }));
        router.refresh();
      } else {
        alert(data.error || '업로드에 실패했습니다');
      }
    } catch {
      alert('업로드에 실패했습니다');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>
          <p className="text-sm text-gray-500 mt-0.5">개인 정보를 수정합니다</p>
        </div>
      </div>

      {/* 아바타 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">프로필 이미지</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                <AvatarFallback className="bg-primary-100 text-primary-700 text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Camera className="h-4 w-4 mr-2" />
                이미지 변경
              </Button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (최대 2MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기본 정보 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">이름</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">이메일</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 text-gray-500 px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">연락처</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="010-0000-0000"
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">회사명</label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile((prev) => ({ ...prev, company: e.target.value }))}
              placeholder="회사/팀 이름"
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.includes('실패') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}

          <Button
            onClick={handleProfileSave}
            disabled={saving || !profile.name}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">현재 비밀번호</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">새 비밀번호</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
              placeholder="6자 이상"
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">비밀번호 확인</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.includes('실패') || passwordMessage.includes('올바르지') ? 'text-red-600' : 'text-green-600'}`}>
              {passwordMessage}
            </p>
          )}

          <Button
            onClick={handlePasswordChange}
            disabled={savingPassword || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
            variant="outline"
          >
            {savingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                변경 중...
              </>
            ) : (
              '비밀번호 변경'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
