import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import RegistryClient from './RegistryClient';

export default function RegistryPage() {
  return (
    <div className="min-h-screen bg-[#07080B] text-zinc-100">
      <GlobalHeader currentSection="LEDGER" />
      <RegistryClient />
    </div>
  );
}
