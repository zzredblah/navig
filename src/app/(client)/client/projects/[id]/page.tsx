import { ClientProjectView } from '@/components/client/ClientProjectView';

interface ClientProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProjectPage({ params }: ClientProjectPageProps) {
  const { id } = await params;

  return <ClientProjectView projectId={id} />;
}
