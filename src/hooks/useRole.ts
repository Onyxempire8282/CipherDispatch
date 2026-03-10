import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
  type AppRole,
} from "../lib/supabaseAuthz";

interface RoleState {
  role: AppRole | null;
  userId: string | null;
  fullName: string | null;
  loading: boolean;
  can: (action: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, AppRole[]> = {
  "claims.create": ["admin", "dispatch"],
  "claims.edit": ["admin", "dispatch"],
  "claims.delete": ["admin"],
  "claims.assign": ["admin", "dispatch"],
  "claims.view_all": ["admin", "dispatch", "writer"],
  "claims.change_status": ["admin", "dispatch", "appraiser"],
  "claims.mark_complete": ["admin", "dispatch", "appraiser"],
  "vendors.manage": ["admin"],
  "vendors.view": ["admin", "dispatch", "writer"],
  "payouts.manage": ["admin"],
  "payouts.view": ["admin", "dispatch"],
  "contractors.manage": ["admin"],
  "contractors.view": ["admin", "dispatch"],
  "kpi.view": ["admin", "dispatch"],
  "photos.upload": ["appraiser"],
  "photos.view": ["admin", "dispatch", "writer", "appraiser"],
  "supplements.create": ["admin", "dispatch"],
  "estimates.write": ["writer"],
  "estimates.view": ["admin", "dispatch", "writer"],
  "field.my_claims": ["appraiser"],
  "field.my_routes": ["appraiser"],
};

export function useRole(): RoleState {
  const [role, setRole] = useState<AppRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const authz = getSupabaseAuthz();
        if (!authz?.isInitialized) {
          await initializeSupabaseAuthz(supabase);
        }
        const user = getSupabaseAuthz()?.getCurrentUser();
        if (user) {
          setRole(user.role as AppRole);
          setUserId(user.id);
          setFullName(user.fullName);
        }
      } catch {
        // Auth failed — role stays null
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const can = (action: string): boolean => {
    if (!role) return false;
    const allowed = ROLE_PERMISSIONS[action];
    if (!allowed) return false;
    return allowed.includes(role);
  };

  return { role, userId, fullName, loading, can };
}
