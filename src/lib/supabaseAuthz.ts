/**
 * Supabase Authorization Helper for React/TypeScript
 * Handles role-based access control and query scoping
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface UserProfile {
  user_id: string;
  role: "admin" | "appraiser";
  full_name: string;
}

export interface AuthzResult {
  success: boolean;
  error?: string;
}

export class SupabaseAuthz {
  private supabaseClient: SupabaseClient;
  private currentUser: any = null;
  private userProfile: UserProfile | null = null;
  private initialized = false;

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  get isAdmin(): boolean {
    return this.initialized && this.userProfile?.role === "admin";
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the authorization helper
   */
  async initialize(): Promise<AuthzResult> {
    try {
      console.log("Initializing React Supabase authorization...");

      // Get current session
      const {
        data: { session },
        error: sessionError,
      } = await this.supabaseClient.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        return { success: false, error: "Authentication failed" };
      }

      if (!session) {
        console.warn("No active session");
        return { success: false, error: "No active session" };
      }

      this.currentUser = session.user;
      console.log("Current user ID:", this.currentUser.id);

      // Fetch user profile to determine role
      const { data: profile, error: profileError } = await this.supabaseClient
        .from("profiles")
        .select("user_id, role, full_name")
        .eq("user_id", this.currentUser.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return { success: false, error: "Unable to load user profile" };
      }

      if (!profile) {
        console.error("No profile found for user");
        return { success: false, error: "User profile not found" };
      }

      this.userProfile = profile as UserProfile;
      this.initialized = true;

      console.log("React authorization initialized:", {
        userId: this.currentUser.id,
        role: profile.role,
        isAdmin: this.isAdmin,
        fullName: profile.full_name,
      });

      return { success: true };
    } catch (error: any) {
      console.error("Authorization initialization failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply role-based scoping to a claims query
   */
  scopedClaimsQuery(baseQuery: any) {
    if (!this.initialized) {
      throw new Error(
        "Authorization not initialized. Call initialize() first."
      );
    }

    console.log("Applying query scoping:", {
      isAdmin: this.isAdmin,
      userId: this.currentUser?.id,
    });

    // Always exclude archived claims from UI queries
    let query = baseQuery.is("archived_at", null);

    if (this.isAdmin) {
      // Admins can see all active claims
      console.log("Admin access: returning active claims only");
      return query;
    } else {
      // Appraisers can only see active claims assigned to them
      console.log(
        "Appraiser access: filtering by assigned_to =",
        this.currentUser.id
      );
      return query.eq("assigned_to", this.currentUser.id);
    }
  }

  /**
   * Check if the current user can access a specific claim
   */
  canAccessClaim(claim: any): boolean {
    if (!this.initialized) {
      return false;
    }

    if (this.isAdmin) {
      return true;
    }

    return claim.assigned_to === this.currentUser.id;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    return this.initialized
      ? {
          id: this.currentUser.id,
          email: this.currentUser.email,
          role: this.userProfile!.role,
          fullName: this.userProfile!.full_name,
          isAdmin: this.isAdmin,
        }
      : null;
  }

  /**
   * Handle authentication errors consistently
   */
  handleAuthError(error: any) {
    console.error("Authentication error:", error);

    if (
      error.message?.includes("JWT") ||
      error.code === "PGRST301" ||
      error.message?.includes("401")
    ) {
      return {
        shouldRedirect: true,
        message: "Your session has expired. Please log in again.",
      };
    }

    if (error.code === "PGRST116") {
      return {
        shouldRedirect: false,
        message: "Access denied. You do not have permission to view this data.",
      };
    }

    return {
      shouldRedirect: false,
      message: `Error: ${error.message}`,
    };
  }
}

// Global instance
let globalAuthz: SupabaseAuthz | null = null;

/**
 * Initialize the global authorization helper for React
 */
export async function initializeSupabaseAuthz(
  supabaseClient: SupabaseClient
): Promise<SupabaseAuthz> {
  if (!globalAuthz) {
    globalAuthz = new SupabaseAuthz(supabaseClient);
  }

  const result = await globalAuthz.initialize();

  if (!result.success) {
    throw new Error(result.error);
  }

  return globalAuthz;
}

/**
 * Get the global authorization instance
 */
export function getSupabaseAuthz(): SupabaseAuthz | null {
  return globalAuthz;
}
