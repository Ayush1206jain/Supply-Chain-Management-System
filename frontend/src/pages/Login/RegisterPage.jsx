import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api/authService";
import AuthLayout from "./AuthLayout";
import "./Auth.css";

const ROLES = ["manufacturer", "distributor", "retailer", "admin"];

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password || !role) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(email.trim(), password, role);
      if (data.success) {
        navigate("/login", {
          state: { registered: true },
          replace: true,
        });
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Unable to connect. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card animate-scale-in" id="register-card">
        {/* Header */}
        <div className="auth-header">
          <span className="auth-logo">⛓</span>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">
            Join ChainTrack to manage your supply chain
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <div className="alert alert-error" id="register-error" role="alert">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form stagger">
          <div className="form-group animate-slide-up">
            <label htmlFor="register-email" className="form-label">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group animate-slide-up">
            <label htmlFor="register-role" className="form-label">
              Role
            </label>
            <select
              id="register-role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                Select your role
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group animate-slide-up">
            <label htmlFor="register-password" className="form-label">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              placeholder="Min 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group animate-slide-up">
            <label htmlFor="register-confirm-password" className="form-label">
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type="password"
              className="form-input"
              placeholder="Re-enter password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg animate-slide-up"
            disabled={loading}
            id="btn-register"
          >
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        {/* Footer */}
        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login" id="link-to-login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
