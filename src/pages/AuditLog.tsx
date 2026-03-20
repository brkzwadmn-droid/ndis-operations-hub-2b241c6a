import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Shield } from "lucide-react";

export default function AuditLog() {
  const [filterUser, setFilterUser] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  const { data: logs = [] } = useQuery({
    queryKey: ["audit-log", filterUser, filterAction, filterDate],
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select("*, profile:profiles!audit_log_profile_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filterUser) q = q.eq("profile_id", filterUser);
      if (filterAction) q = q.ilike("action", `%${filterAction}%`);
      if (filterDate) q = q.gte("created_at", `${filterDate}T00:00:00`).lte("created_at", `${filterDate}T23:59:59`);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["audit-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Complete system activity trail</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by user" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Users</SelectItem>
            {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Filter by action..." value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-48" />
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44" />
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No audit entries found</CardContent></Card>
        ) : logs.map((log: any) => (
          <Card key={log.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{log.action}</p>
                    <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.profile?.full_name || "System"} · {format(new Date(log.created_at), "MMM d, yyyy h:mm:ss a")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
