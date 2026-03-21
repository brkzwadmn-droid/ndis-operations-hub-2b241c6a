import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Plus, Loader2, User, Briefcase, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

const roleOptions = [
  { value: "support_worker", label: "Support Worker" },
  { value: "team_leader", label: "Team Leader" },
  { value: "manager", label: "Manager" },
];

const directorRoleOption = { value: "director", label: "Director" };

interface CreateStaffDialogProps {
  callerRole: string;
}

export default function CreateStaffDialog({ callerRole }: CreateStaffDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmployment, setShowEmployment] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const canCreateDirector = callerRole === "director" || callerRole === "admin";
  const availableRoles = canCreateDirector ? [...roleOptions, directorRoleOption] : roleOptions;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const role = form.get("role") as string;
    const full_name = form.get("full_name") as string;
    const email = form.get("email") as string;

    // Director creation goes through dual-approval
    if (role === "director") {
      try {
        const payload: Record<string, unknown> = { full_name, email, role };
        // Add optional fields
        const optFields = ["phone", "personal_email", "home_suburb", "start_date", "company", "employment_type", "pay_rate", "ndis_screening_number", "ndis_screening_expiry", "wwcc_number", "wwcc_expiry", "first_aid_expiry", "cpr_expiry", "police_check_issue_date"];
        optFields.forEach(f => { const v = form.get(f); if (v) payload[f] = v; });

        const { error } = await supabase.from("staff_changes").insert({
          operation: "create",
          requested_by: profile!.id,
          payload,
        });
        if (error) throw error;

        const { data: directors } = await supabase.from("profiles").select("id").eq("role", "director").neq("id", profile!.id);
        if (directors) {
          await supabase.from("notifications").insert(
            directors.map(d => ({
              profile_id: d.id,
              title: "Director Creation Pending Approval",
              message: `${profile?.full_name} requested to create a new Director: ${full_name}`,
              link: "/staff-management",
            }))
          );
        }
        await log("request_create_director", "staff_change", undefined, { email });
        toast({ title: "Director creation submitted for approval", description: "The other Director must approve this request." });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
        setOpen(false);
      }
      return;
    }

    // Non-director: create directly via edge function
    try {
      const { data: session } = await supabase.auth.getSession();
      const body: Record<string, unknown> = { full_name, email, role };

      const optFields = [
        "phone", "personal_email", "home_suburb", "start_date",
        "company", "employment_type", "pay_rate",
        "ndis_screening_number", "ndis_screening_expiry",
        "wwcc_number", "wwcc_expiry",
        "first_aid_expiry", "cpr_expiry", "police_check_issue_date",
      ];
      optFields.forEach(f => {
        const v = form.get(f) as string;
        if (v) body[f] = f === "pay_rate" ? parseFloat(v) : v;
      });

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create user");

      await log("create_staff", "staff_change", result.user?.id, { email, role });
      queryClient.invalidateQueries({ queryKey: ["all-staff-mgmt"] });
      toast({ title: "Staff member created", description: `An invite email has been sent to ${email}` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const selectClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Staff</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-display">Add New Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Basic Info ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-secondary" />
              Basic Information
            </div>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Full Legal Name <span className="text-destructive">*</span></Label>
                <Input name="full_name" required placeholder="e.g. John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Login Email <span className="text-destructive">*</span></Label>
                <Input name="email" type="email" required placeholder="john@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Role <span className="text-destructive">*</span></Label>
                <select name="role" required className={selectClass}>
                  {availableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Phone Number</Label>
                  <Input name="phone" type="tel" placeholder="0400 000 000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Personal Email</Label>
                  <Input name="personal_email" type="email" placeholder="personal@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Home Suburb</Label>
                  <Input name="home_suburb" placeholder="e.g. Parramatta" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Date</Label>
                  <Input name="start_date" type="date" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Employment ── */}
          <div className="border-t pt-4">
            <button type="button" onClick={() => setShowEmployment(!showEmployment)} className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-secondary" />
                Employment Details
              </div>
              {showEmployment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showEmployment && (
              <div className="grid gap-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Company</Label>
                    <select name="company" className={selectClass}>
                      <option value="">Select...</option>
                      <option value="rehoboth">Rehoboth</option>
                      <option value="mars_hill">Mars Hill</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Employment Type</Label>
                    <select name="employment_type" className={selectClass}>
                      <option value="">Select...</option>
                      <option value="payroll">Payroll Employee</option>
                      <option value="abn_contractor">ABN Contractor</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Pay Rate ($/hr)</Label>
                  <Input name="pay_rate" type="number" step="0.01" min="0" placeholder="e.g. 32.50" />
                </div>
              </div>
            )}
          </div>

          {/* ── Compliance ── */}
          <div className="border-t pt-4">
            <button type="button" onClick={() => setShowCompliance(!showCompliance)} className="flex items-center justify-between w-full text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                Compliance Documents
              </div>
              {showCompliance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showCompliance && (
              <div className="grid gap-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">NDIS Screening Number</Label>
                    <Input name="ndis_screening_number" placeholder="Clearance number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">NDIS Screening Expiry</Label>
                    <Input name="ndis_screening_expiry" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">WWCC Number</Label>
                    <Input name="wwcc_number" placeholder="WWCC number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">WWCC Expiry</Label>
                    <Input name="wwcc_expiry" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">First Aid Expiry</Label>
                    <Input name="first_aid_expiry" type="date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">CPR Expiry</Label>
                    <Input name="cpr_expiry" type="date" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Police Check Issue Date</Label>
                  <Input name="police_check_issue_date" type="date" />
                </div>
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              An invite email will be sent to the staff member with a link to set their password.
            </p>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {isLoading ? "Creating..." : "Create Staff Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
