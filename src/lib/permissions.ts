import type { Role } from "../config/nav";

/**
 * Single frontend source of truth for the RBAC permission matrix
 * (add-rbac-permission-matrix), mirroring the backend's @PreAuthorize rules
 * documented in openspec/changes/add-rbac-permission-matrix/design.md.
 *
 * This is a convenience layer only — every action gated here is enforced
 * independently by Core-k. Hiding a control here never substitutes for
 * backend authorization.
 */

export type Resource =
  | "dashboard"
  | "practice"
  | "aiCoach"
  | "scenariosLong"
  | "knowledgeBase"
  | "productos"
  | "servicios"
  | "empresa"
  | "usuarios"
  | "analytics"
  | "billing"
  | "integraciones";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "invite"
  | "changeRole"
  | "execute";

type ResourceMatrix = Partial<Record<Role, Action[]>>;

const MATRIX: Record<Resource, ResourceMatrix> = {
  dashboard: {
    employee: ["view"],
    admin: ["view"],
    exec: ["view"],
  },
  practice: {
    // employee creates escenarios cortos (flujo Express, IA) for their own
    // practice — confirmed with the user during apply, see design.md's
    // "Resolved during implementation" note.
    employee: ["view", "create", "execute"],
    admin: ["view", "create", "edit", "execute"],
    exec: ["view"], // Autoridad only replays completed sessions — never starts a live one
  },
  aiCoach: {
    employee: ["view", "execute"],
    admin: ["view", "execute"],
    exec: ["view"],
  },
  scenariosLong: {
    admin: ["view", "create", "edit", "delete"],
    exec: ["view"],
  },
  knowledgeBase: {
    admin: ["view", "create", "edit", "delete"],
    exec: ["view"],
  },
  productos: {
    admin: ["view", "create", "edit", "delete"],
    exec: ["view"],
  },
  servicios: {
    admin: ["view", "create", "edit", "delete"],
    exec: ["view"],
  },
  empresa: {
    admin: ["view", "create", "edit"],
    exec: ["view"],
  },
  usuarios: {
    admin: ["view", "create", "edit", "delete", "invite", "changeRole"],
    exec: ["view"],
  },
  analytics: {
    employee: ["view"],
    admin: ["view", "export"],
    exec: ["view", "export"],
  },
  billing: {
    admin: ["view", "edit"],
    exec: ["view"],
  },
  integraciones: {
    admin: ["view", "edit"],
    exec: ["view"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return MATRIX[resource]?.[role]?.includes(action) ?? false;
}

export function canView(role: Role, resource: Resource): boolean {
  return can(role, resource, "view");
}

/** Autoridad (exec) never creates, edits, deletes, invites, or changes roles — anywhere. */
export function isReadOnlyRole(role: Role): boolean {
  return role === "exec";
}
