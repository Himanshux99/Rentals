"use client";

import dynamic from "next/dynamic";

// Toasts only fire after a user action, so keep sonner (~11 KB br) out of the first-load bundle.
export const DeferredToaster = dynamic(() => import("@/components/ui/sonner").then((m) => m.Toaster), { ssr: false });
