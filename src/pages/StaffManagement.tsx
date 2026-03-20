import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  director: "Director",
  manager: "Manager",
  team_leader: "Team Leader",
  support_worker: "Support Worker",
};

export default function StaffManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Fetch all staff
  const { data: staff = [] } = useQuery({
    queryKey: ["all-staff-mgmt"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("role");
      return data || [];
    },
  });

  // Fetch pending staff changes
  const { data: pendingChanges = [] } = useQuery({
    queryKey: ["staff-changes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_changes")
        .select("*, requester:profiles!staff_changes_requested_by_fkey(full_name), approver:profiles!staff_changes_approved_by_fkey(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Request create staff
  const requestCreate = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        full_name: form.get("full_name") as string,
        email: form.get("email") as string,
        password: form.get("password") as string,
        role: form.get("role") as string,
      };
      const { error } = await supabase.from("staff_changes").insert({
        operation: "create",
        requested_by: profile!.id,
        payload,
      });
      if (error) throw error;

      // Notify other directors
      const { data: directors } = await supabase.from("profiles").select("id").eq("role", "director").neq("id", profile!.id);
      if (directors) {
        const notifs = directors.map(d => ({
          profile_id: d.id,
          title: "Staff Change Pending Approval",
          message: `${profile?.full_name} requested to create staff: ${payload.full_name}`,
          link: "/staff-management",
        }));
        await supabase.from("notifications").insert(notifs);
      }
      await log("request_create_staff", "staff_change", undefined, { email: payload.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-changes"] });
      setCreateOpen(false);
      toast({ title: "Staff creation request submitted for approval" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Request update staff
  const requestUpdate = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        full_name: form.get("full_name") as string,
        email: form.get("email") as string,
        role: form.get("role") as string,
      };
      const { error } = await supabase.from("staff_changes").insert({
        operation: "update",
        target_user_id: selectedStaff.id,
        requested_by: profile!.id,
        payload,
      });
      if (error) throw error;

      const { data: directors } = await supabase.from("profiles").select("id").eq("role", "director").neq("id", profile!.id);
      if (directors) {
        const notifs = directors.map(d => ({
          profile_id: d.id,
          title: "Staff Update Pending Approval",
          message: `${profile?.full_name} requested to update: ${selectedStaff.full_name}`,
          link: "/staff-management",
        }));
        await supabase.from("notifications").insert(notifs);
      }
      await log("request_update_staff", "staff_change", selectedStaff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-changes"] });
      setEditOpen(false);
      setSelectedStaff(null);
      toast({ title: "Staff update request submitted for approval" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Request delete staff
  const requestDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_changes").insert({
        operation: "delete",
        target_user_id: selectedStaff.id,
        requested_by: profile!.id,
        payload: { full_name: selectedStaff.full_name, email: selectedStaff.email },
      });
      if (error) throw error;

      const { data: directors } = await supabase.from("profiles").select("id").eq("role", "director").neq("id", profile!.id);
      if (directors) {
        const notifs = directors.map(d => ({
          profile_id: d.id,
          title: "Staff Deletion Pending Approval",
          message: `${profile?.full_name} requested to delete: ${selectedStaff.full_name}`,
          link: "/staff-management",
        }));
        await supabase.from("notifications").insert(notifs);
      }
      await log("request_delete_staff", "staff_change", selectedStaff.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-changes"] });
      setDeleteOpen(false);
      setSelectedStaff(null);
      toast({ title: "Staff deletion request submitted for approval" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Approve a pending change (must be different director)
  const approveChange = useMutation({
    mutationFn: async (changeId: string) => {
      const change = pendingChanges.find((c: any) => c.id === changeId);
      if (!change) throw new Error("Change not found");
      if (change.requested_by === profile!.id) throw new Error("You cannot approve your own request. A different Director must approve.");

      // Mark as approved
      const { error } = await supabase.from("staff_changes").update({
        status: "approved",
        approved_by: profile!.id,
      }).eq("id", changeId);
      if (error) throw error;

      // Execute the operation
      if (change.operation === "create") {
        const p = change.payload as any;
        const { error: signUpErr } = await supabase.auth.signUp({
          email: p.email,
          password: p.password,
          options: { data: { full_name: p.full_name, role: p.role } },
        });
        if (signUpErr) throw signUpErr;
      } else if (change.operation === "update") {
        const p = change.payload as any;
        await supabase.from("profiles").update({
          full_name: p.full_name,
          email: p.email,
          role: p.role,
        }).eq("id", change.target_user_id);
        await supabase.from("user_roles").update({ role: p.role }).eq("user_id", change.target_user_id);
      } else if (change.operation === "delete") {
        await supabase.from("profiles").delete().eq("id", change.target_user_id);
      }

      // Notify requester
      await supabase.from("notifications").insert({
        profile_id: change.requested_by,
        title: "Staff Change Approved",
        message: `Your ${change.operation} request has been approved by ${profile?.full_name}.`,
        link: "/staff-management",
      });
      await log("approve_staff_change", "staff_change", changeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-changes"] });
      queryClient.invalidateQueries({ queryKey: ["all-staff-mgmt"] });
      toast({ title: "Change approved and applied" });
    },
    onError: (e: any) => toast({ title: "Cannot approve", description: e.message, variant: "destructive" }),
  });

  // Reject a pending change
  const rejectChange = useMutation({
    mutationFn: async (changeId: string) => {
      const change = pendingChanges.find((c: any) => c.id === changeId);
      if (!change) throw new Error("Change not found");

      await supabase.from("staff_changes").update({
        status: "rejected",
        approved_by: profile!.id,
      }).eq("id", changeId);

      await supabase.from("notifications").insert({
        profile_id: change.requested_by,
        title: "Staff Change Rejected",
        message: `Your ${change.operation} request was rejected by ${profile?.full_name}.`,
        link: "/staff-management",
      });
      await log("reject_staff_change", "staff_change", changeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-changes"] });
      toast({ title: "Change rejected" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const operationBadge: Record<string, string> = {
    create: "default",
    update: "secondary",
    delete: "destructive",
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Staff Management</h1>
          <p className="text-muted-foreground">{staff.length} team members · {pendingChanges.length} pending changes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); requestCreate.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" required /></div>
              <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required /></div>
              <div className="space-y-2"><Label>Password</Label><Input name="password" type="password" required minLength={6} /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select name="role" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="manager">Manager</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="support_worker">Support Worker</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">This request will need approval from the other Director before it takes effect.</p>
              <Button type="submit" className="w-full" disabled={requestCreate.isPending}>
                {requestCreate.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Changes */}
      {pendingChanges.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Pending Approval</h2>
          <div className="space-y-2">
            {pendingChanges.map((change: any) => (
              <Card key={change.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={operationBadge[change.operation] as any}>{change.operation}</Badge>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {change.payload?.full_name || "Unknown"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested by {change.requester?.full_name} · {format(new Date(change.created_at), "MMM d, h:mm a")}
                    </p>
                    {change.payload?.email && (
                      <p className="text-xs text-muted-foreground">{change.payload.email} · {roleLabels[change.payload?.role] || change.payload?.role}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {change.requested_by !== profile?.id ? (
                      <>
                        <Button size="sm" onClick={() => approveChange.mutate(change.id)} disabled={approveChange.isPending}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectChange.mutate(change.id)} disabled={rejectChange.isPending}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" /> Awaiting other Director
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">All Staff</h2>
        {staff.map((member: any) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between py-3">
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
                <Badge variant="outline">{roleLabels[member.role] || member.role}</Badge>
                {member.id !== profile?.id && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedStaff(member); setEditOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setSelectedStaff(member); setDeleteOpen(true); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Staff: {selectedStaff?.full_name}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); requestUpdate.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" defaultValue={selectedStaff?.full_name} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={selectedStaff?.email} required /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select name="role" defaultValue={selectedStaff?.role} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="director">Director</option>
                <option value="manager">Manager</option>
                <option value="team_leader">Team Leader</option>
                <option value="support_worker">Support Worker</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">This change requires approval from the other Director.</p>
            <Button type="submit" className="w-full" disabled={requestUpdate.isPending}>
              {requestUpdate.isPending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Staff Member</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to request deletion of <strong>{selectedStaff?.full_name}</strong>?
            This will need approval from the other Director.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="destructive" onClick={() => requestDelete.mutate()} disabled={requestDelete.isPending} className="flex-1">
              {requestDelete.isPending ? "Submitting..." : "Request Deletion"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
