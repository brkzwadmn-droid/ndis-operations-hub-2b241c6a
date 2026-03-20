import { useAuth } from "@/lib/auth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  CheckSquare,
  Bell,
  DollarSign,
  Users,
  LogOut,
  Shield,
  UserCheck,
  FileText,
  ClipboardList,
  BarChart3,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  director: "Director",
  manager: "Manager",
  team_leader: "Team Leader",
  support_worker: "Support Worker",
};

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", roles: ["director", "manager", "team_leader", "support_worker"] },
  { label: "Tasks", icon: ListTodo, href: "/tasks", roles: ["director", "manager", "team_leader", "support_worker"] },
  { label: "Shifts", icon: Clock, href: "/shifts", roles: ["director", "manager"] },
  { label: "My Shift", icon: Clock, href: "/my-shift", roles: ["support_worker", "team_leader"] },
  { label: "Approvals", icon: CheckSquare, href: "/approvals", roles: ["director"] },
  { label: "Shift Review", icon: ClipboardList, href: "/shift-review", roles: ["director"] },
  { label: "Clients", icon: UserCheck, href: "/clients", roles: ["director", "manager"] },
  { label: "Staff Overview", icon: Users, href: "/staff", roles: ["director"] },
  { label: "Staff Management", icon: UserCheck, href: "/staff-management", roles: ["director"] },
  { label: "Finance", icon: DollarSign, href: "/finance", roles: ["director"] },
  { label: "Reports", icon: BarChart3, href: "/reports", roles: ["director"] },
  { label: "Audit Log", icon: ScrollText, href: "/audit-log", roles: ["director"] },
  { label: "Notifications", icon: Bell, href: "/notifications", roles: ["director", "manager", "team_leader", "support_worker"] },
];

export default function AppSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = profile?.role || "support_worker";

  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-display font-bold text-sidebar-foreground">NDIS ERP</p>
          <p className="text-xs text-sidebar-foreground/60">{roleLabels[role]}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {filtered.map((item) => {
          const active = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-muted text-xs font-bold text-sidebar-foreground">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
          </div>
          <button
            onClick={() => { signOut(); navigate("/login"); }}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
