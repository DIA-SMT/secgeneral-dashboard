import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { Suspense } from "react";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logos/logoMuni-sm.png"
            alt="PlanIA"
            width={64}
            height={64}
            className="h-16 w-16"
            priority
          />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              <span>Plan</span><span className="text-primary">IA</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Plan Operativo Anual 2026 · Municipalidad de SMT
            </p>
            <p className="text-xs text-muted mt-3">Iniciá sesión para continuar</p>
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
