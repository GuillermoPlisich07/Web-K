import { apiFetch } from "./apiClient";

export interface MyProfile {
  id: string;
  email: string;
  role: string;
  age: number | null;
  personality: string | null;
  selfDescription: string | null;
  profileCompleted: boolean;
  avatarUrl: string | null;
}

export interface UpdateProfileRequest {
  age: number;
  personality: string;
  selfDescription: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
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

export async function uploadAvatar(file: File): Promise<MyProfile> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/users/me/avatar", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("No se pudo subir la imagen de perfil.");
  return res.json();
}

export async function changePassword(req: ChangePasswordRequest): Promise<void> {
  const res = await apiFetch("/api/users/me/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      if (body?.code === "INVALID_CURRENT_PASSWORD") {
        throw new Error("La contraseña actual ingresada es incorrecta.");
      }
    }
    throw new Error("No se pudo cambiar la contraseña.");
  }
}
