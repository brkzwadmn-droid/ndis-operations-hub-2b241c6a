import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type View = "login" | "forgot" | "magic-sent" | "reset-sent";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<View>("login");
  const { signIn, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithMagicLink(email);
      setView("magic-sent");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      await resetPassword(email);
      setView("reset-sent");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () =>
    toast({
      title: "Contact your administrator",
      description: "New accounts must be created by a Director through Staff Management.",
    });

  // Shared input style
  const inputClass = "h-12 lg:h-11 bg-background border-input px-4 text-base lg:text-sm placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:border-secondary transition-all rounded-lg";

  // --- Form content based on view ---
  const renderForm = () => {
    if (view === "magic-sent") {
      return (
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
            <Mail className="h-7 w-7 text-secondary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-display font-bold text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a sign-in link to<br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60">Click the link in the email to sign in. You can close this tab.</p>
          <Button variant="ghost" className="text-sm" onClick={() => setView("login")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
          </Button>
        </div>
      );
    }

    if (view === "reset-sent") {
      return (
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
            <Mail className="h-7 w-7 text-secondary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-display font-bold text-foreground">Reset link sent</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Password reset instructions have been sent to<br />
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60">Follow the link in the email to set a new password.</p>
          <Button variant="ghost" className="text-sm" onClick={() => setView("login")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
          </Button>
        </div>
      );
    }

    if (view === "forgot") {
      return (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </p>
          <Button
            type="submit"
            className="w-full h-12 lg:h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all rounded-lg"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reset link
          </Button>
          <div className="text-center">
            <button type="button" onClick={() => setView("login")} className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
          </div>
        </form>
      );
    }

    // Default: login form
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="h-[18px] w-[18px] rounded border-muted-foreground/30 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground font-normal cursor-pointer select-none">
              Remember me
            </Label>
          </div>
          <button
            type="button"
            onClick={() => setView("forgot")}
            className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full h-12 lg:h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all rounded-lg group"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
          {!isLoading && <ArrowRight className="ml-2 h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
          <div className="relative flex justify-center">
            <span className="bg-card lg:bg-background px-3 text-[11px] font-medium text-muted-foreground/50 uppercase tracking-widest">or</span>
          </div>
        </div>

        {/* Magic link button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleMagicLink}
          className="w-full h-12 lg:h-11 font-medium text-sm rounded-lg border-border hover:bg-muted/50 transition-all"
          disabled={isLoading}
        >
          <Mail className="mr-2 h-4 w-4" />
          Sign in with email link
        </Button>
      </form>
    );
  };

  const headerTitle = view === "forgot" ? "Reset your password" : "Sign in to your account";

  return (
    <div className="flex min-h-screen min-h-[100dvh]">
      {/* Left panel — desktop branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "40px 40px" }} />
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <h2 className="text-3xl font-display font-bold text-primary-foreground tracking-tight">Rehoboth</h2>
          <div className="space-y-6">
            <h3 className="text-4xl font-display font-bold text-primary-foreground leading-tight max-w-md">Streamlined operations for your team</h3>
            <p className="text-primary-foreground/60 text-lg max-w-sm leading-relaxed">Manage shifts, staff, clients, and compliance all in one place.</p>
          </div>
          <p className="text-primary-foreground/30 text-sm">&copy; {new Date().getFullYear()} Rehoboth. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 flex-col">
        {/* ── Mobile layout ── */}
        <div className="flex flex-col flex-1 lg:hidden">
          <div className="relative overflow-hidden bg-primary px-6 pt-16 pb-20">
            <div className="absolute inset-0">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "32px 32px" }} />
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-secondary/15 blur-3xl" />
              <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-secondary/8 blur-3xl" />
            </div>
            <div className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg">
                <span className="text-2xl font-display font-bold text-primary-foreground">R</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-primary-foreground tracking-tight">Rehoboth</h2>
              <p className="mt-1 text-sm text-primary-foreground/50 font-medium tracking-wide">Operations Management</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-6 text-background" preserveAspectRatio="none">
                <path d="M0 48h1440V0C1200 40 960 48 720 48S240 40 0 0v48z" fill="currentColor" />
              </svg>
            </div>
          </div>
          <div className="flex-1 flex flex-col px-5 -mt-8 pb-6">
            <div className="relative z-10 rounded-2xl bg-card border border-border/50 shadow-xl shadow-black/5 p-6 sm:p-8 space-y-5">
              {(view === "login" || view === "forgot") && (
                <div className="space-y-1">
                  <h1 className="text-xl font-display font-bold text-foreground tracking-tight">{headerTitle}</h1>
                  {view === "login" && (
                    <p className="text-muted-foreground text-[13px]">
                      Or{" "}
                      <button type="button" onClick={handleCreateAccount} className="font-semibold text-secondary hover:text-secondary/80 transition-colors">
                        create a new account
                      </button>
                    </p>
                  )}
                </div>
              )}
              {renderForm()}
            </div>
            <p className="text-center text-[11px] text-muted-foreground/40 mt-auto pt-6">
              &copy; {new Date().getFullYear()} Rehoboth. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-12 py-12 bg-background">
          <div className="w-full max-w-[400px] space-y-8">
            {(view === "login" || view === "forgot") && (
              <div className="space-y-2">
                <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">{headerTitle}</h1>
                {view === "login" && (
                  <p className="text-muted-foreground text-sm">
                    Or{" "}
                    <button type="button" onClick={handleCreateAccount} className="font-medium text-secondary hover:text-secondary/80 transition-colors">
                      create a new account
                    </button>
                  </p>
                )}
              </div>
            )}
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  );
}
