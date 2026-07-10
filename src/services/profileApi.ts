import { apiFetch } from "./apiClient";

export interface MyProfile {
  id: string;
  email: string;
  role: string;
  age: number | null;
  personality: string | null;
  selfDescription: string | null;
  profileCompleted: boolean;
}

export interface UpdateProfileRequest {
  age: number;
  personality: string;
  selfDescription: string;
}

export async function getMyProfile(): Promise<MyProfile> {
  const res = await apiFetch("/api/users/me");
  if (!res.ok) throw new Error("No se pudo cargar tu perfil.");
  return res.json();
}

export async function updateMyProfile(req: UpdateProfileRequest): Promise<MyProfile> {
  const res = await apiFetch("/api/users/me/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("No se pudo guardar tu perfil.");
  return res.json();
}
