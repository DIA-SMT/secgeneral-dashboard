import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { Suspense } from "react";

export const metadata = { title: "Iniciar sesión — POA 2026" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logos/Logo Muni- Secre dashboard.png"
            alt="Muni SMT"
            width={140}
            height={40}
            className="logo-auto h-10 w-auto"
            priority
          />
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">Planificación Operativa Anual 2026</h1>
            <p className="text-xs text-muted mt-1">Iniciá sesión para continuar</p>
          </div>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="text-[10px] text-muted/60 text-center leading-relaxed">
          Si no tenés credenciales, contactá a la Dirección de Planificación Estratégica
          o a la Dirección de Inteligencia Artificial.
        </p>
      </div>
    </div>
  );
}
