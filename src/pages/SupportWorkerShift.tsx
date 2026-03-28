import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation, isLocationValid } from "@/hooks/useGeolocation";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format, startOfWeek, subDays } from "date-fns";
import { MapPin, Camera, Clock, CheckCircle, AlertTriangle, FileText, ClipboardList, Play, Square, MessageSquare } from "lucide-react";
import EarlyClockInDialog from "@/components/shift/EarlyClockInDialog";

const HANDOVER_ITEMS = [
  "Medication check completed",
  "Client wellbeing status confirmed",
  "Environment is clean and safe",
  "All incidents from previous shift noted",
  "Keys/access items accounted for",
  "Special instructions reviewed",
];

export default function SupportWorkerShift() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getPosition, loading: geoLoading } = useGeolocation();
  const { log } = useAuditLog();
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [notePhotoFile, setNotePhotoFile] = useState<File | null>(null);
  const [noteClientId, setNoteClientId] = useState("");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [abcOpen, setAbcOpen] = useState(false);

  // Handover states
  const [handoverChecklistOpen, setHandoverChecklistOpen] = useState(false);
  const [handoverType, setHandoverType] = useState<"incoming" | "outgoing">("incoming");
  const [handoverChecked, setHandoverChecked] = useState<boolean[]>(HANDOVER_ITEMS.map(() => false));
  const [handoverClientId, setHandoverClientId] = useState("");

  // Clock-out confirmation
  const [clockOutConfirmOpen, setClockOutConfirmOpen] = useState(false);

  // Early clock-in denial
  const [earlyClockInOpen, setEarlyClockInOpen] = useState(false);
  const [earlyClockInScheduledStart, setEarlyClockInScheduledStart] = useState<Date>(new Date());

  // Active shift
  const { data: activeShift } = useQuery({
    queryKey: ["sw-active-shift"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shifts")
        .select("*, client:clients!shifts_client_id_fkey(full_name, expected_lat, expected_lng, location_radius_meters)")
        .eq("profile_id", profile!.id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!profile,
  });

  // Next upcoming shift (for early clock-in check)
  // Checks ANY future shift regardless of status — covers 'scheduled', 'active', etc.
  const { data: nextUpcomingShift } = useQuery({
    queryKey: ["sw-next-upcoming"],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from("shifts")
        .select("id, start_time, end_time, scheduled_start, scheduled_end, client_id, status")
        .eq("profile_id", profile!.id)
        .gte("start_time", now.toISOString())
        .not("status", "in", '("closed","approved","rejected")')
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!profile && !activeShift,
  });

  // Today's tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ["sw-tasks"],
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

  // Fortnightly schedule (past days only)
  const { data: fortnightShifts = [] } = useQuery({
    queryKey: ["sw-fortnight"],
    queryFn: async () => {
      const today = new Date();
      const fortnightStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("profile_id", profile!.id)
        .gte("created_at", fortnightStart.toISOString())
        .lte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile,
  });

  // Clients for notes/incidents
  const { data: clients = [] } = useQuery({
    queryKey: ["sw-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, full_name, expected_lat, expected_lng, location_radius_meters").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  // Handle clock-in attempt — checks 30-min early restriction
  const handleClockInAttempt = () => {
    // Use scheduled_start if set, otherwise fall back to start_time
    const shiftStart = nextUpcomingShift?.scheduled_start || nextUpcomingShift?.start_time;

    if (shiftStart) {
      const scheduledStart = new Date(shiftStart);
      const now = new Date();
      const minutesUntilShift = (scheduledStart.getTime() - now.getTime()) / (1000 * 60);

      if (minutesUntilShift > 30) {
        // Too early — show denial animation
        setEarlyClockInScheduledStart(scheduledStart);
        setEarlyClockInOpen(true);
        return;
      }
    }

    // No scheduled shift at all — block with toast
    if (!nextUpcomingShift) {
      toast({
        title: "No shift scheduled",
        description: "You don't have a shift scheduled. Please contact your team leader.",
        variant: "destructive",
      });
      return;
    }

    // Within 30-min window — proceed
    clockIn.mutate();
  };

  // Clock In with GPS validation
  const clockIn = useMutation({
    mutationFn: async () => {
      const pos = await getPosition();

      let locationValid: boolean | null = null;

      // If clocking into a scheduled shift, update it to open
      if (nextUpcomingShift) {
        const { data: shift, error } = await supabase.from("shifts").update({
          start_time: new Date().toISOString(),
          status: "open" as const,
          clock_in_lat: pos.lat,
          clock_in_lng: pos.lng,
          clock_in_location_valid: locationValid,
        }).eq("id", nextUpcomingShift.id).select().single();
        if (error) throw error;

        await log("clock_in", "shift", shift.id, { lat: pos.lat, lng: pos.lng, scheduled: true });

        setHandoverType("incoming");
        setHandoverChecked(HANDOVER_ITEMS.map(() => false));
        setHandoverChecklistOpen(true);

        return shift;
      }

      // No scheduled shift — create ad-hoc
      const { data: shift, error } = await supabase.from("shifts").insert({
        profile_id: profile!.id,
        start_time: new Date().toISOString(),
        status: "open",
        clock_in_lat: pos.lat,
        clock_in_lng: pos.lng,
        clock_in_location_valid: locationValid,
      }).select().single();
      if (error) throw error;

      await log("clock_in", "shift", shift.id, { lat: pos.lat, lng: pos.lng, location_valid: locationValid });

      setHandoverType("incoming");
      setHandoverChecked(HANDOVER_ITEMS.map(() => false));
      setHandoverChecklistOpen(true);

      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sw-active-shift"] });
      queryClient.invalidateQueries({ queryKey: ["sw-next-scheduled"] });
      toast({ title: "Clocked in successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Clock Out (called after handover confirmation)
  const clockOut = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("No active shift");
      const pos = await getPosition();
      const { error } = await supabase.from("shifts").update({
        end_time: new Date().toISOString(),
        status: "closed",
        clock_out_lat: pos.lat,
        clock_out_lng: pos.lng,
      }).eq("id", activeShift.id);
      if (error) throw error;
      await log("clock_out", "shift", activeShift.id, { lat: pos.lat, lng: pos.lng });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sw-active-shift"] });
      toast({ title: "Clocked out" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Save handover checklist
  const saveHandover = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("No active shift");
      const items = HANDOVER_ITEMS.map((label, i) => ({ label, checked: handoverChecked[i] }));
      await supabase.from("handover_checklists").insert({
        shift_id: activeShift.id,
        profile_id: profile!.id,
        checklist_type: handoverType,
        items: items,
        completed_at: new Date().toISOString(),
        client_id: handoverClientId || null,
      });
      await log(`handover_${handoverType}`, "handover_checklist", activeShift.id);
    },
    onSuccess: () => {
      setHandoverChecklistOpen(false);
      toast({ title: `${handoverType === "incoming" ? "Incoming" : "Outgoing"} handover saved` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error("You must clock in before completing tasks.");
      if (!comment.trim()) throw new Error("Comment is required");
      if (selectedTask?.photo_required && !photoFile) throw new Error("Photo is required for this task");

      let photoUrl = null;
      if (photoFile) {
        const path = `${profile!.id}/${selectedTask.id}/${Date.now()}_${photoFile.name}`;
        const { error: upErr } = await supabase.storage.from("task-photos").upload(path, photoFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("task-photos").getPublicUrl(path);
        photoUrl = publicUrl;
      }

      await supabase.from("tasks").update({
        status: "completed",
        comment,
        photo_url: photoUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", selectedTask.id);
      await log("complete_task", "task", selectedTask.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sw-tasks"] });
      setCompleteOpen(false);
      setComment("");
      setPhotoFile(null);
      toast({ title: "Task completed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add progress note
  const addProgressNote = useMutation({
    mutationFn: async () => {
      if (!noteContent.trim()) throw new Error("Note content required");
      if (!noteClientId) throw new Error("Select a client");
      if (!activeShift) throw new Error("No active shift");

      let photoUrl = null;
      if (notePhotoFile) {
        const path = `${profile!.id}/${Date.now()}_${notePhotoFile.name}`;
        const { error } = await supabase.storage.from("progress-photos").upload(path, notePhotoFile);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("progress-photos").getPublicUrl(path);
        photoUrl = publicUrl;
      }

      await supabase.from("progress_notes").insert({
        shift_id: activeShift.id,
        client_id: noteClientId,
        profile_id: profile!.id,
        content: noteContent,
        photo_url: photoUrl,
      });
      await log("add_progress_note", "progress_note");
    },
    onSuccess: () => {
      setNoteContent("");
      setNotePhotoFile(null);
      setNoteClientId("");
      toast({ title: "Progress note saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add incident
  const addIncident = useMutation({
    mutationFn: async (form: FormData) => {
      if (!activeShift) throw new Error("No active shift");
      let photoUrl = null;
      const file = form.get("photo") as File;
      if (file && file.size > 0) {
        const path = `${profile!.id}/${Date.now()}_${file.name}`;
        await supabase.storage.from("incident-photos").upload(path, file);
        const { data: { publicUrl } } = supabase.storage.from("incident-photos").getPublicUrl(path);
        photoUrl = publicUrl;
      }
      await supabase.from("incident_reports").insert({
        shift_id: activeShift.id,
        client_id: form.get("client_id") as string,
        profile_id: profile!.id,
        title: form.get("title") as string,
        description: form.get("description") as string,
        severity: form.get("severity") as string,
        photo_url: photoUrl,
      });
      await log("add_incident_report", "incident_report");
    },
    onSuccess: () => {
      setIncidentOpen(false);
      toast({ title: "Incident report saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add ABC chart
  const addABC = useMutation({
    mutationFn: async (form: FormData) => {
      if (!activeShift) throw new Error("No active shift");
      await supabase.from("abc_charts").insert({
        shift_id: activeShift.id,
        client_id: form.get("client_id") as string,
        profile_id: profile!.id,
        antecedent: form.get("antecedent") as string,
        behaviour: form.get("behaviour") as string,
        consequence: form.get("consequence") as string,
        notes: form.get("notes") as string || null,
      });
      await log("add_abc_chart", "abc_chart");
    },
    onSuccess: () => {
      setAbcOpen(false);
      toast({ title: "ABC chart saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleClockOutRequest = () => {
    setClockOutConfirmOpen(true);
  };

  const handleClockOutConfirmed = (handoverDone: boolean) => {
    setClockOutConfirmOpen(false);
    if (handoverDone) {
      // Show outgoing handover checklist first
      setHandoverType("outgoing");
      setHandoverChecked(HANDOVER_ITEMS.map(() => false));
      setHandoverChecklistOpen(true);
    }
    // Proceed with clock out after either path
    clockOut.mutate();
  };

  const completedCount = tasks.filter(t => t.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">My Shift</h1>
          <p className="text-muted-foreground">
            {activeShift ? `Shift started ${format(new Date(activeShift.start_time!), "h:mm a")}` : "No active shift"}
          </p>
        </div>
        {!activeShift ? (
          <Button onClick={handleClockInAttempt} disabled={clockIn.isPending || geoLoading}>
            <Play className="mr-2 h-4 w-4" /> {geoLoading ? "Getting location..." : "Clock In"}
          </Button>
        ) : (
          <Button variant="destructive" onClick={handleClockOutRequest} disabled={clockOut.isPending || geoLoading}>
            <Square className="mr-2 h-4 w-4" /> Clock Out
          </Button>
        )}
      </div>

      {activeShift && (
        <Tabs defaultValue="tasks" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="abc">ABC</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">{completedCount}/{tasks.length} tasks completed</p>
            {tasks.map((task: any) => (
              <Card key={task.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.photo_required && <Badge variant="outline" className="text-xs"><Camera className="h-3 w-3 mr-1" />Photo req.</Badge>}
                      {task.is_end_of_day && <Badge variant="outline" className="text-xs">End-of-day</Badge>}
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.status === "completed" ? "default" : "secondary"}>{task.status}</Badge>
                    {task.status !== "completed" && (
                      <Button size="sm" variant="outline" onClick={() => { setSelectedTask(task); setCompleteOpen(true); }}>Complete</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Progress Notes Tab */}
          <TabsContent value="notes" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Add Progress Note</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={noteClientId} onValueChange={setNoteClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Write progress note..." rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Photo (optional)</Label>
                  <Input type="file" accept="image/*" onChange={e => setNotePhotoFile(e.target.files?.[0] || null)} />
                </div>
                <Button onClick={() => addProgressNote.mutate()} disabled={addProgressNote.isPending} className="w-full">
                  <FileText className="mr-2 h-4 w-4" /> Save Note
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Log Incident</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={e => { e.preventDefault(); addIncident.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <select name="client_id" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select client</option>
                      {clients.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea name="description" required rows={3} /></div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <select name="severity" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Photo</Label><Input name="photo" type="file" accept="image/*" /></div>
                  <Button type="submit" className="w-full" disabled={addIncident.isPending}>
                    <AlertTriangle className="mr-2 h-4 w-4" /> Submit Report
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABC Tab */}
          <TabsContent value="abc" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">ABC Chart</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={e => { e.preventDefault(); addABC.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <select name="client_id" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select client</option>
                      {clients.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>Antecedent (what happened before)</Label><Textarea name="antecedent" required rows={2} /></div>
                  <div className="space-y-2"><Label>Behaviour (what the person did)</Label><Textarea name="behaviour" required rows={2} /></div>
                  <div className="space-y-2"><Label>Consequence (what happened after)</Label><Textarea name="consequence" required rows={2} /></div>
                  <div className="space-y-2"><Label>Additional Notes</Label><Textarea name="notes" rows={2} /></div>
                  <Button type="submit" className="w-full" disabled={addABC.isPending}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Save ABC Chart
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">Your recent shifts this fortnight</p>
            {fortnightShifts.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(s.start_time || s.created_at), "EEEE, MMM d")}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.start_time && format(new Date(s.start_time), "h:mm a")}
                      {s.end_time && ` → ${format(new Date(s.end_time), "h:mm a")}`}
                    </p>
                  </div>
                  <Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {fortnightShifts.length === 0 && (
              <Card><CardContent className="py-6 text-center text-muted-foreground">No shifts this fortnight</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Clock-in prompt when no active shift */}
      {!activeShift && (
        <Card className="mt-4">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Clock in to start your shift</p>
            <p className="text-sm text-muted-foreground mt-1">Your location will be recorded when you clock in</p>
          </CardContent>
        </Card>
      )}

      {/* Task complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Task: {selectedTask?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label><MessageSquare className="inline h-4 w-4 mr-1" /> Comment (required)</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe what was done..." />
            </div>
            <div className="space-y-2">
              <Label><Camera className="inline h-4 w-4 mr-1" /> Photo {selectedTask?.photo_required ? "(required)" : "(optional)"}</Label>
              <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={() => completeTask.mutate()} disabled={completeTask.isPending} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clock-Out Handover Confirmation Dialog */}
      <Dialog open={clockOutConfirmOpen} onOpenChange={setClockOutConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Before you clock out</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Have you completed the handover to the next staff member?
          </p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => handleClockOutConfirmed(true)} className="flex-1">
              Yes, handover completed
            </Button>
            <Button variant="outline" onClick={() => handleClockOutConfirmed(false)} className="flex-1">
              No next staff / End of day
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Early Clock-In Denial */}
      <EarlyClockInDialog
        open={earlyClockInOpen}
        onOpenChange={setEarlyClockInOpen}
        scheduledStart={earlyClockInScheduledStart}
      />

      {/* Handover Checklist Dialog */}
      <Dialog open={handoverChecklistOpen} onOpenChange={setHandoverChecklistOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{handoverType === "incoming" ? "Incoming" : "Outgoing"} Handover Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select value={handoverClientId} onValueChange={setHandoverClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {HANDOVER_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Checkbox
                    checked={handoverChecked[i]}
                    onCheckedChange={(checked) => {
                      const next = [...handoverChecked];
                      next[i] = !!checked;
                      setHandoverChecked(next);
                    }}
                  />
                  <Label className="text-sm font-normal">{item}</Label>
                </div>
              ))}
            </div>
            <Button
              onClick={() => saveHandover.mutate()}
              disabled={saveHandover.isPending}
              className="w-full"
            >
              <ClipboardList className="mr-2 h-4 w-4" /> Save Handover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
