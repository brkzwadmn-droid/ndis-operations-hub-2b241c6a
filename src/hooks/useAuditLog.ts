import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useAuditLog() {
  const { profile } = useAuth();

  const log = useCallback(
    async (action: string, entityType: string, entityId?: string, details?: Record<string, any>) => {
      if (!profile) return;
      try {
        await supabase.from("audit_log").insert({
          profile_id: profile.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: details || {},
        });
      } catch {
        // silent — audit log should not break user flow
      }
    },
    [profile]
  );

  return { log };
}
