import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import useTheme from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";
import { getApiErrorMessage } from "../utils/apiErrors";

export default function Auth() {
  const { user, login, register, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    email: "",
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
            : "/"
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
    const email =
      purpose === "register"
        ? registerForm.email.trim()
        : resetForm.email.trim();

    if (!email) {
      setError(t("auth.messages.emailFirst"));
      return;
    }

    setSendingOtpFor(purpose);
    setError("");
    setNotice("");
    setOtpNotice(null);

    try {
      const { data } = await api.post("/auth/otp/request", { email, purpose });
      setOtpNotice({
        purpose,
        mode: purpose === "reset-password" ? "reset" : purpose,
        email,
        message: data?.message || "Verification code sent.",
        demoCode: data?.demoCode || "",
        deliveryMode: data?.deliveryMode || "demo",
        note: data?.note || "",
      });
      setNotice(
        data?.deliveryMode === "demo"
          ? t("auth.messages.otpFallback")
          : t("auth.messages.otpEmailSent"),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.messages.otpRequestFailed")));
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
        setError(t("auth.messages.identifierRequired"));
        return;
      }
      if (!loginForm.password) {
        setError(t("auth.messages.passwordRequired"));
        return;
      }

      const data = await login({
        identifier,
        password: loginForm.password,
      });

      navigate(
        ["Admin", "Staff"].includes(data?.user?.role)
          ? "/admin"
          : "/",
        { replace: true },
      );
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.messages.authFailed")));
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
        setError(t("auth.messages.fullNameRequired"));
        return;
      }
      if (!registerForm.email.trim()) {
        setError(t("auth.messages.emailRequired"));
        return;
      }
      if (!registerForm.phone.trim()) {
        setError(t("auth.messages.phoneRequired"));
        return;
      }
      if (!registerForm.password) {
        setError(t("auth.messages.passwordRequired"));
        return;
      }
      if (!registerForm.otpCode.trim()) {
        setError(t("auth.messages.otpRequiredForRegister"));
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
          : "/",
        { replace: true },
      );
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.messages.registerFailed")));
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
      if (!resetForm.email.trim()) {
        setError(t("auth.messages.emailRequired"));
        return;
      }
      if (!resetForm.otpCode.trim()) {
        setError(t("auth.messages.otpRequiredForReset"));
        return;
      }
      if (!resetForm.newPassword) {
        setError(t("auth.messages.newPasswordRequired"));
        return;
      }
      if (resetForm.newPassword !== resetForm.confirmPassword) {
        setError(t("auth.messages.passwordMismatch"));
        return;
      }

      const { data } = await api.post("/auth/password-reset", {
        email: resetForm.email.trim(),
        otpCode: resetForm.otpCode.trim(),
        newPassword: resetForm.newPassword,
      });

      setNotice(
        data?.message ||
          t("auth.messages.resetSuccess"),
      );
      setLoginForm({
        identifier: resetForm.email.trim(),
        password: "",
      });
      setResetForm({
        email: "",
        otpCode: "",
        newPassword: "",
        confirmPassword: "",
      });
      setOtpNotice(null);
      setMode("login");
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.messages.resetFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  const authModes = {
    login: {
      title: t("auth.modes.login.title"),
      subtitle: t("auth.modes.login.subtitle"),
    },
    register: {
      title: t("auth.modes.register.title"),
      subtitle: t("auth.modes.register.subtitle"),
    },
    reset: {
      title: t("auth.modes.reset.title"),
      subtitle: t("auth.modes.reset.subtitle"),
    },
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
            {t("auth.buttons.signIn")}
          </button>
          <button
            type="button"
            className={`pill ${mode === "register" ? "border-espresso/40" : ""}`}
            onClick={() => switchMode("register")}
          >
            {t("auth.buttons.register")}
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
                ? t("auth.messages.otpDemoFallback")
                : t("auth.messages.otpEmailVerification")}
            </p>
            {otpNotice.demoCode && (
              <p className="text-lg font-semibold tracking-[0.2em] text-espresso">
                {otpNotice.demoCode}
              </p>
            )}
            {otpNotice.note && (
              <p className="text-xs text-cocoa/65">{otpNotice.note}</p>
            )}
            <p className="text-xs text-cocoa/65">
              {t("auth.messages.otpEmailLabel", { email: otpNotice.email })}
            </p>
          </div>
        )}

        {mode === "login" && (
          <form noValidate onSubmit={handleLogin} className="mt-6 space-y-4">
            <Input
              type="text"
              placeholder={t("auth.fields.identifier")}
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
              placeholder={t("auth.fields.password")}
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
                {t("auth.links.forgotPassword")}
              </button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.buttons.signingIn") : t("auth.buttons.signIn")}
              </Button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form noValidate onSubmit={handleRegister} className="mt-6 space-y-4">
            <Input
              type="text"
              placeholder={t("auth.fields.fullName")}
              value={registerForm.fullName}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  fullName: event.target.value,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                type="email"
                placeholder={t("auth.fields.email")}
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((prev) => ({
                    ...prev,
                    email: event.target.value,
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
                {sendingOtpFor === "register"
                  ? t("auth.buttons.sending")
                  : t("auth.buttons.sendOtp")}
              </Button>
            </div>
            <Input
              type="text"
              placeholder={t("auth.fields.phone")}
              value={registerForm.phone}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
            />
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("auth.fields.otpCode")}
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
              placeholder={t("auth.fields.password")}
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
                {submitting ? t("auth.buttons.creating") : t("auth.buttons.createAccount")}
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
                type="email"
                placeholder={t("auth.fields.email")}
                value={resetForm.email}
                onChange={(event) =>
                  setResetForm((prev) => ({
                    ...prev,
                    email: event.target.value,
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
                  ? t("auth.buttons.sending")
                  : t("auth.buttons.sendOtp")}
              </Button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("auth.fields.otpCode")}
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
              placeholder={t("auth.fields.newPassword")}
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
              placeholder={t("auth.fields.confirmPassword")}
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
                {t("auth.links.backToSignIn")}
              </button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("auth.buttons.updating") : t("auth.buttons.resetPassword")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
