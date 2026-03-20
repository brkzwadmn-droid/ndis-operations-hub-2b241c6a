import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Approvals() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submittedShifts = [] } = useQuery({
    queryKey: ["submitted-shifts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shifts")
        .select("*, profile:profiles!shifts_profile_id_fkey(full_name, role), approvals:shift_approvals(*)")
        .in("status", ["submitted", "approved"])
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });

  const approve = useMutation({
    mutationFn: async (shiftId: string) => {
      // Insert this director's approval
      const { error: approvalErr } = await supabase.from("shift_approvals").insert({
        shift_id: shiftId,
        director_id: profile!.id,
        status: "approved",
      });
      if (approvalErr) throw approvalErr;

      // Check if both directors approved
      const { data: approvals } = await supabase
        .from("shift_approvals")
        .select("*")
        .eq("shift_id", shiftId)
        .eq("status", "approved");

      if (approvals && approvals.length >= 2) {
        // Both approved - mark shift as approved
        await supabase.from("shifts").update({ status: "approved" }).eq("id", shiftId);

        // Notify the manager
        const shift = submittedShifts.find((s: any) => s.id === shiftId);
        if (shift) {
          await supabase.from("notifications").insert({
            profile_id: shift.profile_id,
            title: "Shift Approved",
            message: "Your shift has been approved by both Directors.",
            link: "/shifts",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submitted-shifts"] });
      toast({ title: "Approval recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reject = useMutation({
    mutationFn: async (shiftId: string) => {
      await supabase.from("shift_approvals").insert({
        shift_id: shiftId,
        director_id: profile!.id,
        status: "rejected",
      });
      await supabase.from("shifts").update({ status: "rejected" }).eq("id", shiftId);

      const shift = submittedShifts.find((s: any) => s.id === shiftId);
      if (shift) {
        await supabase.from("notifications").insert({
          profile_id: shift.profile_id,
          title: "Shift Rejected",
          message: "Your shift has been rejected by a Director.",
          link: "/shifts",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submitted-shifts"] });
      toast({ title: "Shift rejected" });
    },
  });

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Shift Approvals</h1>
        <p className="text-muted-foreground">Both Directors must approve each Manager's shift</p>
      </div>

      <div className="space-y-3">
        {submittedShifts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No shifts pending approval</CardContent></Card>
        ) : (
          submittedShifts.map((shift: any) => {
            const myApproval = shift.approvals?.find((a: any) => a.director_id === profile?.id);
            const approvalCount = shift.approvals?.filter((a: any) => a.status === "approved").length || 0;

            return (
              <Card key={shift.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{shift.profile?.full_name}</p>
                      <Badge variant={shift.status === "approved" ? "default" : "secondary"}>{shift.status}</Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {shift.start_time && <span>{format(new Date(shift.start_time), "MMM d, h:mm a")}</span>}
                      {shift.end_time && <span>→ {format(new Date(shift.end_time), "h:mm a")}</span>}
                      <span>Approvals: {approvalCount}/2</span>
                    </div>
                  </div>
                  {!myApproval && shift.status === "submitted" ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approve.mutate(shift.id)}>
                        <Check className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => reject.mutate(shift.id)}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  ) : myApproval ? (
                    <Badge variant={myApproval.status === "approved" ? "default" : "destructive"}>
                      You: {myApproval.status}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
