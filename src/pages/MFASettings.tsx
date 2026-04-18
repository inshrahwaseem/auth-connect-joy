import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MFASetup } from "@/components/auth/MFASetup";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/config/constants";

export default function MFASettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.DASHBOARD)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground">Security Settings</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <MFASetup />
      </main>
    </div>
  );
}
