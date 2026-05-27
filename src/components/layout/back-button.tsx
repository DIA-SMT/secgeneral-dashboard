"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallback?: string;
  label?: string;
}

export function BackButton({ fallback = "/dashboard", label = "Volver" }: BackButtonProps) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1 transition-colors"
    >
      <span>←</span> {label}
    </button>
  );
}
