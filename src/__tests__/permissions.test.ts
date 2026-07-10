import { describe, it, expect } from "vitest";
import { can, canView, isReadOnlyRole, type Resource, type Action } from "../lib/permissions";
import type { Role } from "../config/nav";

const ROLES: Role[] = ["employee", "admin", "exec"];
const RESOURCES: Resource[] = [
  "dashboard", "practice", "aiCoach", "scenariosLong", "knowledgeBase",
  "productos", "servicios", "empresa", "usuarios", "analytics", "billing", "integraciones",
];
const ACTIONS: Action[] = ["view", "create", "edit", "delete", "export", "invite", "changeRole", "execute"];

describe("permissions matrix", () => {
  it("returns a boolean for every (resource, role, action) cell without throwing", () => {
    for (const resource of RESOURCES) {
      for (const role of ROLES) {
        for (const action of ACTIONS) {
          expect(typeof can(role, resource, action)).toBe("boolean");
        }
      }
    }
  });

  it("exec (Autoridad) is never granted create/edit/delete/invite/changeRole on any resource", () => {
    for (const resource of RESOURCES) {
      for (const action of ["create", "edit", "delete", "invite", "changeRole"] as Action[]) {
        expect(can("exec", resource, action)).toBe(false);
      }
    }
  });

  it("employee has no access to admin-only resources", () => {
    for (const resource of ["scenariosLong", "knowledgeBase", "productos", "servicios", "empresa", "usuarios", "billing", "integraciones"] as Resource[]) {
      expect(canView("employee", resource)).toBe(false);
    }
  });

  it("admin can view and manage the resources it owns", () => {
    expect(can("admin", "usuarios", "create")).toBe(true);
    expect(can("admin", "usuarios", "delete")).toBe(true);
    expect(can("admin", "usuarios", "changeRole")).toBe(true);
    expect(can("admin", "scenariosLong", "create")).toBe(true);
  });

  it("employee can create and execute in practice (escenarios cortos) for their own use", () => {
    expect(can("employee", "practice", "create")).toBe(true);
    expect(can("employee", "practice", "execute")).toBe(true);
  });

  it("employee cannot create escenarios largos", () => {
    expect(can("employee", "scenariosLong", "create")).toBe(false);
  });

  it("all three roles can view the dashboard", () => {
    for (const role of ROLES) {
      expect(canView(role, "dashboard")).toBe(true);
    }
  });

  it("exec and admin can export analytics; employee cannot", () => {
    expect(can("admin", "analytics", "export")).toBe(true);
    expect(can("exec", "analytics", "export")).toBe(true);
    expect(can("employee", "analytics", "export")).toBe(false);
  });

  it("isReadOnlyRole is true only for exec", () => {
    expect(isReadOnlyRole("exec")).toBe(true);
    expect(isReadOnlyRole("admin")).toBe(false);
    expect(isReadOnlyRole("employee")).toBe(false);
  });
});
