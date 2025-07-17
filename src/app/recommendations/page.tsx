import { PageHeader } from '@/components/page-header';
import { RecommendationsClient } from './recommendations-client';

export default function RecommendationsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="AI Repair Recommendations"
        description="Get AI-powered repair or replacement advice for your assets."
      />
      <div className="flex-1 p-6 bg-card rounded-b-lg">
        <RecommendationsClient />
      </div>
    </div>
  );
}
