import { apiFetch } from "./apiClient";

export interface Producto {
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

export interface ProductoRequest {
  name: string;
  description: string;
  context: string;
  priceRange: string;
  keyDifferentiator: string;
  paymentInfo: string;
  tags: string[];
}

export async function listProductos(): Promise<Producto[]> {
  const res = await apiFetch("/api/productos");
  if (!res.ok) throw new Error("No se pudieron cargar los productos.");
  return res.json();
}

export async function createProducto(req: ProductoRequest): Promise<Producto> {
  const res = await apiFetch("/api/productos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("No se pudo crear el producto.");
  return res.json();
}

export async function updateProducto(id: string, req: ProductoRequest): Promise<Producto> {
  const res = await apiFetch(`/api/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el producto.");
  return res.json();
}

export async function deleteProducto(id: string): Promise<void> {
  const res = await apiFetch(`/api/productos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("No se pudo eliminar el producto.");
}
