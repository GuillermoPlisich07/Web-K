import { apiFetch } from "./apiClient";

export interface Servicio {
  id: string;
  name: string;
  description: string | null;
  context: string | null;
  priceRange: string | null;
  keyDifferentiator: string | null;
  paymentInfo: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServicioRequest {
  name: string;
  description: string;
  context: string;
  priceRange: string;
  keyDifferentiator: string;
  paymentInfo: string;
  tags: string[];
}

export async function listServicios(): Promise<Servicio[]> {
  const res = await apiFetch("/api/servicios");
  if (!res.ok) throw new Error("No se pudieron cargar los servicios.");
  return res.json();
}

export async function createServicio(req: ServicioRequest): Promise<Servicio> {
  const res = await apiFetch("/api/servicios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("No se pudo crear el servicio.");
  return res.json();
}

export async function updateServicio(id: string, req: ServicioRequest): Promise<Servicio> {
  const res = await apiFetch(`/api/servicios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el servicio.");
  return res.json();
}

export async function deleteServicio(id: string): Promise<void> {
  const res = await apiFetch(`/api/servicios/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el servicio.");
}
