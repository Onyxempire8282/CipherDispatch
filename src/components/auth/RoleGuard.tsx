import type { AppRole } from "../../lib/supabaseAuthz";
import { useRole } from "../../hooks/useRole";

interface RoleGuardProps {
  allow: AppRole | AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const { role, loading } = useRole();

  if (loading) return null;

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!role || !allowed.includes(role)) return <>{fallback}</>;

  return <>{children}</>;
}
