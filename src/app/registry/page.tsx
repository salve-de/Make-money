import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import RegistryClient from './RegistryClient';

export default function RegistryPage() {
  return (
    <div className="term-page bg-term-bg text-term-fg">
      <GlobalHeader currentSection="LEDGER" />
      <RegistryClient />
    </div>
  );
}
