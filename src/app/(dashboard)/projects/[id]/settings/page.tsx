'use client';

/**
 * 프로젝트 설정 페이지
 * /projects/[id]/settings
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, Droplets, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WatermarkSettingsForm } from '@/components/video/WatermarkSettings';
import type { MemberRole } from '@/types/database';

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 프로젝트 정보 및 권한 확인
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${resolvedParams.id}`);
        if (!response.ok) {
          router.push('/projects');
          return;
        }
        const { data } = await response.json();
        setProjectTitle(data.project.title);
        setUserRole(data.userRole);
      } catch {
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [resolvedParams.id, router]);

  // 권한 체크 (owner, editor만 설정 접근 가능)
  const canEdit = userRole === 'owner' || userRole === 'editor';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            접근 권한이 없습니다
          </h2>
          <p className="text-gray-500 mb-6">
            프로젝트 설정은 소유자 또는 편집자만 접근할 수 있습니다
          </p>
          <Link href={`/projects/${resolvedParams.id}`}>
            <Button variant="outline">프로젝트로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트 설정</h1>
          <p className="text-sm text-gray-500">{projectTitle}</p>
        </div>
      </div>

      {/* 설정 탭 */}
      <Tabs defaultValue="watermark" className="space-y-6">
        <TabsList>
          <TabsTrigger value="watermark" className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            워터마크
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watermark">
          <WatermarkSettingsForm projectId={resolvedParams.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
