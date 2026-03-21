import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  // Admin role gets the same access as director
  const effectiveRole = profile?.role === "admin" ? "director" : profile?.role;
  if (allowedRoles && profile && !allowedRoles.includes(effectiveRole!)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
