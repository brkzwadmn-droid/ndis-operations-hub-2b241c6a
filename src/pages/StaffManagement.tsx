import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import CreateStaffDialog from "@/components/staff/CreateStaffDialog";
import { Pencil, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  director: "Director",
  admin: "Administrator",
  manager: "Manager",
  team_leader: "Team Leader",
  support_worker: "Support Worker",
};

export default function StaffManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const callerRole = profile?.role || "support_worker";
  const isDirectorOrAdmin = callerRole === "director" || callerRole === "admin";

  // Fetch all staff
  const { data: staff = [] } = useQuery({
    queryKey: ["all-staff-mgmt"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("role");
      return data || [];
    },
  });

  // Fetch pending staff changes (only for directors/admins)
  const { data: pendingChanges = [] } = useQuery({
    queryKey: ["staff-changes"],
    enabled: isDirectorOrAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_changes")
        .select("*, requester:profiles!staff_changes_requested_by_fkey(full_name), approver:profiles!staff_changes_approved_by_fkey(full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data || [];
    },
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
        await supabase.from("notifications").insert(
          directors.map(d => ({
            profile_id: d.id,
            title: "Staff Update Pending Approval",
            message: `${profile?.full_name} requested to update: ${selectedStaff.full_name}`,
            link: "/staff-management",
          }))
        );
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
        await supabase.from("notifications").insert(
          directors.map(d => ({
            profile_id: d.id,
            title: "Staff Deletion Pending Approval",
            message: `${profile?.full_name} requested to delete: ${selectedStaff.full_name}`,
            link: "/staff-management",
          }))
        );
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

      const { error } = await supabase.from("staff_changes").update({
        status: "approved",
        approved_by: profile!.id,
      }).eq("id", changeId);
      if (error) throw error;

      // Execute the operation
      if (change.operation === "create") {
        const p = change.payload as any;
        // Use admin-create-user edge function for director creation
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email: p.email, full_name: p.full_name, role: p.role }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to create user");
      } else if (change.operation === "update") {
        const p = change.payload as any;
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ user_id: change.target_user_id, email: p.email, full_name: p.full_name }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to update auth user");

        await supabase.from("profiles").update({
          full_name: p.full_name,
          email: p.email,
          role: p.role,
        }).eq("id", change.target_user_id);
        await supabase.from("user_roles").update({ role: p.role }).eq("user_id", change.target_user_id);
      } else if (change.operation === "delete") {
        await supabase.from("profiles").delete().eq("id", change.target_user_id);
      }

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

  // Managers can only edit/delete non-director staff
  const canManageStaff = (member: any) => {
    if (member.id === profile?.id) return false;
    if (isDirectorOrAdmin) return true;
    if (callerRole === "manager" && member.role !== "director" && member.role !== "admin") return true;
    return false;
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            {staff.length} team members
            {pendingChanges.length > 0 && ` · ${pendingChanges.length} pending changes`}
          </p>
        </div>
        <CreateStaffDialog callerRole={callerRole} />
      </div>

      {/* Pending Changes (directors/admins only) */}
      {isDirectorOrAdmin && pendingChanges.length > 0 && (
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
                      <span className="text-sm font-medium">{change.payload?.full_name || "Unknown"}</span>
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
                {canManageStaff(member) && (
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
                {isDirectorOrAdmin && <option value="director">Director</option>}
                <option value="manager">Manager</option>
                <option value="team_leader">Team Leader</option>
                <option value="support_worker">Support Worker</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">This change requires approval from a Director.</p>
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
            This will need approval from a Director.
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
