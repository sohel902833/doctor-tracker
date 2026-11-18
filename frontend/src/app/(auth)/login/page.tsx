import { ClipboardList, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const highlights = [
  { icon: Stethoscope, text: "Doctors, their hospitals and patient lists in one place" },
  { icon: ClipboardList, text: "Consultations with printable prescriptions" },
  { icon: ShieldCheck, text: "Role-based access for admins and doctors" },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="size-6" /> Doctor Tracker
        </div>
        <div className="relative space-y-6">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Care, organised. From first visit to follow-up.
          </h2>
          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <span className="rounded-lg bg-white/15 p-2">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">Doctor Tracker · Clinic management</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary lg:hidden">
              <HeartPulse className="size-6" />
              <span className="text-lg font-semibold">Doctor Tracker</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
          </div>
          {/* LoginForm reads ?next=, which needs a Suspense boundary. */}
          <Suspense fallback={<Skeleton className="h-60 w-full" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
