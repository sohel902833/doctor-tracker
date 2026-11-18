"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyServerErrors, TextField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { authApi } from "./api";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required").max(72),
});
type LoginValues = z.infer<typeof loginSchema>;

/** Only same-site paths are allowed as ?next=, never another origin. */
const safeNext = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

export function LoginForm() {
  const searchParams = useSearchParams();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = useMutation({
    mutationFn: authApi.login,
    // Full navigation so the app starts with a fresh session.
    onSuccess: () => window.location.assign(safeNext(searchParams.get("next"))),
    onError: (error) => {
      if (applyServerErrors(form, error)) return;
      form.setError("root", {
        message:
          error instanceof ApiError && error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : error.message,
      });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((values) => login.mutate(values))} className="grid gap-4" noValidate>
      <TextField form={form} name="email" label="Email" type="email" autoComplete="email" placeholder="you@hospital.com" required />
      <TextField form={form} name="password" label="Password" type="password" autoComplete="current-password" required />

      {form.formState.errors.root && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={login.isPending} className="mt-2">
        {login.isPending && <Loader2 className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
