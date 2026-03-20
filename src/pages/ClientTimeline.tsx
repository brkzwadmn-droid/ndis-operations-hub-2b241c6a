import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle, XCircle, ArrowRight, FileText, AlertTriangle, ClipboardList } from "lucide-react";

export default function ClientTimeline() {
  const { clientId } = useParams<{ clientId: string }>();

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", clientId!).single();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: progressNotes = [] } = useQuery({
    queryKey: ["client-progress-notes", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("progress_notes")
        .select("*, profile:profiles!progress_notes_profile_id_fkey(full_name)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["client-incidents", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("incident_reports")
        .select("*, profile:profiles!incident_reports_profile_id_fkey(full_name)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  const { data: abcCharts = [] } = useQuery({
    queryKey: ["client-abc", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("abc_charts")
        .select("*, profile:profiles!abc_charts_profile_id_fkey(full_name)")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!clientId,
  });

  // Merge into a single timeline
  const timeline = [
    ...tasks.map((t: any) => ({ ...t, _type: "task", _date: t.created_at })),
    ...progressNotes.map((n: any) => ({ ...n, _type: "progress_note", _date: n.created_at })),
    ...incidents.map((i: any) => ({ ...i, _type: "incident", _date: i.created_at })),
    ...abcCharts.map((a: any) => ({ ...a, _type: "abc", _date: a.created_at })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());

  const iconMap: Record<string, React.ElementType> = {
    task: CheckCircle,
    progress_note: FileText,
    incident: AlertTriangle,
    abc: ClipboardList,
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">{client?.full_name || "Client"}</h1>
        <p className="text-muted-foreground">Activity Timeline {client?.ndis_number && `· NDIS: ${client.ndis_number}`}</p>
      </div>

      {timeline.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No activity recorded for this client</CardContent></Card>
      ) : (
        <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {timeline.map((item: any, idx) => {
            const Icon = iconMap[item._type] || CheckCircle;
            return (
              <div key={`${item._type}-${item.id}`} className="relative">
                <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-primary">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{item._type.replace("_", " ")}</Badge>
                          {item._type === "task" && (
                            <Badge variant={item.status === "completed" ? "default" : "secondary"}>{item.status}</Badge>
                          )}
                          {item._type === "incident" && (
                            <Badge variant="destructive">{item.severity}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {item._type === "task" ? item.title : item._type === "incident" ? item.title : item._type === "abc" ? "ABC Chart Entry" : "Progress Note"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item._type === "task" ? item.description : item._type === "progress_note" ? item.content : item._type === "incident" ? item.description : `A: ${item.antecedent} → B: ${item.behaviour} → C: ${item.consequence}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          By: {item.assigned_to_profile?.full_name || item.profile?.full_name || "Unknown"} · {format(new Date(item._date), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
