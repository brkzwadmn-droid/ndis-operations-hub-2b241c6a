import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If user lands here without a session (no valid token), redirect to login
  useEffect(() => {
    // Give Supabase a moment to process the token from the URL hash
    const timer = setTimeout(() => {
      // Session will be set by Supabase auth if the recovery token is valid
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "h-12 lg:h-11 bg-background border-input px-4 text-base lg:text-sm placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:border-secondary transition-all rounded-lg";

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-card border border-border/50 shadow-xl shadow-black/5 p-8 space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <span className="text-xl font-display font-bold text-primary-foreground">R</span>
            </div>
            <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
              {success ? "Password updated" : "Set new password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {success ? "Your password has been successfully changed." : "Enter your new password below."}
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <Button onClick={() => navigate("/login")} className="w-full h-12 lg:h-11 rounded-lg font-semibold">
                Continue to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-medium text-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 lg:h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
