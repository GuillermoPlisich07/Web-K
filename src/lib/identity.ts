const STORAGE_KEY = "vendorName";

export function getVendorName(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setVendorName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name.trim());
}
