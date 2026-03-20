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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Camera, MessageSquare, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function Tasks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isDirector = profile?.role === "director";
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      let q = supabase
        .from("tasks")
        .select("*, assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name), assigned_by_profile:profiles!tasks_assigned_by_fkey(full_name)")
        .order("due_date", { ascending: false });
      if (!isDirector) {
        q = q.eq("assigned_to", profile!.id);
      }
      const { data } = await q;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .neq("role", "director");
      return data || [];
    },
    enabled: isDirector,
  });

  const createTask = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("tasks").insert({
        title: form.get("title") as string,
        description: form.get("description") as string,
        assigned_by: profile!.id,
        assigned_to: form.get("assigned_to") as string,
        due_date: form.get("due_date") as string,
        is_end_of_day: form.get("is_end_of_day") === "true",
      });
      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        profile_id: form.get("assigned_to") as string,
        title: "New Task Assigned",
        message: `You've been assigned: ${form.get("title")}`,
        link: "/tasks",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setCreateOpen(false);
      toast({ title: "Task created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeTask = useMutation({
    mutationFn: async () => {
      if (!comment.trim()) throw new Error("Comment is required");
      if (!photoFile) throw new Error("Photo is required");

      // Upload photo
      const path = `${profile!.id}/${selectedTask.id}/${Date.now()}_${photoFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("task-photos").upload(path, photoFile);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("task-photos").getPublicUrl(path);

      const { error } = await supabase.from("tasks").update({
        status: "completed",
        comment,
        photo_url: publicUrl,
        completed_at: new Date().toISOString(),
      }).eq("id", selectedTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setCompleteOpen(false);
      setComment("");
      setPhotoFile(null);
      setSelectedTask(null);
      toast({ title: "Task completed!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createTask.mutate(new FormData(e.currentTarget));
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Tasks</h1>
          <p className="text-muted-foreground">{isDirector ? "Manage and assign tasks" : "Your assigned tasks"}</p>
        </div>
        {isDirector && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Assign Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign New Task</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input name="title" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" />
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <select name="assigned_to" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select staff member</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input name="due_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="is_end_of_day" value="true" id="eod" />
                  <Label htmlFor="eod" className="text-sm">End-of-day task (e.g., 15-min finalisation call)</Label>
                </div>
                <Button type="submit" className="w-full" disabled={createTask.isPending}>
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Task</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Add a comment and attach a photo to mark this task complete.</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label><MessageSquare className="inline h-4 w-4 mr-1" /> Comment (required)</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Describe what was done..." />
            </div>
            <div className="space-y-2">
              <Label><Camera className="inline h-4 w-4 mr-1" /> Photo proof (required)</Label>
              <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={() => completeTask.mutate()} disabled={completeTask.isPending} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              {completeTask.isPending ? "Completing..." : "Mark Complete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task List */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : tasks.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No tasks found</CardContent></Card>
        ) : (
          tasks.map((task: any) => (
            <Card key={task.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{task.title}</p>
                    {task.is_end_of_day && <Badge variant="outline" className="text-xs">End-of-day</Badge>}
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {isDirector && <span>Assigned to: {task.assigned_to_profile?.full_name}</span>}
                    <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                    {task.status}
                  </Badge>
                  {task.status !== "completed" && !isDirector && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedTask(task); setCompleteOpen(true); }}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
