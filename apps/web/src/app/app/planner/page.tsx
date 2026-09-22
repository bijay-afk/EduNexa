import { PlannerView } from '@/components/student/planner-view';

export const metadata = { title: 'Study Planner' };

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Study planner</h1>
        <p className="text-muted-foreground">
          Generated from your exam date and study hours. You can edit it manually at any time.
        </p>
      </div>
      <PlannerView />
    </div>
  );
}