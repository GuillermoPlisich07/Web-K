import { apiFetch } from "./apiClient";

export type UserRole = "EMPLOYEE" | "ADMIN" | "EXEC";

export interface ManagedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const res = await apiFetch("/api/users");
  if (!res.ok) throw new Error("No se pudieron cargar los usuarios.");
  return res.json();
}

async function toUserSaveError(res: Response, fallback: string): Promise<Error> {
  if (res.status === 409) {
    const body = await res.json().catch(() => null);
    if (body?.code === "EMAIL_ALREADY_EXISTS") {
      return new Error("Ya existe un usuario con ese email.");
    }
  }
  return new Error(fallback);
}

export async function createUser(req: CreateUserRequest): Promise<ManagedUser> {
  const res = await apiFetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw await toUserSaveError(res, "No se pudo crear el usuario.");
  return res.json();
}

export async function updateUser(id: string, req: UpdateUserRequest): Promise<ManagedUser> {
  const res = await apiFetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw await toUserSaveError(res, "No se pudo actualizar el usuario.");
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el usuario.");
}
