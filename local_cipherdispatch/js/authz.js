/**
 * Shared Authorization Helper
 * Handles role-based access control and query scoping for Supabase
 */

class SupabaseAuthz {
  constructor(supabaseClient) {
    this.supabaseClient = supabaseClient;
    this.currentUser = null;
    this.userProfile = null;
    this.isAdmin = false;
    this.initialized = false;
  }

  /**
   * Initialize the authorization helper - call this first on page load
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async initialize() {
    try {
      console.log("Initializing Supabase authorization...");

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

      this.userProfile = profile;
      this.isAdmin = profile.role === "admin";
      this.initialized = true;

      console.log("Authorization initialized:", {
        userId: this.currentUser.id,
        role: profile.role,
        isAdmin: this.isAdmin,
        fullName: profile.full_name,
      });

      return { success: true };
    } catch (error) {
      console.error("Authorization initialization failed:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply role-based scoping to a claims query
   * @param {object} baseQuery - The base Supabase query object
   * @returns {object} - The scoped query object
   */
  scopedClaimsQuery(baseQuery) {
    if (!this.initialized) {
      throw new Error(
        "Authorization not initialized. Call initialize() first."
      );
    }

    console.log("Applying query scoping:", {
      isAdmin: this.isAdmin,
      userId: this.currentUser?.id,
    });

    if (this.isAdmin) {
      // Admins can see all claims
      console.log("Admin access: returning unfiltered query");
      return baseQuery;
    } else {
      // Appraisers can only see claims assigned to them
      console.log(
        "Appraiser access: filtering by assigned_to =",
        this.currentUser.id
      );
      return baseQuery.eq("assigned_to", this.currentUser.id);
    }
  }

  /**
   * Check if the current user can access a specific claim
   * @param {object} claim - The claim object to check
   * @returns {boolean} - Whether the user can access this claim
   */
  canAccessClaim(claim) {
    if (!this.initialized) {
      return false;
    }

    if (this.isAdmin) {
      return true;
    }

    return claim.assigned_to === this.currentUser.id;
  }

  /**
   * Get scoped photo storage path for a claim
   * @param {string} claimId - The claim ID
   * @returns {string|null} - The storage path or null if access denied
   */
  getScopedPhotoPath(claimId) {
    if (!this.initialized) {
      return null;
    }

    // Return the claim-specific folder path
    return `${claimId}/`;
  }

  /**
   * Check if user can list all photos (admin only)
   * @returns {boolean}
   */
  canListAllPhotos() {
    return this.initialized && this.isAdmin;
  }

  /**
   * Get current user info
   * @returns {object|null}
   */
  getCurrentUser() {
    return this.initialized
      ? {
          id: this.currentUser.id,
          email: this.currentUser.email,
          role: this.userProfile.role,
          fullName: this.userProfile.full_name,
          isAdmin: this.isAdmin,
        }
      : null;
  }

  /**
   * Handle authentication errors consistently
   * @param {object} error - The error object
   * @returns {object} - Standardized error response
   */
  handleAuthError(error) {
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

// Create global instance
window.supabaseAuthz = null;

/**
 * Initialize the global authorization helper
 * @param {object} supabaseClient - The Supabase client instance
 * @returns {Promise<SupabaseAuthz>}
 */
async function initializeSupabaseAuthz(supabaseClient) {
  if (!window.supabaseAuthz) {
    window.supabaseAuthz = new SupabaseAuthz(supabaseClient);
  }

  const result = await window.supabaseAuthz.initialize();

  if (!result.success) {
    throw new Error(result.error);
  }

  return window.supabaseAuthz;
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SupabaseAuthz, initializeSupabaseAuthz };
}
