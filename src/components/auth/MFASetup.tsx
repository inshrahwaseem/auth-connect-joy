import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Shield, Smartphone, Mail, Key, Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sha256 } from "@/lib/utils";
import { BACKUP_CODE_COUNT } from "@/config/constants";
import type { MFASettings } from "@/types";

export function MFASetup() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MFASettings | null>(null);
  const [loading, setLoading] = useState(true);

  // TOTP state
  const [totpEnrolling, setTotpEnrolling] = useState(false);
  const [totpQR, setTotpQR] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpVerifying, setTotpVerifying] = useState(false);

  // Email OTP state
  const [emailOtpEnabling, setEmailOtpEnabling] = useState(false);

  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // FIX: useCallback so the function reference is stable and safe in useEffect deps
  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("mfa_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSettings(data as MFASettings);
    } else {
      // Row doesn't exist yet — show defaults
      setSettings({
        id: "",
        user_id: user.id,
        totp_enabled: false,
        email_otp_enabled: false,
        backup_codes_generated: false,
        created_at: "",
        updated_at: "",
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function upsertSettings(updates: Partial<MFASettings>): Promise<boolean> {
    if (!user) return false;
    const { error } = await supabase
      .from("mfa_settings")
      .upsert(
        { user_id: user.id, ...settings, ...updates },
        { onConflict: "user_id" }
      );
    if (!error) {
      setSettings((prev) => (prev ? { ...prev, ...updates } : null));
      return true;
    }
    return false;
  }

  // ─── TOTP enrollment ──────────────────────────────────────────────────────

  async function startTotpEnroll() {
    setTotpEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });
      if (error) throw new Error(error.message);
      setTotpQR(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setTotpFactorId(data.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start TOTP enrollment";
      toast.error(message);
      setTotpEnrolling(false);
    }
  }

  async function verifyTotpEnroll() {
    if (!totpFactorId || totpCode.length !== 6) return;
    setTotpVerifying(true);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactorId });
      if (challengeError) throw new Error(challengeError.message);

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) throw new Error(verifyError.message);

      await upsertSettings({ totp_enabled: true });
      setTotpEnrolling(false);
      setTotpQR(null);
      setTotpSecret(null);
      setTotpCode("");
      toast.success("Authenticator app enabled!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      toast.error(message);
    } finally {
      setTotpVerifying(false);
    }
  }

  async function disableTotp() {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) throw new Error(error.message);
      }
      await upsertSettings({ totp_enabled: false });
      toast.success("Authenticator app disabled");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to disable TOTP";
      toast.error(message);
    }
  }

  // ─── Email OTP ────────────────────────────────────────────────────────────

  async function toggleEmailOtp() {
    setEmailOtpEnabling(true);
    const newState = !settings?.email_otp_enabled;
    const ok = await upsertSettings({ email_otp_enabled: newState });
    if (ok) {
      toast.success(newState ? "Email OTP enabled" : "Email OTP disabled");
    } else {
      toast.error("Failed to update email OTP setting");
    }
    setEmailOtpEnabling(false);
  }

  // ─── Backup codes ─────────────────────────────────────────────────────────

  async function generateBackupCodes() {
    if (!user) return;
    setGeneratingCodes(true);
    try {
      // Generate N cryptographically random backup codes
      const codes: string[] = [];
      for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
        const array = new Uint8Array(4);
        crypto.getRandomValues(array);
        const hex = Array.from(array)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
        codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}`);
      }

      // Delete all previous backup codes for this user
      await supabase.from("backup_codes").delete().eq("user_id", user.id);

      // Store SHA-256 hashes — plaintext codes are never persisted
      const hashedCodes = await Promise.all(
        codes.map(async (code) => ({
          user_id: user.id,
          code_hash: await sha256(code),
        }))
      );

      const { error } = await supabase.from("backup_codes").insert(hashedCodes);
      if (error) throw new Error(error.message);

      await upsertSettings({ backup_codes_generated: true });
      setBackupCodes(codes);
      setShowBackupCodes(true);
      toast.success("Backup codes generated! Save them securely.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate backup codes";
      toast.error(message);
    } finally {
      setGeneratingCodes(false);
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Backup codes copied to clipboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Multi-Factor Authentication
          </h2>
          <p className="text-sm text-muted-foreground">
            Add extra layers of security to your account
          </p>
        </div>
      </div>

      {/* TOTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Authenticator App</CardTitle>
            </div>
            {settings?.totp_enabled && (
              <Badge variant="default" className="bg-green-600">
                <Check className="mr-1 h-3 w-3" /> Enabled
              </Badge>
            )}
          </div>
          <CardDescription>
            Use Google Authenticator, Authy, or any TOTP app
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings?.totp_enabled ? (
            <Button variant="destructive" size="sm" onClick={disableTotp}>
              Disable
            </Button>
          ) : totpEnrolling && totpQR ? (
            <div className="space-y-4">
              <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                <img src={totpQR} alt="TOTP QR Code — scan with your authenticator app" className="h-48 w-48" />
              </div>
              {totpSecret && (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Manual entry key:</p>
                  <code className="text-xs font-mono text-foreground break-all">
                    {totpSecret}
                  </code>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your app:
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
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={verifyTotpEnroll}
                  disabled={totpCode.length !== 6 || totpVerifying}
                >
                  {totpVerifying && <Loader2 className="animate-spin" />}
                  Verify & Enable
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTotpEnrolling(false);
                    setTotpQR(null);
                    setTotpCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={startTotpEnroll}>
              Set up authenticator
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Email OTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Email OTP</CardTitle>
            </div>
            {settings?.email_otp_enabled && (
              <Badge variant="default" className="bg-green-600">
                <Check className="mr-1 h-3 w-3" /> Enabled
              </Badge>
            )}
          </div>
          <CardDescription>
            Receive a one-time code via email each time you sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant={settings?.email_otp_enabled ? "destructive" : "default"}
            onClick={toggleEmailOtp}
            disabled={emailOtpEnabling}
          >
            {emailOtpEnabling && <Loader2 className="animate-spin" />}
            {settings?.email_otp_enabled ? "Disable" : "Enable"} Email OTP
          </Button>
        </CardContent>
      </Card>

      {/* Backup Codes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Backup Codes</CardTitle>
            </div>
            {settings?.backup_codes_generated && (
              <Badge variant="secondary">Generated</Badge>
            )}
          </div>
          <CardDescription>
            {BACKUP_CODE_COUNT} single-use recovery codes. Regenerating invalidates all previous codes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showBackupCodes && backupCodes.length > 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono text-foreground">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              <p className="text-xs text-destructive font-medium">
                ⚠ Save these codes somewhere safe. They won't be shown again.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyBackupCodes}>
                  <Copy className="h-4 w-4" />
                  Copy all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowBackupCodes(false)}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={generateBackupCodes} disabled={generatingCodes}>
              {generatingCodes && <Loader2 className="animate-spin" />}
              {settings?.backup_codes_generated ? "Regenerate codes" : "Generate codes"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
