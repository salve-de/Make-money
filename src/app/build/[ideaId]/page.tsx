import { BuilderWorkspace } from '@/components/builder/BuilderWorkspace';
import { redirect } from 'next/navigation';

export default async function BuildPage({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;
  if (ideaId === 'example-idea') redirect('/?mode=SYNTHESIS');
  return <BuilderWorkspace ideaId={ideaId} />;
}
