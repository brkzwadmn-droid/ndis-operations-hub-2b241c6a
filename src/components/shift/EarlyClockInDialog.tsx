import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Clock, CalendarClock } from "lucide-react";
import { format } from "date-fns";

interface EarlyClockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledStart: Date;
}

function playAccessDeniedSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, startAt: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    };

    // "Din — din" — two descending tones, classic access denied
    playTone(520, 0.0, 0.18, 0.3);
    playTone(380, 0.22, 0.22, 0.3);
  } catch {
    // Silently ignore if Web Audio API unavailable
  }
}

export default function EarlyClockInDialog({
  open,
  onOpenChange,
  scheduledStart,
}: EarlyClockInDialogProps) {
  const [shaking, setShaking] = useState(false);
  const [entered, setEntered] = useState(false);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (open) {
      setEntered(false);
      setShaking(false);
      setFlashing(false);

      requestAnimationFrame(() => setEntered(true));

      // Play the "din din" after a short delay so it lands with the animation
      const soundTimer = setTimeout(() => {
        playAccessDeniedSound();
        setFlashing(true);
        setTimeout(() => setFlashing(false), 120);
        setTimeout(() => {
          setShaking(true);
          setTimeout(() => setShaking(false), 600);
        }, 100);
        // Second flash on the second "din"
        setTimeout(() => {
          setFlashing(true);
          setTimeout(() => setFlashing(false), 120);
        }, 240);
      }, 400);

      return () => clearTimeout(soundTimer);
    }
  }, [open]);

  const scheduledTime = format(scheduledStart, "h:mm a");
  const scheduledDate = format(scheduledStart, "EEEE, d MMMM yyyy");
  const earliestClockIn = format(
    new Date(scheduledStart.getTime() - 30 * 60 * 1000),
    "h:mm a"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center border-0 p-0 overflow-hidden shadow-2xl">

        {/* Header with flash effect on each "din" */}
        <div
          className="relative px-6 pt-10 pb-12 transition-colors duration-75"
          style={{
            background: flashing
              ? "linear-gradient(135deg, #dc2626, #ef4444)"
              : "linear-gradient(135deg, #991b1b, #dc2626)",
          }}
        >
          {/* Expanding rings */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse-ring" />
            <div
              className="absolute inset-0 rounded-full bg-white/10 animate-pulse-ring"
              style={{ animationDelay: "0.75s" }}
            />

            {/* Lock icon container */}
            <div
              className={`relative z-10 bg-white rounded-full p-5 shadow-xl transition-transform
                ${entered ? "animate-bounce-in" : "opacity-0"}
                ${shaking ? "animate-shake" : ""}
              `}
            >
              <Lock className="h-10 w-10 text-red-600" strokeWidth={2.5} />
            </div>
          </div>

          {/* ACCESS RESTRICTED badge */}
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Access Restricted
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-5 space-y-4 bg-white dark:bg-card">
          <div className="space-y-1.5">
            <h3 className="text-lg font-display font-bold text-foreground">
              Early Clock-In Not Permitted
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your clock-in attempt is outside the permitted window.
              Clock-in opens <span className="font-medium text-foreground">30 minutes</span> before
              your scheduled shift start time.
            </p>
          </div>

          {/* Scheduled time card */}
          <div className="rounded-xl border-2 border-primary/10 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Your Scheduled Shift</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-display font-bold text-primary">
                {scheduledTime}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{scheduledDate}</p>

            <div className="border-t border-primary/10 pt-3">
              <p className="text-xs text-muted-foreground">
                Clock-in available from
              </p>
              <p className="text-base font-display font-bold text-foreground">
                {earliestClockIn}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact your Team Leader or Coordinator.
          </p>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
