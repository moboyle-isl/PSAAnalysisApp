import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { initialAssets } from '@/lib/data';
import { DashboardClient } from './dashboard-client';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Asset Dashboard"
        description="View, edit, and analyze asset data with AI-powered recommendations."
      >
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </PageHeader>
      <div className="flex-1 p-6 bg-card rounded-b-lg overflow-hidden">
        <DashboardClient data={initialAssets} />
      </div>
    </div>
  );
}
