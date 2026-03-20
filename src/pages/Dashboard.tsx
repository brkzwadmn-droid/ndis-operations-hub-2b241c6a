import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import { ListTodo, Clock, CheckSquare, Users, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { profile } = useAuth();
  const role = profile?.role;

  if (role === "director") return <DirectorDashboard />;
  if (role === "manager") return <ManagerDashboard />;
  return <WorkerDashboard />;
}

function DirectorDashboard() {
  const { profile } = useAuth();

  const { data: staffCount = 0 } = useQuery({
    queryKey: ["staff-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: pendingTasks = 0 } = useQuery({
    queryKey: ["pending-tasks-count"],
    queryFn: async () => {
      const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["pending-approvals-count"],
    queryFn: async () => {
      const { count } = await supabase.from("shifts").select("*", { count: "exact", head: true }).eq("status", "submitted");
      return count || 0;
    },
  });

  const { data: financeData } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("finance_entries").select("type, amount");
      const income = (data || []).filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
      const expense = (data || []).filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
      return { income, expense, profit: income - expense };
    },
  });

  const { data: recentTasks = [] } = useQuery({
    queryKey: ["recent-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Welcome back, {profile?.full_name}</h1>
        <p className="text-muted-foreground">Director Overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Staff" value={staffCount} icon={Users} />
        <StatCard title="Pending Tasks" value={pendingTasks} icon={ListTodo} />
        <StatCard title="Awaiting Approval" value={pendingApprovals} icon={CheckSquare} />
        <StatCard title="Profit/Loss" value={`$${(financeData?.profit || 0).toLocaleString()}`} icon={DollarSign} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Finance Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Income</span>
                <span className="text-sm font-semibold text-success">${(financeData?.income || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expenses</span>
                <span className="text-sm font-semibold text-destructive">${(financeData?.expense || 0).toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm font-medium">Net</span>
                <span className="text-sm font-bold">${(financeData?.profit || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Tasks</CardTitle></CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.assigned_to_profile?.full_name}
                      </p>
                    </div>
                    <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ManagerDashboard() {
  const { profile } = useAuth();

  const { data: todayTasks = [] } = useQuery({
    queryKey: ["my-today-tasks"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile!.id)
        .eq("due_date", today)
        .order("is_end_of_day", { ascending: true });
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: activeShift } = useQuery({
    queryKey: ["my-active-shift"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("profile_id", profile!.id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!profile,
  });

  const completedCount = todayTasks.filter(t => t.status === "completed").length;
  const totalCount = todayTasks.length;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Welcome back, {profile?.full_name}</h1>
        <p className="text-muted-foreground">Manager Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard title="Today's Tasks" value={`${completedCount}/${totalCount}`} icon={ListTodo} />
        <StatCard
          title="Shift Status"
          value={activeShift ? "Active" : "No Shift"}
          icon={Clock}
          trend={activeShift ? `Started ${format(new Date(activeShift.start_time!), "h:mm a")}` : undefined}
        />
        <StatCard title="Pending" value={totalCount - completedCount} icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Today's Tasks</CardTitle></CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks for today</p>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.is_end_of_day && (
                      <span className="text-xs text-warning font-medium">End-of-day task</span>
                    )}
                  </div>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function WorkerDashboard() {
  const { profile } = useAuth();

  const { data: todayTasks = [] } = useQuery({
    queryKey: ["my-worker-tasks"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile!.id)
        .eq("due_date", today);
      return data || [];
    },
    enabled: !!profile,
  });

  const completedCount = todayTasks.filter(t => t.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Welcome, {profile?.full_name}</h1>
        <p className="text-muted-foreground">
          {profile?.role === "team_leader" ? "Team Leader" : "Support Worker"} Dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <StatCard title="Today's Tasks" value={`${completedCount}/${todayTasks.length}`} icon={ListTodo} />
        <StatCard title="Pending" value={todayTasks.length - completedCount} icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">My Tasks</CardTitle></CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned for today</p>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                  </div>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
