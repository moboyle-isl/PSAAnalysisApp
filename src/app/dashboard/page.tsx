
import { DashboardClient } from './dashboard-client';

export const maxDuration = 300; // 5 minutes

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <DashboardClient />
    </div>
  );
}
