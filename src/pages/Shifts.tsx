import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Send, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Shifts() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isDirector = profile?.role === "director";

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      let q = supabase
        .from("shifts")
        .select("*, profile:profiles!shifts_profile_id_fkey(full_name, role)")
        .order("created_at", { ascending: false });
      if (!isDirector) {
        q = q.eq("profile_id", profile!.id);
      }
      const { data } = await q;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: incompleteTasks = 0 } = useQuery({
    queryKey: ["my-incomplete-tasks"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", profile!.id)
        .eq("due_date", today)
        .neq("status", "completed");
      return count || 0;
    },
    enabled: !!profile && !isDirector,
  });

  const startShift = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shifts").insert({
        profile_id: profile!.id,
        start_time: new Date().toISOString(),
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Shift started" });
    },
  });

  const closeShift = useMutation({
    mutationFn: async (shiftId: string) => {
      if (incompleteTasks > 0) {
        throw new Error(`You have ${incompleteTasks} incomplete task(s). Complete all tasks before closing your shift.`);
      }
      const { error } = await supabase.from("shifts").update({
        end_time: new Date().toISOString(),
        status: "closed",
      }).eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Shift closed" });
    },
    onError: (e: any) => toast({ title: "Cannot close shift", description: e.message, variant: "destructive" }),
  });

  const submitShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase.from("shifts").update({ status: "submitted" }).eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Shift submitted for approval" });
    },
  });

  const activeShift = shifts.find((s: any) => s.profile_id === profile?.id && s.status === "open");

  const statusColor: Record<string, string> = {
    open: "secondary",
    closed: "outline",
    submitted: "default",
    approved: "default",
    rejected: "destructive",
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Shifts</h1>
          <p className="text-muted-foreground">{isDirector ? "All staff shifts" : "Manage your shifts"}</p>
        </div>
        {!isDirector && !activeShift && (
          <Button onClick={() => startShift.mutate()}>
            <Play className="mr-2 h-4 w-4" /> Start Shift
          </Button>
        )}
      </div>

      {!isDirector && incompleteTasks > 0 && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          ⚠️ You have {incompleteTasks} incomplete task(s) today. Complete all tasks before closing your shift.
        </div>
      )}

      <div className="space-y-3">
        {shifts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No shifts found</CardContent></Card>
        ) : (
          shifts.map((shift: any) => (
            <Card key={shift.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{shift.profile?.full_name || "Unknown"}</p>
                    <Badge variant={statusColor[shift.status] as any}>{shift.status}</Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {shift.start_time && <span>Start: {format(new Date(shift.start_time), "MMM d, h:mm a")}</span>}
                    {shift.end_time && <span>End: {format(new Date(shift.end_time), "h:mm a")}</span>}
                  </div>
                </div>
                {!isDirector && shift.profile_id === profile?.id && (
                  <div className="flex gap-2">
                    {shift.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => closeShift.mutate(shift.id)}>
                        <Square className="mr-1 h-3 w-3" /> End Shift
                      </Button>
                    )}
                    {shift.status === "closed" && (
                      <Button size="sm" onClick={() => submitShift.mutate(shift.id)}>
                        <Send className="mr-1 h-3 w-3" /> Submit for Approval
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
