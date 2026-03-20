import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const roleLabels: Record<string, string> = {
  director: "Director",
  manager: "Manager",
  team_leader: "Team Leader",
  support_worker: "Support Worker",
};

const roleBadgeVariant: Record<string, any> = {
  director: "default",
  manager: "secondary",
  team_leader: "outline",
  support_worker: "outline",
};

export default function Staff() {
  const { data: staff = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("role");
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Staff Management</h1>
        <p className="text-muted-foreground">{staff.length} team members</p>
      </div>

      <div className="space-y-2">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <Badge variant={roleBadgeVariant[member.role]}>{roleLabels[member.role]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
