import { PageHeader } from '@/components/page-header';
import { initialRepairPrices } from '@/lib/data';
import { PricingClient } from './pricing-client';

export default function PricingPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Repair Price Configuration"
        description="Manage unit prices for repairs and replacements."
      />
      <div className="flex-1 p-6 bg-card rounded-b-lg">
        <PricingClient data={initialRepairPrices} />
      </div>
    </div>
  );
}
