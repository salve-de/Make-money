import { BuilderWorkspace } from '@/components/builder/BuilderWorkspace';

export default async function BuildPage({
  params,
}: {
  params: Promise<{ ideaId: string }>;
}) {
  const { ideaId } = await params;
  return <BuilderWorkspace ideaId={ideaId} />;
}
