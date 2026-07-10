import { useAuthStore } from "../store/authStore";
import type { Role } from "../config/nav";

const SPRING_URL = import.meta.env.VITE_SPRING_URL ?? "http://localhost:8080";

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  email: string;
  role: string;
  profileCompleted: boolean;
}

export type LoginErrorKind = "invalid_credentials" | "account_disabled" | "server_error";

export class LoginError extends Error {
  readonly kind: LoginErrorKind;

  constructor(kind: LoginErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

async function toLoginError(res: Response): Promise<LoginError> {
  try {
    const body = await res.json();
    if (body.code === "INVALID_CREDENTIALS") {
      return new LoginError("invalid_credentials", body.error ?? "Email o contraseña incorrectos");
    }
    if (body.code === "ACCOUNT_DISABLED") {
      return new LoginError("account_disabled", body.error ?? "Tu cuenta está deshabilitada");
    }
  } catch {
    // Response body wasn't JSON — fall through to the generic error below.
  }
  return new LoginError("server_error", "No se pudo iniciar sesión. Intentá de nuevo.");
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${SPRING_URL}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new LoginError("server_error", "No pudimos conectar con el servidor. Revisá tu conexión.");
  }

  if (!res.ok) {
    throw await toLoginError(res);
  }
  return res.json();
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${SPRING_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort — client-side session is cleared by the caller regardless.
  }
}

async function rawRefresh(): Promise<AuthResponse | null> {
  try {
    const res = await fetch(`${SPRING_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function silentRefresh(): Promise<AuthResponse | null> {
  return rawRefresh();
}

let pendingRefresh: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = rawRefresh()
      .then((data) => {
        if (!data) {
          useAuthStore.getState().clearSession();
          return null;
        }
        useAuthStore.getState().setSession({
          accessToken: data.accessToken,
          role: data.role as Role,
          email: data.email,
          profileCompleted: data.profileCompleted,
        });
        return data.accessToken;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
}

/**
 * fetch() wrapper for Core-k endpoints: attaches the current access token and,
 * on a 401, attempts a single silent refresh-and-retry before giving up and
 * sending the user back to /login.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${SPRING_URL}${path}`, { ...init, headers });
  if (res.status !== 401) return res;

  const newToken = await refreshAccessToken();
  if (!newToken) {
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    return res;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${newToken}`);
  return fetch(`${SPRING_URL}${path}`, { ...init, headers: retryHeaders });
}
