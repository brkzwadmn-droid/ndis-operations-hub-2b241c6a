import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { HardHat } from "lucide-react";

export default function TeamLeader() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Welcome, {profile?.full_name}</h1>
        <p className="text-muted-foreground">Team Leader Dashboard</p>
      </div>

      <Card className="mt-6">
        <CardContent className="py-16 text-center">
          <HardHat className="h-16 w-16 mx-auto mb-6 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            The Team Leader dashboard is being built. When a Team Leader is hired, this dashboard will provide 
            oversight of assigned Support Workers' shifts and task completion.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
