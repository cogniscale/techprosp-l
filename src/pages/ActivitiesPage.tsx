import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivitiesPage() {
  return (
    <PageContainer title="CogniScale Activities">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-tp-dark-grey">
            Track interviews, roundtables, meetings, and surveys
          </p>
          <Button>
            <Plus className="h-4 w-4" />
            Log Activity
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-tp-dark-grey">
              CogniScale pipeline activity tracking will be implemented here.
              Connect to Supabase to enable full functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
