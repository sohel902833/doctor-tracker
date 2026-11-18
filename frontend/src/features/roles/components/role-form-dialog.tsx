"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { applyServerErrors, Field, SelectField, TextField, toOptions } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { USER_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { Role } from "@/lib/models";
import { isSuperAdmin } from "@/lib/permissions";
import { usePermissionCatalog, useRoles, useSaveRole } from "../hooks";
import { PermissionPicker, type PermissionSelection } from "./permission-picker";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  userType: z.enum(USER_TYPES, { error: "User type is required" }),
  hasAllPermission: z.boolean(),
  permissions: z.record(z.string(), z.record(z.string(), z.boolean())),
  subordinateRoles: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

const toValues = (role?: Role | null): Values => ({
  name: role?.name ?? "",
  userType: role?.userType ?? "DOCTOR",
  hasAllPermission: isSuperAdmin(role?.permissions),
  permissions: role && !isSuperAdmin(role.permissions) ? role.permissions : {},
  subordinateRoles: role?.subordinateRoles.map((r) => r._id) ?? [],
});

/** Only granted actions are sent; super admin collapses to GLOBAL. */
const toPermissionsPayload = (values: Values) =>
  values.hasAllPermission
    ? { GLOBAL: { hasAllPermission: true } }
    : Object.fromEntries(
        Object.entries(values.permissions)
          .map(([module, actions]) => [
            module,
            Object.fromEntries(Object.entries(actions).filter(([, granted]) => granted)),
          ] as const)
          .filter(([, actions]) => Object.keys(actions).length > 0),
      );

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
}) {
  const catalog = usePermissionCatalog();
  const roles = useRoles();
  const save = useSaveRole();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(role) });

  useEffect(() => {
    if (open) form.reset(toValues(role));
  }, [open, role, form]);

  const hasAll = useWatch({ control: form.control, name: "hasAllPermission" });
  const otherRoles = (roles.data ?? []).filter((r) => r._id !== role?._id);

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      {
        id: role?._id,
        input: {
          name: values.name,
          userType: values.userType,
          permissions: toPermissionsPayload(values),
          subordinateRoles: values.subordinateRoles,
        },
      },
      {
        onSuccess: () => {
          toast.success(role ? "Role updated" : "Role created");
          onOpenChange(false);
        },
        onError: (error) => {
          if (!applyServerErrors(form, error)) toast.error(error.message);
        },
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "Create role"}</DialogTitle>
          <DialogDescription>Choose what users with this role can see and do.</DialogDescription>
        </DialogHeader>

        <form id="role-form" onSubmit={onSubmit} className="grid gap-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="name" label="Role name" placeholder="e.g. Senior Doctor" required />
            <SelectField form={form} name="userType" label="User type" required options={toOptions(USER_TYPES, humanize)} />
          </div>

          <Field label="Subordinate roles" hint="Users with this role can see users of these roles.">
            <Controller
              control={form.control}
              name="subordinateRoles"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                  {otherRoles.length === 0 && <span className="text-sm text-muted-foreground">No other roles yet.</span>}
                  {otherRoles.map((other) => (
                    <label key={other._id} className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/40">
                      <Checkbox
                        checked={field.value.includes(other._id)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked ? [...field.value, other._id] : field.value.filter((id) => id !== other._id),
                          )
                        }
                      />
                      {other.name}
                    </label>
                  ))}
                </div>
              )}
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Has all permissions</p>
              <p className="text-xs text-muted-foreground">Super admin: full access to every module, now and in future.</p>
            </div>
            <Controller
              control={form.control}
              name="hasAllPermission"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Has all permissions" />
              )}
            />
          </div>

          {catalog.data ? (
            <Controller
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <PermissionPicker
                  catalog={catalog.data}
                  value={field.value as PermissionSelection}
                  onChange={field.onChange}
                  disabled={hasAll}
                />
              )}
            />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="role-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {role ? "Save changes" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
