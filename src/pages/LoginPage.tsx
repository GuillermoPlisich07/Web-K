import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { login, LoginError } from "../services/apiClient";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../config/nav";

const GRAD =
  "linear-gradient(135deg, #F5C518 0%, #FF6130 28%, #E0177A 56%, #7B22B4 78%, #4050C8 100%)";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = "Ingresá tu email";
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Ingresá un email válido";
    if (!password) errors.password = "Ingresá tu contraseña";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      setSession({
        accessToken: data.accessToken,
        role: data.role as Role,
        email: data.email,
        profileCompleted: data.profileCompleted,
      });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof LoginError) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo iniciar sesión. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "#080B11", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 p-12 relative overflow-hidden"
        style={{ backgroundColor: "#0F1724", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Konverza</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              AI-powered
              <br />
              <span className="gradient-text">sales training</span>
            </h1>
            <p className="text-[#7F8899] text-base leading-relaxed max-w-sm">
              Simulations that build real skills. 
              <br />
              Practice, improve, and measure growth across your entire sales team.
            </p>
          </div>
        </div>

        {/* <div className="relative space-y-4">
          {[
            { label: "Active simulations today", value: "1,284" },
            { label: "Average score improvement", value: "+18%" },
            { label: "Enterprise customers", value: "340+" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <span className="text-[#7F8899] text-sm">{stat.label}</span>
              <span className="font-semibold text-white text-sm">{stat.value}</span>
            </div>
          ))}
        </div> */}
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-semibold text-white tracking-tight">Konverza</span>
          </div>

          {/* <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Welcome back</h2>
            <p className="text-[#7F8899] text-sm">Sign in to your workspace</p>
          </div> */}

          {/* SSO buttons */}
          {/* <div className="space-y-3 mb-6">
            {["Continue with Microsoft", "Continue with Google"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#B7C0D0] transition-all duration-150 hover:text-white cursor-pointer"
                style={{ backgroundColor: "#151D2B", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            <span className="text-[#7F8899] text-xs">or continue with email</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
          </div> */}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(224,23,122,0.1)", border: "1px solid rgba(224,23,122,0.35)", color: "#F5A8CB" }}
              >
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-[#B7C0D0] text-xs font-medium mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none transition-all duration-150"
                style={{
                  backgroundColor: "#151D2B",
                  border: `1px solid ${fieldErrors.email ? "#E0177A" : "rgba(255,255,255,0.08)"}`,
                  caretColor: "#F5C518",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(245,197,24,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = fieldErrors.email ? "#E0177A" : "rgba(255,255,255,0.08)")}
              />
              {fieldErrors.email && (
                <p className="text-xs mt-1.5" style={{ color: "#F5A8CB" }}>{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="text-[#B7C0D0] text-xs font-medium uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  className="text-[#7F8899] text-xs hover:text-[#B7C0D0] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none pr-11 transition-all duration-150"
                  style={{
                    backgroundColor: "#151D2B",
                    border: `1px solid ${fieldErrors.password ? "#E0177A" : "rgba(255,255,255,0.08)"}`,
                    caretColor: "#F5C518",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(245,197,24,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = fieldErrors.password ? "#E0177A" : "rgba(255,255,255,0.08)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7F8899] hover:text-[#B7C0D0] transition-colors cursor-pointer"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs mt-1.5" style={{ color: "#F5A8CB" }}>{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity duration-150 cursor-pointer mt-2"
              style={{ background: GRAD, opacity: loading ? 0.8 : 1 }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[#7F8899] text-xs mt-8">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="text-[#B7C0D0] hover:text-white transition-colors cursor-pointer"
            >
              Contact sales
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
