"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { applyServerErrors, SelectField, TextField, toOptions } from "@/components/form/fields";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useHospitalOptions } from "@/features/hospitals/hooks";
import { useRoles } from "@/features/roles/hooks";
import { BLOOD_GROUPS, GENDERS, type UserType } from "@/lib/constants";
import { humanize, toDateInputValue } from "@/lib/format";
import type { User } from "@/lib/models";
import { useSaveUser } from "../hooks";

const text = z.string().trim();

const schema = z.object({
  name: text.min(1, "Name is required"),
  email: z.union([z.literal(""), z.email("Email must be valid")]),
  phone: text,
  password: z.string().max(72, "Password cannot exceed 72 characters"),
  role: z.string().min(1, "Role is required"),
  dateOfBirth: z.string(),
  gender: z.string(),
  bloodGroup: z.string(),
  isActive: z.boolean(),
  doctorProfile: z.object({
    specialization: text,
    qualifications: text,
    registrationNo: text,
    designation: text,
  }),
  hospitals: z.array(
    z.object({
      hospital: z.string().min(1, "Select a hospital"),
      startDate: z.string(),
      endDate: z.string(),
      isCurrent: z.boolean(),
      summary: text,
    }),
  ),
});
type Values = z.infer<typeof schema>;

const toValues = (user?: User | null): Values => ({
  name: user?.name ?? "",
  email: user?.email ?? "",
  phone: user?.phone ?? "",
  password: "",
  role: user?.role._id ?? "",
  dateOfBirth: toDateInputValue(user?.dateOfBirth),
  gender: user?.gender ?? "",
  bloodGroup: user?.bloodGroup ?? "",
  isActive: user?.isActive ?? true,
  doctorProfile: {
    specialization: user?.doctorProfile?.specialization ?? "",
    qualifications: user?.doctorProfile?.qualifications ?? "",
    registrationNo: user?.doctorProfile?.registrationNo ?? "",
    designation: user?.doctorProfile?.designation ?? "",
  },
  hospitals: (user?.hospitals ?? []).map((h) => ({
    hospital: h.hospital?._id ?? "",
    startDate: toDateInputValue(h.startDate),
    endDate: toDateInputValue(h.endDate),
    isCurrent: h.isCurrent,
    summary: h.summary ?? "",
  })),
});

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

