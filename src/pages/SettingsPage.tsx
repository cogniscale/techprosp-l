import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export function SettingsPage() {
  const { profile, isOwner } = useAuth();

  return (
    <PageContainer title="Settings">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-tp-dark-grey">Name</p>
              <p className="text-sm font-medium text-tp-dark">{profile?.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-tp-dark-grey">Email</p>
              <p className="text-sm font-medium text-tp-dark">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-tp-dark-grey">Role</p>
              <p className="text-sm font-medium text-tp-dark capitalize">{profile?.role}</p>
            </div>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-tp-dark-grey">
                Admin settings (fee configuration, user management) will be
                implemented here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
