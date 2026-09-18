import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, DEMO_PERSONAS, type Role } from "../auth/AuthProvider";
import { Lock, ArrowRight, Activity, Hospital, ShieldCheck, Loader2 } from "lucide-react";

export function LoginPage() {
  const { loginAs, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePersonaSelect = (role: Role) => {
    loginAs(role);
    const destination =
      role === "BLOOD_CENTRE"
        ? "/centre/stock"
        : role === "HOSPITAL"
        ? "/hospital/inbox"
        : "/coordinator/escalations";
    navigate(destination, { replace: true });
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Navigate to default or requested page
      const from = (location.state as any)?.from?.pathname ?? "/centre/stock";
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/30 mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-7 w-7">
              <path d="M12 2C9.4 2 7.5 4 7.5 4S3 6.5 3 12c0 4.4 3.5 8 9 10 5.5-2 9-5.6 9-10 0-5.5-4.5-8-4.5-8S14.6 2 12 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PulseChain</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Automated Blood Unit Expiry Rescue Network
          </p>
        </div>

        {/* 1-Click Fast Persona Switcher (For Demo Rehearsal) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1-Click Demo Personas
            </span>
            <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-mono">
              Friday Rehearsal
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Blood Centre */}
            <button
              type="button"
              onClick={() => handlePersonaSelect("BLOOD_CENTRE")}
              className="flex items-center justify-between p-3 rounded-xl border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-600/20 text-red-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-200">SNS Blood Centre</div>
                  <div className="text-[11px] text-red-400/80 font-mono">Role: BLOOD_CENTRE</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Hospital */}
            <button
              type="button"
              onClick={() => handlePersonaSelect("HOSPITAL")}
              className="flex items-center justify-between p-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
                  <Hospital className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-200">KMCH Coimbatore</div>
                  <div className="text-[11px] text-emerald-400/80 font-mono">Role: HOSPITAL</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Coordinator */}
            <button
              type="button"
              onClick={() => handlePersonaSelect("COORDINATOR")}
              className="flex items-center justify-between p-3 rounded-xl border border-purple-900/40 bg-purple-950/20 hover:bg-purple-950/40 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-200">Regional Coordinator Hub</div>
                  <div className="text-[11px] text-purple-400/80 font-mono">Role: COORDINATOR</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Standard Credentials Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleCustomLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cognito Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="centre@example.invalid"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full h-10 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Sign in with Cognito</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
