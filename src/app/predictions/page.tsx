import { PageHeader } from '@/components/page-header';
import { PredictionsClient } from './predictions-client';

export default function PredictionsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="AI Remaining Life Prediction"
        description="Estimate the remaining operational life of an asset."
      />
      <div className="flex-1 p-6 bg-card rounded-b-lg">
        <PredictionsClient />
      </div>
    </div>
  );
}
