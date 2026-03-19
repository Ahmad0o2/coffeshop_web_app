import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import useTheme from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import { getApiErrorMessage } from "../utils/apiErrors";

const authModes = {
  login: {
    title: "Sign In",
    subtitle: "Sign in to manage orders, rewards, and event access.",
  },
  register: {
    title: "Create Account",
    subtitle: "Create your account, verify your phone number, and get started.",
  },
  reset: {
    title: "Reset Password",
    subtitle: "Verify your phone number, then choose a new password.",
  },
};

export default function Auth() {
  const { user, login, register, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo;
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [otpNotice, setOtpNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtpFor, setSendingOtpFor] = useState("");
  const [loginForm, setLoginForm] = useState({
    identifier: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    otpCode: "",
  });
  const [resetForm, setResetForm] = useState({
    phone: "",
    otpCode: "",
    newPassword: "",
    confirmPassword: "",
  });

  const isDayTheme = theme === "day";
  const noticeClass = cn(
    "rounded-[1rem] border px-4 py-3 text-sm leading-7",
    isDayTheme
      ? "border-[#3f7674]/14 bg-[#eef7f6] text-cocoa/82"
      : "border-gold/14 bg-[rgba(27,21,18,0.84)] text-cocoa/78",
  );
  const dangerClass = cn(
    "rounded-[1rem] border px-4 py-3 text-sm leading-7",
    isDayTheme
      ? "border-[#a34838]/18 bg-[#fff2ef] text-[#7f2f21]"
      : "border-[#ff7a5c]/18 bg-[rgba(58,28,22,0.84)] text-[#ffb09b]",
  );

  if (isAuthenticated) {
    return (
      <Navigate
        to={
          ["Admin", "Staff"].includes(user?.role)
            ? "/admin"
            : redirectTo || "/orders"
        }
        replace
      />
    );
  }

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setOtpNotice(null);
  };

  const requestOtp = async (purpose) => {
    const phone =
      purpose === "register"
        ? registerForm.phone.trim()
        : resetForm.phone.trim();

    if (!phone) {
      setError("Enter your phone number first.");
      return;
    }

    setSendingOtpFor(purpose);
    setError("");
    setNotice("");
    setOtpNotice(null);

    try {
      const { data } = await api.post("/auth/otp/request", { phone, purpose });
      setOtpNotice({
        purpose,
        mode: purpose === "reset-password" ? "reset" : purpose,
        phone,
        message: data?.message || "Verification code sent.",
        demoCode: data?.demoCode || "",
        deliveryMode: data?.deliveryMode || "demo",
      });
      setNotice(
        data?.deliveryMode === "demo"
          ? "Free demo OTP mode is active. The code is shown below instead of SMS."
          : "Verification code sent to the provided phone number.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't send the OTP right now."));
    } finally {
      setSendingOtpFor("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const identifier = loginForm.identifier.trim();
      if (!identifier) {
        setError("Enter email, username, or phone to sign in.");
        return;
      }
      if (!loginForm.password) {
        setError("Password is required.");
        return;
      }

      const data = await login({
        identifier,
        password: loginForm.password,
      });

      navigate(
        ["Admin", "Staff"].includes(data?.user?.role)
          ? "/admin"
          : redirectTo || "/",
        { replace: true },
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Authentication failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      if (!registerForm.fullName.trim()) {
        setError("Full name is required.");
        return;
      }
      if (!registerForm.email.trim()) {
        setError("Email is required.");
        return;
      }
      if (!registerForm.phone.trim()) {
        setError("Phone is required.");
        return;
      }
      if (!registerForm.password) {
        setError("Password is required.");
        return;
      }
      if (!registerForm.otpCode.trim()) {
        setError("Enter the OTP code before creating the account.");
        return;
      }

      const data = await register({
        fullName: registerForm.fullName.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
        otpCode: registerForm.otpCode.trim(),
      });

      navigate(
        ["Admin", "Staff"].includes(data?.user?.role)
          ? "/admin"
          : redirectTo || "/",
        { replace: true },
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't create the account."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      if (!resetForm.phone.trim()) {
        setError("Phone is required.");
        return;
      }
      if (!resetForm.otpCode.trim()) {
        setError("Enter the OTP code you received.");
        return;
      }
      if (!resetForm.newPassword) {
        setError("New password is required.");
        return;
      }
      if (resetForm.newPassword !== resetForm.confirmPassword) {
        setError("Password confirmation does not match.");
        return;
      }

      const { data } = await api.post("/auth/password-reset", {
        phone: resetForm.phone.trim(),
        otpCode: resetForm.otpCode.trim(),
        newPassword: resetForm.newPassword,
      });

      setNotice(
        data?.message ||
          "Password reset successful. Sign in with the new password now.",
      );
      setLoginForm({
        identifier: resetForm.phone.trim(),
        password: "",
      });
      setResetForm({
        phone: "",
        otpCode: "",
        newPassword: "",
        confirmPassword: "",
      });
      setOtpNotice(null);
      setMode("login");
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't reset the password."));
    } finally {
      setSubmitting(false);
    }
  };

  const currentMode = authModes[mode];

  return (
    <section className="section-shell max-w-2xl">
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`pill ${mode === "login" ? "border-espresso/40" : ""}`}
            onClick={() => switchMode("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`pill ${mode === "register" ? "border-espresso/40" : ""}`}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
          <button
            type="button"
            className={`pill ${mode === "reset" ? "border-espresso/40" : ""}`}
            onClick={() => switchMode("reset")}
          >
            Reset Password
          </button>
        </div>

        <div className="mt-6">
          <h1 className="text-3xl font-semibold text-espresso">
            {currentMode.title}
          </h1>
          <p className="mt-2 text-sm leading-7 text-cocoa/70">
            {currentMode.subtitle}
          </p>
        </div>

        {notice && <div className={cn("mt-5", noticeClass)}>{notice}</div>}
        {error && <div className={cn("mt-5", dangerClass)}>{error}</div>}

        {otpNotice && otpNotice.mode === mode && (
          <div className={cn("mt-5 space-y-2", noticeClass)}>
            <p className="font-semibold text-espresso">{otpNotice.message}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-cocoa/60">
              {otpNotice.deliveryMode === "demo"
                ? "Free Demo OTP"
                : "Phone Verification"}
            </p>
            {otpNotice.demoCode && (
              <p className="text-lg font-semibold tracking-[0.2em] text-espresso">
                {otpNotice.demoCode}
              </p>
            )}
            <p className="text-xs text-cocoa/65">
              Phone: {otpNotice.phone}
            </p>
          </div>
        )}

        {mode === "login" && (
          <form noValidate onSubmit={handleLogin} className="mt-6 space-y-4">
            <Input
              type="text"
              placeholder="Email, username, or phone"
              value={loginForm.identifier}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  identifier: event.target.value,
                }))
              }
            />
            <Input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="text-sm font-medium text-cocoa/72 underline-offset-4 transition hover:text-espresso hover:underline"
                onClick={() => switchMode("reset")}
              >
                Forgot your password?
              </button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form noValidate onSubmit={handleRegister} className="mt-6 space-y-4">
            <Input
              type="text"
              placeholder="Full name"
              value={registerForm.fullName}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  fullName: event.target.value,
                }))
              }
            />
            <Input
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                type="text"
                placeholder="Phone"
                value={registerForm.phone}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
              />
              <Button
                type="button"
                variant="secondary"
                disabled={sendingOtpFor === "register"}
                onClick={() => requestOtp("register")}
                className="sm:min-w-[11rem]"
              >
                {sendingOtpFor === "register" ? "Sending..." : "Send OTP"}
              </Button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="OTP code"
              value={registerForm.otpCode}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  otpCode: event.target.value,
                }))
              }
            />
            <Input
              type="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form
            noValidate
            onSubmit={handleResetPassword}
            className="mt-6 space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                type="text"
                placeholder="Phone"
                value={resetForm.phone}
                onChange={(event) =>
                  setResetForm((prev) => ({
                    ...prev,
                    phone: event.target.value,
                  }))
                }
              />
              <Button
                type="button"
                variant="secondary"
                disabled={sendingOtpFor === "reset-password"}
                onClick={() => requestOtp("reset-password")}
                className="sm:min-w-[11rem]"
              >
                {sendingOtpFor === "reset-password"
                  ? "Sending..."
                  : "Send OTP"}
              </Button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="OTP code"
              value={resetForm.otpCode}
              onChange={(event) =>
                setResetForm((prev) => ({
                  ...prev,
                  otpCode: event.target.value,
                }))
              }
            />
            <Input
              type="password"
              placeholder="New password"
              value={resetForm.newPassword}
              onChange={(event) =>
                setResetForm((prev) => ({
                  ...prev,
                  newPassword: event.target.value,
                }))
              }
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={resetForm.confirmPassword}
              onChange={(event) =>
                setResetForm((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="text-sm font-medium text-cocoa/72 underline-offset-4 transition hover:text-espresso hover:underline"
                onClick={() => switchMode("login")}
              >
                Back to sign in
              </button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Reset Password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
