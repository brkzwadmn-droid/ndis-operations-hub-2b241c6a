import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";
import { FileText, Download } from "lucide-react";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staffFilter, setStaffFilter] = useState("");

  const { data: staff = [] } = useQuery({
    queryKey: ["report-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
      return data || [];
    },
  });

  const { data: shiftReport = [] } = useQuery({
    queryKey: ["shift-report", dateFrom, dateTo, staffFilter],
    queryFn: async () => {
      let q = supabase
        .from("shifts")
        .select("*, profile:profiles!shifts_profile_id_fkey(full_name, role)")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: false });
      if (staffFilter) q = q.eq("profile_id", staffFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: taskReport = [] } = useQuery({
    queryKey: ["task-report", dateFrom, dateTo, staffFilter],
    queryFn: async () => {
      let q = supabase
        .from("tasks")
        .select("*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)")
        .gte("due_date", dateFrom)
        .lte("due_date", dateTo)
        .order("due_date", { ascending: false });
      if (staffFilter) q = q.eq("assigned_to", staffFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: incidentReport = [] } = useQuery({
    queryKey: ["incident-report", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("incident_reports")
        .select("*, profile:profiles!incident_reports_profile_id_fkey(full_name), client:clients!incident_reports_client_id_fkey(full_name)")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const incompleteTasks = taskReport.filter((t: any) => t.status !== "completed");

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground">Pre-built reports for shifts, tasks, and incidents</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-44" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-44" />
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Staff</SelectItem>
            {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="shifts">
        <TabsList>
          <TabsTrigger value="shifts">Shifts ({shiftReport.length})</TabsTrigger>
          <TabsTrigger value="tasks">Incomplete Tasks ({incompleteTasks.length})</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({incidentReport.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-2 mt-4">
          {shiftReport.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{s.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.start_time && format(new Date(s.start_time), "MMM d h:mm a")}
                    {s.end_time && ` → ${format(new Date(s.end_time), "h:mm a")}`}
                  </p>
                </div>
                <Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {shiftReport.length === 0 && <Card><CardContent className="py-6 text-center text-muted-foreground">No shifts in range</CardContent></Card>}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2 mt-4">
          {incompleteTasks.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.assigned_to_profile?.full_name} · Due {format(new Date(t.due_date), "MMM d")}</p>
                  </div>
                  <Badge variant="secondary">{t.status}</Badge>
                </div>
                {t.incomplete_reason && <p className="mt-2 text-xs text-warning bg-warning/10 rounded p-2">{t.incomplete_reason}</p>}
              </CardContent>
            </Card>
          ))}
          {incompleteTasks.length === 0 && <Card><CardContent className="py-6 text-center text-muted-foreground">No incomplete tasks</CardContent></Card>}
        </TabsContent>

        <TabsContent value="incidents" className="space-y-2 mt-4">
          {incidentReport.map((i: any) => (
            <Card key={i.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{i.profile?.full_name} · {i.client?.full_name} · {format(new Date(i.created_at), "MMM d h:mm a")}</p>
                  </div>
                  <Badge variant="destructive">{i.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
              </CardContent>
            </Card>
          ))}
          {incidentReport.length === 0 && <Card><CardContent className="py-6 text-center text-muted-foreground">No incidents</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
