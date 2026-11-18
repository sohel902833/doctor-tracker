"use client";

import type { ReactNode } from "react";
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/** Label + control + error message, laid out consistently. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

type BaseProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label?: string;
  required?: boolean;
  hint?: string;
  className?: string;
};

const errorOf = <T extends FieldValues>(form: UseFormReturn<T>, name: FieldPath<T>) => {
  const error = name
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], form.formState.errors);
  return (error as { message?: string } | undefined)?.message;
};

export function TextField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  hint,
  className,
  ...inputProps
}: BaseProps<T> & Omit<React.ComponentProps<typeof Input>, "form" | "name">) {
  return (
    <Field label={label} htmlFor={name} error={errorOf(form, name)} hint={hint} required={required} className={className}>
      <Input
        id={name}
        aria-invalid={Boolean(errorOf(form, name))}
        {...inputProps}
        {...form.register(name, inputProps.type === "number" ? { valueAsNumber: true } : undefined)}
      />
    </Field>
  );
}

export function TextAreaField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  hint,
  className,
  ...props
}: BaseProps<T> & Omit<React.ComponentProps<typeof Textarea>, "form" | "name">) {
  return (
    <Field label={label} htmlFor={name} error={errorOf(form, name)} hint={hint} required={required} className={className}>
      <Textarea id={name} aria-invalid={Boolean(errorOf(form, name))} {...props} {...form.register(name)} />
    </Field>
  );
}

const NONE = "__none__";

/** Select bound to the form. With `allowEmpty`, "" (none) is an option. */
export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  required,
  hint,
  className,
  options,
  placeholder = "Select…",
  allowEmpty,
  disabled,
}: BaseProps<T> & {
  options: { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  return (
    <Field label={label} htmlFor={name} error={errorOf(form, name)} hint={hint} required={required} className={className}>
      <Controller
        control={form.control as Control<T>}
        name={name}
        render={({ field }) => (
          <Select
            value={(field.value as string) || (allowEmpty ? NONE : "")}
            onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
            disabled={disabled}
          >
            <SelectTrigger id={name} className="w-full" aria-invalid={Boolean(errorOf(form, name))}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty && <SelectItem value={NONE}>—</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

/**
 * Puts backend validation errors ({ "patient.phone": "Phone is required" })
 * under the matching form fields. Returns true if any were applied.
 */
export const applyServerErrors = <T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
) => {
  if (!(error instanceof ApiError)) return false;
  const entries = Object.entries(error.fieldErrors);
  for (const [field, message] of entries) {
    form.setError(field as FieldPath<T>, { type: "server", message });
  }
  return entries.length > 0;
};

/** "" -> null for optional text fields before sending to the API. */
export const emptyToNull = <T extends Record<string, unknown>>(values: T) =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === "" ? null : value]),
  ) as { [K in keyof T]: T[K] extends string ? T[K] | null : T[K] };

export const toOptions = (values: readonly string[], label: (v: string) => string = (v) => v) =>
  values.map((value) => ({ value, label: label(value) }));
