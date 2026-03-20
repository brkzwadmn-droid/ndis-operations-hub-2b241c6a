import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Finance() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["finance-entries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("finance_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      return data || [];
    },
  });

  const income = entries.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expense = entries.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);

  const createEntry = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("finance_entries").insert({
        type: form.get("type") as "income" | "expense",
        amount: parseFloat(form.get("amount") as string),
        description: form.get("description") as string,
        entry_date: form.get("entry_date") as string,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      setOpen(false);
      toast({ title: "Entry added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createEntry.mutate(new FormData(e.currentTarget));
  };

  return (
    <DashboardLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Finance</h1>
          <p className="text-muted-foreground">Income, expenses, and profit/loss overview</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Entry</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Finance Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select name="type" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input name="amount" type="number" step="0.01" min="0" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input name="entry_date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
              </div>
              <Button type="submit" className="w-full" disabled={createEntry.isPending}>
                {createEntry.isPending ? "Adding..." : "Add Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <StatCard title="Total Income" value={`$${income.toLocaleString()}`} icon={TrendingUp} />
        <StatCard title="Total Expenses" value={`$${expense.toLocaleString()}`} icon={TrendingDown} />
        <StatCard title="Profit/Loss" value={`$${(income - expense).toLocaleString()}`} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Entries</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.entry_date), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.type === "income" ? "default" : "destructive"}>
                      {entry.type}
                    </Badge>
                    <span className={`text-sm font-semibold ${entry.type === "income" ? "text-success" : "text-destructive"}`}>
                      ${Number(entry.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