/**
 * Create / edit any user. Doctors also get their prescription profile and
 * hospital history. `userTypes` limits the selectable roles (e.g. DOCTOR).
 */
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  userTypes,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  userTypes?: UserType[];
  title?: string;
}) {
  const roles = useRoles();
  const hospitalOptions = useHospitalOptions();
  const save = useSaveUser();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(user) });
  const hospitals = useFieldArray({ control: form.control, name: "hospitals" });

  const roleOptions = (roles.data ?? [])
    .filter((r) => !userTypes || userTypes.includes(r.userType))
    .map((r) => ({ value: r._id, label: `${r.name} (${humanize(r.userType)})` }));

  useEffect(() => {
    if (!open) return;
    const values = toValues(user);
    // A single allowed role (e.g. "Doctor") is preselected.
    if (!user && roleOptions.length === 1) values.role = roleOptions[0].value;
    form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, roles.data]);

  const roleId = useWatch({ control: form.control, name: "role" });
  const hospitalValues = useWatch({ control: form.control, name: "hospitals" });
  const selectedRole = roles.data?.find((r) => r._id === roleId);
  const isDoctor = selectedRole?.userType === "DOCTOR";
  const isPatient = selectedRole?.userType === "PATIENT";

  const onSubmit = form.handleSubmit((values) => {
    if (!user && !isPatient && values.password.length < 8) {
      form.setError("password", { message: "Password must be at least 8 characters" });
      return;
    }
    save.mutate(
      {
        id: user?._id,
        input: {
          name: values.name,
          email: orNull(values.email),
          phone: orNull(values.phone),
          ...(values.password && { password: values.password }),
          role: values.role,
          dateOfBirth: orNull(values.dateOfBirth),
          gender: orNull(values.gender),
          bloodGroup: orNull(values.bloodGroup),
          isActive: values.isActive,
          ...(isDoctor && {
            doctorProfile: {
              specialization: orNull(values.doctorProfile.specialization),
              qualifications: orNull(values.doctorProfile.qualifications),
              registrationNo: orNull(values.doctorProfile.registrationNo),
              designation: orNull(values.doctorProfile.designation),
            },
            hospitals: values.hospitals.map((h) => ({
              hospital: h.hospital,
              startDate: orNull(h.startDate),
              endDate: h.isCurrent ? null : orNull(h.endDate),
              isCurrent: h.isCurrent,
              summary: orNull(h.summary),
            })),
          }),
        },
      },
      {
        onSuccess: () => {
          toast.success(user ? "Changes saved" : `${humanize(selectedRole?.userType ?? "User")} created`);
          onOpenChange(false);
        },
        onError: (error) => !applyServerErrors(form, error) && toast.error(error.message),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? (user ? "Edit user" : "Add user")}</DialogTitle>
          <DialogDescription>
            {isPatient ? "Patients need a phone number." : "Staff sign in with their email and password."}
          </DialogDescription>
        </DialogHeader>

        <form id="user-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField form={form} name="name" label="Full name" required className="sm:col-span-2" />
            <SelectField form={form} name="role" label="Role" required options={roleOptions} placeholder="Select a role" />
            <TextField form={form} name="email" label="Email" type="email" required={!isPatient} />
            <TextField form={form} name="phone" label="Phone" required={isPatient} placeholder="01711-000000" />
            <TextField
              form={form}
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              required={!user && !isPatient}
              hint={user ? "Leave blank to keep the current password." : isPatient ? "Optional: patients usually don't sign in." : undefined}
            />
            <TextField form={form} name="dateOfBirth" label="Date of birth" type="date" />
            <SelectField form={form} name="gender" label="Gender" allowEmpty options={toOptions(GENDERS, humanize)} />
            <SelectField form={form} name="bloodGroup" label="Blood group" allowEmpty options={toOptions(BLOOD_GROUPS)} />
          </div>

          {isDoctor && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium">Doctor profile</p>
                <p className="text-xs text-muted-foreground">Printed on prescriptions.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField form={form} name="doctorProfile.specialization" label="Specialization" placeholder="Cardiology" />
                <TextField form={form} name="doctorProfile.qualifications" label="Qualifications" placeholder="MBBS, FCPS" />
                <TextField form={form} name="doctorProfile.designation" label="Designation" placeholder="Consultant" />
                <TextField form={form} name="doctorProfile.registrationNo" label="Registration no." placeholder="BMDC A-12345" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Hospitals</p>
                  <p className="text-xs text-muted-foreground">Where the doctor works or has worked.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => hospitals.append({ hospital: "", startDate: "", endDate: "", isCurrent: hospitals.fields.length === 0, summary: "" })}
                >
                  <Plus /> Add hospital
                </Button>
              </div>
              {hospitals.fields.map((entry, index) => {
                const isCurrent = hospitalValues?.[index]?.isCurrent;
                return (
                  <div key={entry.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                    <SelectField form={form} name={`hospitals.${index}.hospital`} label="Hospital" options={hospitalOptions} className="sm:col-span-2" />
                    <TextField form={form} name={`hospitals.${index}.startDate`} label="Start date" type="date" />
                    <TextField form={form} name={`hospitals.${index}.endDate`} label="End date" type="date" disabled={isCurrent} />
                    <TextField form={form} name={`hospitals.${index}.summary`} label="Summary" placeholder="Senior consultant" className="sm:col-span-2" />
                    <div className="flex items-center justify-between sm:col-span-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Controller
                          control={form.control}
                          name={`hospitals.${index}.isCurrent`}
                          render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />}
                        />
                        Currently works here
                      </label>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => hospitals.remove(index)}>
                        <Trash2 /> Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive users can&apos;t sign in.</p>
            </div>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Active" />}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="user-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />}
            {user ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
