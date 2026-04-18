import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Smartphone, Mail, Key } from "lucide-react";
import { sha256 } from "@/lib/utils";

interface MFAChallengeProps {
  factorId: string;
  hasEmailOtp: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAChallenge({
  factorId,
  hasEmailOtp,
  onSuccess,
  onCancel,
}: MFAChallengeProps) {
  const [totpCode, setTotpCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (factorId) return "totp";
    if (hasEmailOtp) return "email";
    return "backup";
  });

  async function handleTotpVerify() {
    if (totpCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw new Error(challengeError.message);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) throw new Error(verifyError.message);

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid code";
      toast.error(message);
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailOtp() {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-email-otp", {
        body: { action: "send" },
      });
      if (error) throw new Error(error.message);
      setEmailSent(true);
      toast.success("OTP sent to your email");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailVerify() {
    if (emailCode.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email-otp", {
        body: { action: "verify", code: emailCode },
      });
      if (error) throw new Error(error.message);
      if (data?.verified) {
        onSuccess();
      } else {
        toast.error("Invalid or expired code");
        setEmailCode("");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupCodeVerify() {
    if (!backupCode.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Hash the backup code client-side to compare against stored hash
      const codeHash = await sha256(backupCode.trim().toUpperCase());

      const { data: match, error } = await supabase
        .from("backup_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code_hash", codeHash)
        .eq("used", false)
        .single();

      if (error || !match) {
        toast.error("Invalid or already used backup code");
        setBackupCode("");
        return;
      }

      await supabase
        .from("backup_codes")
        .update({ used: true, used_at: new Date().toISOString() })
        .eq("id", match.id);

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const availableTabs = [
    ...(factorId ? [{ value: "totp", label: "Authenticator", icon: Smartphone }] : []),
    ...(hasEmailOtp ? [{ value: "email", label: "Email", icon: Mail }] : []),
    { value: "backup", label: "Backup Code", icon: Key },
  ];

  return (
    <AuthLayout
      title="Two-factor authentication"
      subtitle="Enter your verification code to continue"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1 gap-1.5">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {factorId && (
          <TabsContent value="totp" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="w-full"
              onClick={handleTotpVerify}
              disabled={totpCode.length !== 6 || loading}
            >
              {loading && <Loader2 className="animate-spin" />}
              Verify
            </Button>
          </TabsContent>
        )}

        {hasEmailOtp && (
          <TabsContent value="email" className="space-y-4 pt-4">
            {!emailSent ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  We'll send a one-time code to your email
                </p>
                <Button className="w-full" onClick={sendEmailOtp} disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  Send code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Enter the 6-digit code sent to your email
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={emailCode} onChange={setEmailCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  className="w-full"
                  onClick={handleEmailVerify}
                  disabled={emailCode.length !== 6 || loading}
                >
                  {loading && <Loader2 className="animate-spin" />}
                  Verify
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={sendEmailOtp}
                  disabled={loading}
                >
                  Resend code
                </Button>
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="backup" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground text-center">
            Enter one of your single-use backup codes
          </p>
          <div className="space-y-2">
            <Label htmlFor="backup-code" className="sr-only">
              Backup code
            </Label>
            <Input
              id="backup-code"
              placeholder="XXXX-XXXX"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="text-center font-mono tracking-widest"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleBackupCodeVerify}
            disabled={!backupCode.trim() || loading}
          >
            {loading && <Loader2 className="animate-spin" />}
            Verify
          </Button>
        </TabsContent>
      </Tabs>

      <Button
        variant="ghost"
        size="sm"
        className="mt-4 w-full"
        onClick={onCancel}
      >
        Cancel and sign out
      </Button>
    </AuthLayout>
  );
}
