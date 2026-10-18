"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import { wsClient } from "@/lib/ws";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const { token, device, initializeAuth } = useAuthStore();

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Connect WebSocket when authenticated
  React.useEffect(() => {
    if (token && device) {
      wsClient.connect(token, device.id);
    } else {
      wsClient.disconnect();
    }
    return () => {
      wsClient.disconnect();
    };
  }, [token, device]);

  // Actively remove Netlify Drawer and feedback widgets if injected
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const purgeNetlifyWidgets = () => {
      const selectors = [
        "#netlify-drawer",
        "[data-netlify-drawer]",
        "netlify-drawer",
        "iframe[src*='netlify']",
        "iframe[title*='Netlify']",
        ".netlify-badge",
        "[class*='netlify-drawer']",
        "[class*='netlify-feedback']",
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.remove();
        });
      });
    };

    purgeNetlifyWidgets();
    const timer = setInterval(purgeNetlifyWidgets, 1000);
    const observer = new MutationObserver(() => purgeNetlifyWidgets());
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      clearInterval(timer);
      observer.disconnect();
    };
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
