import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";
import { Play, Check, X, ArrowRight, CheckCircle, Clock, MessageSquare, Camera } from "lucide-react";

export default function ShiftReview() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [reassignDate, setReassignDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Submitted shifts to review
  const { data: submittedShifts = [] } = useQuery({
    queryKey: ["review-shifts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shifts")
        .select("*, profile:profiles!shifts_profile_id_fkey(full_name)")
        .eq("status", "submitted")
        .order("updated_at", { ascending: false });
      return data || [];
    },
  });

  // Active review data
  const { data: reviewData } = useQuery({
    queryKey: ["active-review", activeReview],
    queryFn: async () => {
      const { data } = await supabase
        .from("shift_reviews")
        .select("*, items:shift_review_items(*, task:tasks(*))")
        .eq("id", activeReview!)
        .single();
      return data;
    },
    enabled: !!activeReview,
    refetchInterval: activeReview ? 3000 : false, // realtime-like polling for the other director
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["review-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, role").order("full_name");
      return data || [];
    },
  });

  const startReview = useMutation({
    mutationFn: async (shiftId: string) => {
      // Get tasks for this shift's date and profile
      const shift = submittedShifts.find((s: any) => s.id === shiftId);
      if (!shift) throw new Error("Shift not found");
      const shiftDate = format(new Date(shift.start_time || shift.created_at), "yyyy-MM-dd");

      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", shift.profile_id)
        .eq("due_date", shiftDate);

      // Create the review session
      const { data: review, error: rErr } = await supabase.from("shift_reviews").insert({
        shift_id: shiftId,
        director1_id: profile!.id,
        status: "in_progress",
      }).select().single();
      if (rErr) throw rErr;

      // Create review items for each task
      if (tasks && tasks.length > 0) {
        const items = tasks.map(t => ({
          review_id: review.id,
          task_id: t.id,
          status: "pending",
        }));
        await supabase.from("shift_review_items").insert(items);
      }

      await log("start_shift_review", "shift_review", review.id, { shift_id: shiftId });
      return review;
    },
    onSuccess: (review) => {
      setActiveReview(review.id);
      setCurrentItemIdx(0);
      queryClient.invalidateQueries({ queryKey: ["active-review", review.id] });
      toast({ title: "Shift Review started" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveItem = useMutation({
    mutationFn: async (itemId: string) => {
      const item = reviewData?.items?.find((i: any) => i.id === itemId);
      if (!item) return;

      // Determine which director field to update
      const isDirector1 = reviewData?.director1_id === profile?.id;
      const update: any = {};
      if (isDirector1) update.director1_approved = true;
      else update.director2_approved = true;

      // Check if both approved
      const otherApproved = isDirector1 ? item.director2_approved : item.director1_approved;
      if (otherApproved) update.status = "approved";

      if (notes) update.notes = notes;
      await supabase.from("shift_review_items").update(update).eq("id", itemId);
      await log("approve_review_item", "shift_review_item", itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-review", activeReview] });
      setNotes("");
      const items = reviewData?.items || [];
      if (currentItemIdx < items.length - 1) setCurrentItemIdx(prev => prev + 1);
    },
  });

  const handleIncompleteDecision = useMutation({
    mutationFn: async (itemId: string) => {
      const update: any = {
        status: "reviewed",
        decision,
        notes,
        director1_approved: true,
        director2_approved: true,
      };
      if (reassignTo) {
        update.reassigned_to = reassignTo;
        update.reassigned_date = reassignDate;
        // Create a new task for the reassigned person
        const item = reviewData?.items?.find((i: any) => i.id === itemId);
        if (item?.task) {
          await supabase.from("tasks").insert({
            title: item.task.title,
            description: item.task.description,
            assigned_by: profile!.id,
            assigned_to: reassignTo,
            due_date: reassignDate,
            photo_required: item.task.photo_required,
            client_id: item.task.client_id,
          });
        }
      }
      await supabase.from("shift_review_items").update(update).eq("id", itemId);
      await log("review_incomplete_task", "shift_review_item", itemId, { decision, reassigned_to: reassignTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-review", activeReview] });
      setNotes("");
      setDecision("");
      setReassignTo("");
      const items = reviewData?.items || [];
      if (currentItemIdx < items.length - 1) setCurrentItemIdx(prev => prev + 1);
    },
  });

  const completeReview = useMutation({
    mutationFn: async () => {
      await supabase.from("shift_reviews").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        summary_notes: notes,
        director2_id: profile!.id,
      }).eq("id", activeReview!);

      // Mark the shift as approved
      const shift = reviewData;
      if (shift?.shift_id) {
        await supabase.from("shifts").update({ status: "approved" }).eq("id", shift.shift_id);
        // Notify the manager
        const { data: shiftData } = await supabase.from("shifts").select("profile_id").eq("id", shift.shift_id).single();
        if (shiftData) {
          await supabase.from("notifications").insert({
            profile_id: shiftData.profile_id,
            title: "Shift Approved",
            message: "Your shift has been approved after review by both Directors.",
            link: "/shifts",
          });
        }
      }
      await log("complete_shift_review", "shift_review", activeReview!);
    },
    onSuccess: () => {
      setActiveReview(null);
      setCurrentItemIdx(0);
      queryClient.invalidateQueries({ queryKey: ["review-shifts"] });
      toast({ title: "Shift Review completed!" });
    },
  });

  const items = reviewData?.items || [];
  const currentItem: any = items[currentItemIdx];
  const allReviewed = items.length > 0 && items.every((i: any) => i.status !== "pending");

  if (activeReview && reviewData) {
    return (
      <DashboardLayout>
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Shift Review Session</h1>
            <p className="text-muted-foreground">Task {currentItemIdx + 1} of {items.length}</p>
          </div>
          {allReviewed && (
            <Button onClick={() => completeReview.mutate()} disabled={completeReview.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" /> Complete Review
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {items.map((_: any, i: number) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < currentItemIdx ? "bg-primary" : i === currentItemIdx ? "bg-primary/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {currentItem ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{currentItem.task?.title}</CardTitle>
                <Badge variant={currentItem.task?.status === "completed" ? "default" : "destructive"}>
                  {currentItem.task?.status}
                </Badge>
              </div>
              {currentItem.task?.description && (
                <p className="text-sm text-muted-foreground">{currentItem.task.description}</p>
              )}
              {currentItem.task?.added_by_self && (
                <Badge variant="outline" className="w-fit">Self-added by Manager</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show completion details */}
              {currentItem.task?.status === "completed" && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                  {currentItem.task.comment && (
                    <div className="flex gap-2 text-sm"><MessageSquare className="h-4 w-4 text-muted-foreground" />{currentItem.task.comment}</div>
                  )}
                  {currentItem.task.photo_url && (
                    <div className="flex gap-2 text-sm items-center"><Camera className="h-4 w-4 text-muted-foreground" /><a href={currentItem.task.photo_url} target="_blank" className="text-primary underline">View photo</a></div>
                  )}
                </div>
              )}

              {/* Incomplete task - show reason and decision UI */}
              {currentItem.task?.status !== "completed" && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-3">
                  <p className="text-sm font-medium text-warning">Incomplete Task</p>
                  {currentItem.task?.incomplete_reason && (
                    <p className="text-sm text-muted-foreground">Reason: {currentItem.task.incomplete_reason}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Decision</Label>
                    <Select value={decision} onValueChange={setDecision}>
                      <SelectTrigger><SelectValue placeholder="Choose decision..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reassign_manager">Reassign to Manager</SelectItem>
                        <SelectItem value="reassign_director">Assign to a Director</SelectItem>
                        <SelectItem value="defer">Defer to later</SelectItem>
                        <SelectItem value="cancel">Cancel task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(decision === "reassign_manager" || decision === "reassign_director") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Reassign to</Label>
                        <Select value={reassignTo} onValueChange={setReassignTo}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {staff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>New due date</Label>
                        <Input type="date" value={reassignDate} onChange={e => setReassignDate(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add review notes..." />
              </div>

              <div className="flex gap-3">
                {currentItem.task?.status === "completed" ? (
                  <Button onClick={() => approveItem.mutate(currentItem.id)} className="flex-1">
                    <Check className="mr-2 h-4 w-4" /> Approve Task
                  </Button>
                ) : (
                  <Button onClick={() => handleIncompleteDecision.mutate(currentItem.id)} className="flex-1" disabled={!decision}>
                    <ArrowRight className="mr-2 h-4 w-4" /> Confirm Decision & Next
                  </Button>
                )}
                {currentItemIdx < items.length - 1 && (
                  <Button variant="outline" onClick={() => setCurrentItemIdx(prev => prev + 1)}>
                    Skip <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Approval status */}
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Director 1: {currentItem.director1_approved ? "✅ Approved" : "⏳ Pending"}</span>
                <span>Director 2: {currentItem.director2_approved ? "✅ Approved" : "⏳ Pending"}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No tasks to review</CardContent></Card>
        )}

        {/* Review summary at bottom */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium">Review Progress</h3>
          {items.map((item: any, i: number) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded border px-3 py-2 cursor-pointer text-sm ${i === currentItemIdx ? "border-primary bg-primary/5" : ""}`}
              onClick={() => setCurrentItemIdx(i)}
            >
              <span>{item.task?.title}</span>
              <Badge variant={item.status === "approved" || item.status === "reviewed" ? "default" : "secondary"}>{item.status}</Badge>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="text-2xl font-display font-bold">Shift Review</h1>
        <p className="text-muted-foreground">Start a call session to review submitted shifts</p>
      </div>

      <div className="space-y-3">
        {submittedShifts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No shifts pending review</CardContent></Card>
        ) : submittedShifts.map((shift: any) => (
          <Card key={shift.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{shift.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {shift.start_time && format(new Date(shift.start_time), "MMM d, h:mm a")}
                  {shift.end_time && ` → ${format(new Date(shift.end_time), "h:mm a")}`}
                </p>
              </div>
              <Button onClick={() => startReview.mutate(shift.id)} disabled={startReview.isPending}>
                <Play className="mr-2 h-4 w-4" /> Start Review
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
