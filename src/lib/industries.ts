import type { Industry } from "../types";

export const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: "SOFTWARE_B2B", label: "Software B2B" },
  { value: "FINANZAS",     label: "Servicios financieros" },
  { value: "CONSULTORIA",  label: "Consultoría" },
  { value: "TELCO",        label: "Telecomunicaciones" },
  { value: "SEGUROS",      label: "Seguros" },
  { value: "RETAIL",       label: "Retail" },
  { value: "SALUD",        label: "Salud" },
  { value: "OTRO",         label: "Otro" },
];
