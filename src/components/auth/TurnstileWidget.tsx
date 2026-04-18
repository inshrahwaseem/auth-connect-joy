import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("get-turnstile-key").then(({ data, error }) => {
      if (error || !data?.siteKey?.startsWith("0x")) {
        // In dev/staging without Turnstile configured, silently skip widget
        return;
      }
      setSiteKey(data.siteKey);
    });
  }, []);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current || !siteKey) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
      "expired-callback": () => {
        onExpire?.();
      },
      "error-callback": () => {
        setLoadError(true);
        onError?.();
      },
      theme: "auto",
      size: "normal",
    });
  }, [siteKey, onVerify, onExpire, onError]);

  useEffect(() => {
    if (!siteKey) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Avoid duplicate script injection
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (!existingScript) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      script.onerror = () => setLoadError(true);
      document.head.appendChild(script);
    } else {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget, siteKey]);

  // No siteKey = Turnstile not configured (dev/local) — render nothing, don't block form
  if (!siteKey) return null;

  if (loadError) {
    return (
      <p className="text-xs text-destructive text-center py-2">
        CAPTCHA failed to load. Please refresh the page.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
}
