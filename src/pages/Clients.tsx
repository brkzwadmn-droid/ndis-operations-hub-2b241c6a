import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, User, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Clients() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDirector = profile?.role === "director";
  const [open, setOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").order("full_name");
      return data || [];
    },
  });

  const createClient = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("clients").insert({
        full_name: form.get("full_name") as string,
        ndis_number: form.get("ndis_number") as string || null,
        address: form.get("address") as string || null,
        expected_lat: form.get("expected_lat") ? Number(form.get("expected_lat")) : null,
        expected_lng: form.get("expected_lng") ? Number(form.get("expected_lng")) : null,
        notes: form.get("notes") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      toast({ title: "Client added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clients</h1>
          <p className="text-muted-foreground">{clients.length} active clients</p>
        </div>
        {isDirector && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); createClient.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><Input name="full_name" required /></div>
                <div className="space-y-2"><Label>NDIS Number</Label><Input name="ndis_number" /></div>
                <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Expected Latitude</Label><Input name="expected_lat" type="number" step="any" /></div>
                  <div className="space-y-2"><Label>Expected Longitude</Label><Input name="expected_lng" type="number" step="any" /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" /></div>
                <Button type="submit" className="w-full" disabled={createClient.isPending}>
                  {createClient.isPending ? "Adding..." : "Add Client"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {clients.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No clients yet</CardContent></Card>
        ) : clients.map((client: any) => (
          <Card key={client.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/clients/${client.id}`)}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{client.full_name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {client.ndis_number && <span>NDIS: {client.ndis_number}</span>}
                    {client.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{client.address}</span>}
                  </div>
                </div>
              </div>
              <Badge variant={client.is_active ? "default" : "secondary"}>
                {client.is_active ? "Active" : "Inactive"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
