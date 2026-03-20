import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: staff = [] } = useQuery({
    queryKey: ["all-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("role");
      return data || [];
    },
  });

  // Get today's tasks for all staff (directors can see all)
  const { data: todayTasks = [] } = useQuery({
    queryKey: ["all-today-tasks", today],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, assigned_to, due_date")
        .eq("due_date", today);
      return data || [];
    },
  });

  // Get today's active shifts
  const { data: todayShifts = [] } = useQuery({
    queryKey: ["all-today-shifts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shifts")
        .select("id, profile_id, status, start_time")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);
      return data || [];
    },
  });

  const getStaffTasks = (staffId: string) => todayTasks.filter(t => t.assigned_to === staffId);
  const getStaffShift = (staffId: string) => todayShifts.find(s => s.profile_id === staffId);

  const managers = staff.filter(s => s.role === "manager");
  const teamLeaders = staff.filter(s => s.role === "team_leader");
  const supportWorkers = staff.filter(s => s.role === "support_worker");
  const directors = staff.filter(s => s.role === "director");

  const renderStaffCard = (member: any) => {
    const memberTasks = getStaffTasks(member.id);
    const memberShift = getStaffShift(member.id);
    const completedTasks = memberTasks.filter(t => t.status === "completed").length;
    const pendingTasks = memberTasks.length - completedTasks;

    return (
      <Card key={member.id}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {member.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{member.full_name}</p>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roleBadgeVariant[member.role]}>{roleLabels[member.role]}</Badge>
              {memberShift && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {memberShift.status === "open" ? "On shift" : memberShift.status}
                </Badge>
              )}
            </div>
          </div>
          {memberTasks.length > 0 && (
            <div className="mt-2 ml-12 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-primary" /> {completedTasks} completed
              </span>
              {pendingTasks > 0 && (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="h-3 w-3" /> {pendingTasks} pending
                </span>
              )}
              <span>{memberTasks.length} total today</span>
            </div>
          )}
          {memberTasks.length > 0 && (
            <div className="mt-2 ml-12 space-y-1">
              {memberTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between text-xs rounded px-2 py-1 bg-muted/50">
                  <span className="truncate max-w-[200px]">{task.title}</span>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-[10px] h-5">
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Staff Management</h1>
        <p className="text-muted-foreground">{staff.length} team members · Today: {today}</p>
      </div>

      {managers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Managers</h2>
          <div className="space-y-2">
            {managers.map(renderStaffCard)}
          </div>
        </div>
      )}

      {teamLeaders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Team Leaders</h2>
          <div className="space-y-2">
            {teamLeaders.map(renderStaffCard)}
          </div>
        </div>
      )}

      {supportWorkers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Support Workers</h2>
          <div className="space-y-2">
            {supportWorkers.map(renderStaffCard)}
          </div>
        </div>
      )}

      {directors.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Directors</h2>
          <div className="space-y-2">
            {directors.map(renderStaffCard)}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
