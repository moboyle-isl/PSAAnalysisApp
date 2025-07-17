
import { PageHeader } from '@/components/page-header';
import { RulesClient } from './rules-client';

export default function RulesPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Rule Configuration"
        description="Define custom rules to guide the AI's repair recommendations."
      />
      <div className="flex-1 p-6 bg-card rounded-b-lg">
        <RulesClient />
      </div>
    </div>
  );
}
