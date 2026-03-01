import {
  hasRole,
  hasAllRoles,
  isCoordinator,
  isAuditor,
  isProviderAdminFor,
  isValidRole,
  DEFAULT_ROLE,
} from "./rbac";
import type { AuthContext } from "./types";

function makeAuth(roles: string[]): AuthContext {
  return {
    userId: "user-1",
    clerkId: "clerk-1",
    email: "test@example.com",
    roles: roles as AuthContext["roles"],
  };
}

describe("rbac", () => {
  describe("DEFAULT_ROLE", () => {
    it("is participant", () => {
      expect(DEFAULT_ROLE).toBe("participant");
    });
  });

  describe("hasRole", () => {
    it("returns true when user has the required role", () => {
      expect(hasRole(makeAuth(["participant"]), "participant")).toBe(true);
    });

    it("returns false when user lacks the role", () => {
      expect(hasRole(makeAuth(["participant"]), "admin")).toBe(false);
    });

    it("returns true when user has any of multiple required roles", () => {
      expect(hasRole(makeAuth(["worker"]), "admin", "worker")).toBe(true);
    });

    it("returns false for empty roles", () => {
      expect(hasRole(makeAuth([]), "participant")).toBe(false);
    });
  });

  describe("hasAllRoles", () => {
    it("returns true when user has all required roles", () => {
      expect(hasAllRoles(makeAuth(["admin", "coordinator"]), "admin", "coordinator")).toBe(true);
    });

    it("returns false when user is missing one role", () => {
      expect(hasAllRoles(makeAuth(["admin"]), "admin", "coordinator")).toBe(false);
    });
  });

  describe("isCoordinator", () => {
    it("returns true for coordinator role", () => {
      expect(isCoordinator(makeAuth(["coordinator"]))).toBe(true);
    });

    it("returns true for admin role", () => {
      expect(isCoordinator(makeAuth(["admin"]))).toBe(true);
    });

    it("returns false for participant", () => {
      expect(isCoordinator(makeAuth(["participant"]))).toBe(false);
    });

    it("returns false for worker", () => {
      expect(isCoordinator(makeAuth(["worker"]))).toBe(false);
    });
  });

  describe("isAuditor", () => {
    it("returns true for auditor role", () => {
      expect(isAuditor(makeAuth(["auditor"]))).toBe(true);
    });

    it("returns true for admin role", () => {
      expect(isAuditor(makeAuth(["admin"]))).toBe(true);
    });

    it("returns false for coordinator", () => {
      expect(isAuditor(makeAuth(["coordinator"]))).toBe(false);
    });
  });

  describe("isProviderAdminFor", () => {
    it("returns true when user has provider_admin role for the org", () => {
      const result = isProviderAdminFor(
        makeAuth(["provider_admin"]),
        "org-1",
        [{ role: "provider_admin", organisationId: "org-1" }],
      );
      expect(result).toBe(true);
    });

    it("returns false for a different org", () => {
      const result = isProviderAdminFor(
        makeAuth(["provider_admin"]),
        "org-2",
        [{ role: "provider_admin", organisationId: "org-1" }],
      );
      expect(result).toBe(false);
    });

    it("returns true for admin regardless of org roles", () => {
      const result = isProviderAdminFor(
        makeAuth(["admin"]),
        "org-99",
        [],
      );
      expect(result).toBe(true);
    });

    it("returns false for participant", () => {
      const result = isProviderAdminFor(
        makeAuth(["participant"]),
        "org-1",
        [],
      );
      expect(result).toBe(false);
    });
  });

  describe("isValidRole", () => {
    it("returns true for all known roles", () => {
      expect(isValidRole("admin")).toBe(true);
      expect(isValidRole("auditor")).toBe(true);
      expect(isValidRole("coordinator")).toBe(true);
      expect(isValidRole("participant")).toBe(true);
      expect(isValidRole("provider_admin")).toBe(true);
      expect(isValidRole("worker")).toBe(true);
    });

    it("returns false for unknown roles", () => {
      expect(isValidRole("superuser")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("Admin")).toBe(false);
    });
  });
});
