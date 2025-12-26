'use client';

import { TeamManagement } from '@/components/settings/team-management';
import { Card } from '@/components/ui/card';

export default function TeamManagementPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Team Management</h1>
        <p className="mt-2 text-secondary-600">
          Manage team members and their access permissions
        </p>
      </div>

      <Card className="p-6">
        <TeamManagement />
      </Card>
    </div>
  );
}
