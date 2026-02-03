import { Suspense } from 'react';
import { EditProjectList } from '@/components/editing/EditProjectList';
import { Loader2 } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

function EditProjectListSkeleton() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>
  );
}

export default async function EditProjectsPage({ params }: PageProps) {
  const { id: projectId } = await params;

  return (
    <Suspense fallback={<EditProjectListSkeleton />}>
      <EditProjectList projectId={projectId} />
    </Suspense>
  );
}
