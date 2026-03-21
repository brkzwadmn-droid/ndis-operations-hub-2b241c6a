import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TeamLeader from "./pages/TeamLeader";
import Tasks from "./pages/Tasks";
import Shifts from "./pages/Shifts";
import Approvals from "./pages/Approvals";
import Notifications from "./pages/Notifications";
import Finance from "./pages/Finance";
import Staff from "./pages/Staff";
import Clients from "./pages/Clients";
import ClientTimeline from "./pages/ClientTimeline";
import ShiftReview from "./pages/ShiftReview";
import AuditLog from "./pages/AuditLog";
import Reports from "./pages/Reports";
import SupportWorkerShift from "./pages/SupportWorkerShift";
import StaffManagement from "./pages/StaffManagement";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/shifts" element={<ProtectedRoute allowedRoles={["director", "admin", "manager"]}><Shifts /></ProtectedRoute>} />
            <Route path="/my-shift" element={<ProtectedRoute allowedRoles={["support_worker", "team_leader"]}><SupportWorkerShift /></ProtectedRoute>} />
            <Route path="/team-leader" element={<ProtectedRoute allowedRoles={["team_leader"]}><TeamLeader /></ProtectedRoute>} />
            <Route path="/approvals" element={<ProtectedRoute allowedRoles={["director", "admin"]}><Approvals /></ProtectedRoute>} />
            <Route path="/shift-review" element={<ProtectedRoute allowedRoles={["director", "admin"]}><ShiftReview /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={["director", "admin", "manager"]}><Clients /></ProtectedRoute>} />
            <Route path="/clients/:clientId" element={<ProtectedRoute allowedRoles={["director", "admin", "manager"]}><ClientTimeline /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute allowedRoles={["director", "admin"]}><Finance /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute allowedRoles={["director", "admin"]}><Staff /></ProtectedRoute>} />
            <Route path="/staff-management" element={<ProtectedRoute allowedRoles={["director", "admin", "manager"]}><StaffManagement /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={["director", "admin"]}><Reports /></ProtectedRoute>} />
            <Route path="/audit-log" element={<ProtectedRoute allowedRoles={["director", "admin"]}><AuditLog /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
