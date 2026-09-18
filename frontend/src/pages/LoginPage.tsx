import { Lock } from "lucide-react";

export function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-7 w-7">
              <path d="M12 2C9.4 2 7.5 4 7.5 4S3 6.5 3 12c0 4.4 3.5 8 9 10 5.5-2 9-5.6 9-10 0-5.5-4.5-8-4.5-8S14.6 2 12 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text">PulseChain</h1>
          <p className="mt-1 text-sm text-text-muted">Blood unit rescue network</p>
        </div>

        <div className="bg-surface-raised rounded-2xl border border-border p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <input
                type="email"
                disabled
                placeholder="you@facility.org"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
              <input
                type="password"
                disabled
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text-muted cursor-not-allowed opacity-60"
              />
            </div>
            <button
              disabled
              className="w-full h-10 rounded-xl bg-accent text-white text-sm font-medium opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Sign in
            </button>
          </div>

          <div className="mt-5 rounded-xl bg-rbc-bg border border-rbc/20 px-4 py-3">
            <p className="text-xs text-rbc font-medium">
              Demo logins arrive in the auth step. Use the role switcher in the sidebar to explore.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
