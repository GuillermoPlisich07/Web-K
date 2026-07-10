import { apiFetch } from "./apiClient";

export interface Empresa {
  id: string;
  name: string;
  context: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmpresaRequest {
  name: string;
  context: string;
}

/** Returns null when no company context has been created yet (404). */
export async function getEmpresa(): Promise<Empresa | null> {
  const res = await apiFetch("/api/empresa");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo cargar el contexto de la empresa.");
  return res.json();
}

export async function upsertEmpresa(req: EmpresaRequest): Promise<Empresa> {
  const res = await apiFetch("/api/empresa", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("No se pudo guardar el contexto de la empresa.");
  return res.json();
}
