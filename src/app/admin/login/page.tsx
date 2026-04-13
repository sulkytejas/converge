"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminBrandPanel } from "~/components/ui/admin-brand-panel";
import { StepDots } from "~/components/ui/step-dots";
import { FormInput } from "~/components/ui/form-input";
import { PhoneInput } from "~/components/ui/phone-input";
import { OtpInput } from "~/components/ui/otp-input";
import { VerifiedCard } from "~/components/ui/verified-card";
import { SessionInfo } from "~/components/ui/session-info";
import { RecoveryModal } from "~/components/ui/recovery-modal";
import { LockoutOverlay } from "~/components/ui/lockout-overlay";
import { Toast } from "~/components/ui/toast";
import { Button } from "~/components/ui/button";
import { isValidEmail, isValidPhone, getExpectedPhoneDigits } from "~/lib/utils/validation";
import { maskEmail, maskPhone } from "~/lib/utils/masking";
import { api } from "~/trpc/react";

type Step = 1 | 2 | 3;
const MAX_ATTEMPTS = 5;

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Form state
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);

  // Error state
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");

  // Step 3 state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  // Security state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  // Timer state
  const [resendSeconds, setResendSeconds] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  // tRPC mutations
  const identify = api.adminAuth.identify.useMutation();
  const verifyOtp = api.adminAuth.verifyOtp.useMutation();
  const loginMut = api.adminAuth.login.useMutation();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastOpen(true);
  }, []);

  const startResendTimer = useCallback(() => {
    setResendSeconds(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleIdentify = () => {
    if (failedAttempts >= MAX_ATTEMPTS) {
      setIsLocked(true);
      return;
    }

    setEmailError("");
    setPhoneError("");
    let hasError = false;

    // Email validation
    if (!email) {
      setEmailError("Email address is required");
      hasError = true;
    } else if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    } else if (
      !email.endsWith("@collegepond.com") &&
      !email.endsWith("@convergeapp.co")
    ) {
      setEmailError("Login requires a @collegepond.com or @convergeapp.co email address");
      hasError = true;
    }

    // Phone validation
    const phoneDigits = phone.replace(/\s/g, "").replace(/[^0-9]/g, "");
    const expectedDigits = getExpectedPhoneDigits(countryCode);
    if (!phoneDigits) {
      setPhoneError("Phone number is required");
      hasError = true;
    } else if (!isValidPhone(phone, countryCode)) {
      setPhoneError(`Phone number must be ${expectedDigits} digits for ${countryCode}`);
      hasError = true;
    }

    if (hasError) return;

    identify.mutate(
      { email, phone: phone.replace(/\s/g, ""), countryCode },
      {
        onSuccess: () => {
          setOtp(["", "", "", "", "", ""]);
          setOtpError("");
          setStep(2);
          startResendTimer();
          showToast("OTP sent successfully");
        },
        onError: () => {
          setFailedAttempts((prev) => {
            const next = prev + 1;
            if (next >= MAX_ATTEMPTS) setIsLocked(true);
            return next;
          });
          setEmailError("Email and phone combination not found. Contact IT support.");
        },
      },
    );
  };

  const handleVerifyOtp = () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) return;

    verifyOtp.mutate(
      { email, otp: otpValue },
      {
        onSuccess: (data) => {
          setUserName(data.name);
          setUserEmail(data.email);
          setRoleLabel(data.roleLabel);
          setRoles(data.roles);
          setSelectedRole(data.role);
          setLastLogin(data.lastLogin);
          setStep(3);
          showToast("Identity verified successfully");
          if (timerRef.current) clearInterval(timerRef.current);
        },
        onError: () => {
          setOtpError("Invalid OTP. Please try again.");
        },
      },
    );
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    startResendTimer();
    identify.mutate({ email, phone: phone.replace(/\s/g, ""), countryCode });
    showToast("OTP resent successfully");
  };

  const handleLogin = () => {
    loginMut.mutate(
      { email, role: selectedRole },
      {
        onSuccess: (data) => {
          router.push(data.redirectUrl);
        },
      },
    );
  };

  const allOtpFilled = otp.every((d) => d.length === 1);

  const sessionItems = [
    {
      label: "Last login",
      value: lastLogin
        ? new Date(lastLogin).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "First login",
    },
    { label: "IP address", value: "192.168.1.42" },
    { label: "Session timeout", value: "8 hours" },
  ];

  return (
    <>
      <div className="flex min-h-screen bg-[#F5F6FA]">
        {/* Left Brand Panel */}
        <AdminBrandPanel />

        {/* Right Login Panel */}
        <div className="relative flex flex-1 items-center justify-center px-10">
          <div className="w-full max-w-[440px]">
            {/* Step Dots */}
            <StepDots total={3} current={step - 1} />

            {/* Step 1: Identify */}
            {step === 1 && (
              <div className="animate-[fadeSlide_0.3s_ease-out]">
                <div className="mb-7 inline-flex items-center gap-1.5 rounded-full border border-[#A6F4C5] bg-[#ECFDF3] px-3.5 py-1.5 text-xs font-semibold text-[#027A48]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-none stroke-[#027A48] stroke-2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Secure Admin Access
                </div>

                <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-[#101828]">
                  Sign in to Admin Portal
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-[#667085]">
                  Enter your Collegepond admin credentials to continue.
                </p>

                <div className="mb-5">
                  <FormInput
                    label="Email address"
                    type="email"
                    placeholder="you@collegepond.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    error={!!emailError}
                    errorMessage={emailError}
                    onKeyDown={(e) => e.key === "Enter" && handleIdentify()}
                  />
                </div>

                <div className="mb-5">
                  <PhoneInput
                    label="Phone number"
                    countryCode={countryCode}
                    phone={phone}
                    onCountryCodeChange={(code) => {
                      setCountryCode(code);
                      setPhoneError("");
                    }}
                    onPhoneChange={(val) => {
                      setPhone(val);
                      setPhoneError("");
                    }}
                    error={!!phoneError}
                    errorMessage={phoneError}
                  />
                </div>

                <Button
                  onClick={handleIdentify}
                  loading={identify.isPending}
                  iconRight
                  className="w-full"
                >
                  Send OTP
                </Button>

                {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
                  <div className="mt-3 text-center text-xs text-[#F04438]">
                    {failedAttempts} of {MAX_ATTEMPTS} attempts used
                  </div>
                )}

                <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#98A2B3]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 shrink-0 fill-none stroke-[#98A2B3] stroke-2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Sessions expire after 8 hours of inactivity
                </div>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <div className="animate-[fadeSlide_0.3s_ease-out]">
                <div className="mb-7 inline-flex items-center gap-1.5 rounded-full border border-[#A6F4C5] bg-[#ECFDF3] px-3.5 py-1.5 text-xs font-semibold text-[#027A48]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-none stroke-[#027A48] stroke-2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Secure Admin Access
                </div>

                <h1 className="mb-1.5 text-[26px] font-bold tracking-tight text-[#101828]">
                  Verify your identity
                </h1>
                <div className="mb-6 text-sm leading-relaxed text-[#667085]">
                  OTP sent to your phone and email
                  <br />
                  <strong className="text-[#344054]">{maskPhone(phone, countryCode)}</strong>
                  {" \u00B7 "}
                  <strong className="text-[#344054]">{maskEmail(email)}</strong>
                </div>

                <div className="mb-2 flex justify-center">
                  <OtpInput
                    length={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      setOtpError("");
                    }}
                    error={!!otpError}
                  />
                </div>
                {otpError && (
                  <div className="mb-2 flex items-center justify-center gap-1 text-xs text-[#F04438]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 fill-none stroke-[#F04438] stroke-2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    {otpError}
                  </div>
                )}

                <Button
                  onClick={handleVerifyOtp}
                  disabled={!allOtpFilled}
                  loading={verifyOtp.isPending}
                  className="mt-4 w-full"
                >
                  Verify OTP
                </Button>

                <div className="mt-4 text-center text-[13px] text-[#667085]">
                  {"Didn't receive the code? "}
                  {resendSeconds > 0 ? (
                    <span className="tabular-nums text-[#98A2B3]">({resendSeconds}s)</span>
                  ) : (
                    <button
                      onClick={handleResend}
                      className="cursor-pointer border-none bg-transparent font-semibold text-[#1570EF] hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setStep(1)}
                    className="cursor-pointer border-none bg-transparent text-[13px] font-medium text-[#667085] hover:text-[#1570EF]"
                  >
                    &larr; Back to login
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Role Selection */}
            {step === 3 && (
              <div className="animate-[fadeSlide_0.3s_ease-out]">
                <VerifiedCard
                  name={userName}
                  email={userEmail}
                  roleLabel={roleLabel}
                  roles={roles}
                  selectedRole={selectedRole}
                  onRoleChange={setSelectedRole}
                />

                <SessionInfo items={sessionItems} />

                <Button
                  onClick={handleLogin}
                  loading={loginMut.isPending}
                  iconRight
                  className="w-full"
                >
                  Continue to Dashboard
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <div className="mb-2">
              <button
                onClick={() => setShowRecovery(true)}
                className="cursor-pointer border-none bg-transparent text-[13px] font-medium text-[#1570EF] hover:underline"
              >
                Can&apos;t access your account?
              </button>
            </div>
            <div className="mb-1.5 text-xs text-[#98A2B3]">
              Collegepond Admin Portal v1.0 | Need help? Contact IT Support
            </div>
            <div className="text-[13px] text-[#667085]">
              Are you a partner?{" "}
              <Link href="/login" className="font-medium text-[#1570EF] no-underline hover:underline">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modals & Overlays */}
      <RecoveryModal open={showRecovery} onClose={() => setShowRecovery(false)} />
      <LockoutOverlay open={isLocked} />
      <Toast
        message={toastMessage}
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}
