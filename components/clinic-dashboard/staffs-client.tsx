//app/clinic-dashboard/(dashboard)/staffs/staffs-client.tsx
"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  Stethoscope,
  HandHelping,
  Share2,
  ShieldCheck,
  Power,
  Trash2,
  CheckCircle2,
  Circle,
  Save,
  KeyRound,
  Layers,
  ImagePlus,
  Stamp,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSION_KEYS,
  PermissionKey,
} from "@/lib/permissions";
import {
  upsertStaff,
  toggleStaffActive,
  softDeleteStaff,
} from "@/app/clinic-dashboard/(dashboard)/staffs/actions";

export interface StaffItem {
  id: string;
  userId: string;
  jobTitle: string;
  personnelCode: string | null;
  specialty: string | null;
  avatarUrl: string | null;
  stampUrl: string | null;
  isOwner: boolean;
  isActive: boolean;
  canLogin: boolean;
  canBeTherapist: boolean;
  canBeAssistant: boolean;
  canBeReferrer: boolean;
  hasAllServicesAccess: boolean;
  permissions: string[];
  user: {
    id: string;
    fullName: string | null;
    phone: string;
  };
  assignedServices: {
    id: string;
    title: string;
  }[];
}

interface ServiceItem {
  id: string;
  title: string;
}

interface StaffsClientProps {
  initialStaffs: StaffItem[];
  services: ServiceItem[];
  maxStaff: number;
}

const DEFAULT_NEW_PERMISSIONS: PermissionKey[] = [
  "patients.view",
  "appointments.view",
];

export function StaffsClient({
  initialStaffs,
  services,
  maxStaff,
}: StaffsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // پرسنل انتخاب‌شده در سایدبار لیست پرسنل (null = حالت ایجاد پرسنل جدید)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    initialStaffs[0]?.id ?? null
  );

  const selectedStaff = useMemo(
    () => initialStaffs.find((s) => s.id === selectedStaffId) ?? null,
    [initialStaffs, selectedStaffId]
  );

  // وضعیت‌های فرم
  const [fullName, setFullName] = useState(selectedStaff?.user.fullName ?? "");
  const [phone, setPhone] = useState(selectedStaff?.user.phone ?? "");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState(selectedStaff?.jobTitle ?? "");
  const [personnelCode, setPersonnelCode] = useState(
    selectedStaff?.personnelCode ?? ""
  );
  const [specialty, setSpecialty] = useState(selectedStaff?.specialty ?? "");
  const [avatarUrl, setAvatarUrl] = useState(selectedStaff?.avatarUrl ?? "");
  const [stampUrl, setStampUrl] = useState(selectedStaff?.stampUrl ?? "");

  const [canLogin, setCanLogin] = useState(selectedStaff?.canLogin ?? true);
  const [canBeTherapist, setCanBeTherapist] = useState(
    selectedStaff?.canBeTherapist ?? false
  );
  const [canBeAssistant, setCanBeAssistant] = useState(
    selectedStaff?.canBeAssistant ?? false
  );
  const [canBeReferrer, setCanBeReferrer] = useState(
    selectedStaff?.canBeReferrer ?? false
  );

  const [hasAllServicesAccess, setHasAllServicesAccess] = useState(
    selectedStaff?.hasAllServicesAccess ?? true
  );
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>(
    selectedStaff?.assignedServices.map((s) => s.id) ?? []
  );
  const [permissions, setPermissions] = useState<string[]>(
    selectedStaff?.permissions ?? DEFAULT_NEW_PERMISSIONS
  );

  // پیام بازخورد و دیالوگ حذف
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffItem | null>(null);

  // پر کردن فرم با اطلاعات پرسنل انتخاب‌شده
  const handleSelectStaff = (staff: StaffItem) => {
    setFeedback(null);
    setSelectedStaffId(staff.id);
    setFullName(staff.user.fullName ?? "");
    setPhone(staff.user.phone);
    setPassword("");
    setJobTitle(staff.jobTitle);
    setPersonnelCode(staff.personnelCode ?? "");
    setSpecialty(staff.specialty ?? "");
    setAvatarUrl(staff.avatarUrl ?? "");
    setStampUrl(staff.stampUrl ?? "");
    setCanLogin(staff.canLogin);
    setCanBeTherapist(staff.canBeTherapist);
    setCanBeAssistant(staff.canBeAssistant);
    setCanBeReferrer(staff.canBeReferrer);
    setHasAllServicesAccess(staff.hasAllServicesAccess);
    setAssignedServiceIds(staff.assignedServices.map((s) => s.id));
    setPermissions(
      staff.isOwner ? ALL_PERMISSION_KEYS : staff.permissions
    );
  };

  // ریست فرم برای افزودن پرسنل جدید
  const handleStartNewStaff = () => {
    setFeedback(null);
    setSelectedStaffId(null);
    setFullName("");
    setPhone("");
    setPassword("");
    setJobTitle("");
    setPersonnelCode("");
    setSpecialty("");
    setAvatarUrl("");
    setStampUrl("");
    setCanLogin(true);
    setCanBeTherapist(false);
    setCanBeAssistant(false);
    setCanBeReferrer(false);
    setHasAllServicesAccess(true);
    setAssignedServiceIds([]);
    setPermissions(DEFAULT_NEW_PERMISSIONS);
  };

  // تغییر تک دسترسی
  const togglePermission = (key: string) => {
    if (selectedStaff?.isOwner) return;
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  // انتخاب / لغو یک گروه دسترسی
  const togglePermissionGroup = (groupKeys: string[]) => {
    if (selectedStaff?.isOwner) return;
    const allSelected = groupKeys.every((k) => permissions.includes(k));
    if (allSelected) {
      setPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // تغییر سرویس‌های انتخابی
  const toggleServiceSelection = (serviceId: string) => {
    setAssignedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // تبدیل فایل تصویر به Base64 موقت (در صورت داشتن آپلودر اختصاصی می‌توانید به API آپلود متصل کنید)
  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "حجم تصویر نباید بیشتر از ۱ مگابایت باشد.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // ثبت فرم
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await upsertStaff({
        clinicUserId: selectedStaff?.id,
        fullName,
        phone,
        password: password || undefined,
        jobTitle,
        personnelCode,
        specialty,
        avatarUrl,
        stampUrl,
        canLogin,
        canBeTherapist,
        canBeAssistant,
        canBeReferrer,
        hasAllServicesAccess,
        assignedServiceIds,
        permissions,
      });

      if (!res.success) {
        setFeedback({
          type: "error",
          message: res.error || "خطا در ذخیره‌سازی اطلاعات",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: selectedStaff
          ? "تغییرات پرسنل با موفقیت ذخیره شد."
          : "پرسنل جدید با موفقیت به کلینیک اضافه شد.",
      });
      setPassword("");
      router.refresh();
    });
  };

  // فعال / غیرفعال کردن پرسنل
  const handleToggleActive = (staff: StaffItem) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await toggleStaffActive(staff.id);
      if (!res.success) {
        setFeedback({
          type: "error",
          message: res.error || "خطا در تغییر وضعیت",
        });
        return;
      }
      setFeedback({
        type: "success",
        message: res.isActive
          ? `${staff.user.fullName} فعال شد.`
          : `${staff.user.fullName} غیرفعال شد.`,
      });
      router.refresh();
    });
  };

  // حذف نرم پرسنل
  const handleConfirmSoftDelete = () => {
    if (!staffToDelete) return;
    const target = staffToDelete;
    setStaffToDelete(null);

    startTransition(async () => {
      const res = await softDeleteStaff(target.id);
      if (!res.success) {
        setFeedback({
          type: "error",
          message: res.error || "خطا در حذف پرسنل",
        });
        return;
      }

      if (selectedStaffId === target.id) {
        handleStartNewStaff();
      }
      setFeedback({
        type: "success",
        message: `پرسنل «${target.user.fullName}» حذف شد (سوابق مالی و پرونده‌های قبلی محفوظ ماندند).`,
      });
      router.refresh();
    });
  };

  // آمار بالای صفحه
  const stats = useMemo(() => {
    const activeCount = initialStaffs.filter((s) => s.isActive).length;
    const therapistsCount = initialStaffs.filter((s) => s.canBeTherapist).length;
    const assistantsCount = initialStaffs.filter((s) => s.canBeAssistant).length;
    return { activeCount, therapistsCount, assistantsCount };
  }, [initialStaffs]);

  const effectivePermissionsCount = selectedStaff?.isOwner
    ? ALL_PERMISSION_KEYS.length
    : permissions.length;
  const permissionPercent = Math.round(
    (effectivePermissionsCount / ALL_PERMISSION_KEYS.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* نوار آمار خلاصه بالای صفحه مطابق تصویر */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">کل پرسنل فعال / مجاز</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {stats.activeCount.toLocaleString("fa-IR")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  از {maxStaff.toLocaleString("fa-IR")} نفر
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">درمانگران</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {stats.therapistsCount.toLocaleString("fa-IR")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  نفر
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Stethoscope className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">دستیاران درمان</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {stats.assistantsCount.toLocaleString("fa-IR")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  نفر
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              <HandHelping className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* پیام خطا یا موفقیت */}
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* چیدمان دوتایی: ستون راست لیست پرسنل + ستون چپ فرم تنظیمات */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ستون راست: فهرست پرسنل (4 ستون از 12) */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">فهرست پرسنل</CardTitle>
              <CardDescription className="text-xs">
                یک نفر را انتخاب کنید یا پرسنل جدید بسازید
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleStartNewStaff}
              disabled={initialStaffs.length >= maxStaff && selectedStaffId !== null}
            >
              <UserPlus className="ml-1.5 h-4 w-4" />
              افزودن پرسنل
            </Button>
          </CardHeader>

          <CardContent className="space-y-2">
            {initialStaffs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                هنوز پرسنلی ثبت نشده است.
              </div>
            ) : (
              initialStaffs.map((staff) => {
                const isSelected = staff.id === selectedStaffId;
                return (
                  <div
                    key={staff.id}
                    onClick={() => handleSelectStaff(staff)}
                    className={cn(
                      "group flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs"
                        : "hover:border-muted-foreground/30 hover:bg-muted/40",
                      !staff.isActive && "opacity-65"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={staff.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {(staff.user.fullName ?? "پ").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">
                            {staff.user.fullName || "بدون نام"}
                          </p>
                          {staff.isOwner && (
                            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{staff.jobTitle}</span>
                          {!staff.isActive && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                              غیرفعال
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* دکمه فعال/غیرفعال و حذف نرم */}
                    {!staff.isOwner && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            staff.isActive
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title={
                            staff.isActive
                              ? "غیرفعال کردن پرسنل"
                              : "فعال کردن پرسنل"
                          }
                          disabled={isPending}
                          onClick={() => handleToggleActive(staff)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="حذف پرسنل"
                          disabled={isPending}
                          onClick={() => setStaffToDelete(staff)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ستون اصلی: فرم مشخصات و سطح دسترسی‌ها (8 ستون از 12) */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-8">
          {/* هدر وضعیت فرم و سوییچ فعال/غیرفعال سریع در حالت ویرایش */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
              <div>
                <CardTitle className="text-base">
                  {selectedStaff
                    ? `ویرایش اطلاعات: ${selectedStaff.user.fullName || ""}`
                    : "افزودن پرسنل جدید"}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  اطلاعات پایه، نقش‌های درمانی و سطح دسترسی‌های عملیاتی را تنظیم کنید
                </CardDescription>
              </div>

              {selectedStaff && !selectedStaff.isOwner && (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                  <span className="text-xs font-medium">
                    وضعیت همکاری:{" "}
                    <strong
                      className={
                        selectedStaff.isActive
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }
                    >
                      {selectedStaff.isActive ? "فعال" : "غیرفعال"}
                    </strong>
                  </span>
                  <Switch
                    checked={selectedStaff.isActive}
                    disabled={isPending}
                    onCheckedChange={() => handleToggleActive(selectedStaff)}
                  />
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* ۱. اطلاعات پایه */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  اطلاعات پایه
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      نام و نام خانوادگی <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="مثلاً: مهسا معطر"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">
                      سمت در کلینیک <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="jobTitle"
                      placeholder="مثلاً: اپراتور، منشی، پذیرش، خدمات..."
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personnelCode">کد پرسنلی</Label>
                    <Input
                      id="personnelCode"
                      placeholder="مثلاً: 02"
                      value={personnelCode}
                      onChange={(e) => setPersonnelCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">تخصص</Label>
                    <Input
                      id="specialty"
                      placeholder="مثلاً: پوست و مو، لیزر..."
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* ۲. نقش‌های درمانی و پورسانت (درمانگر، دستیار، معرف) */}
              <div className="space-y-3 border-t pt-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    نقش در خدمات (جهت محاسبه کمیسیون و پرکیس)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    یک پرسنل می‌تواند همزمان در چند نقش در پرونده و فاکتور انتخاب شود
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* کارت درمانگر */}
                  <button
                    type="button"
                    onClick={() => setCanBeTherapist((prev) => !prev)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3.5 text-right transition-all",
                      canBeTherapist
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Stethoscope className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">درمانگر</span>
                    </div>
                    {canBeTherapist ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                  </button>

                  {/* کارت دستیار درمان */}
                  <button
                    type="button"
                    onClick={() => setCanBeAssistant((prev) => !prev)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3.5 text-right transition-all",
                      canBeAssistant
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <HandHelping className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">دستیار درمان</span>
                    </div>
                    {canBeAssistant ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                  </button>

                  {/* کارت معرف */}
                  <button
                    type="button"
                    onClick={() => setCanBeReferrer((prev) => !prev)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-3.5 text-right transition-all",
                      canBeReferrer
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Share2 className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-medium">معرف</span>
                    </div>
                    {canBeReferrer ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                  </button>
                </div>
              </div>

              {/* ۳. دسترسی ورود به پنل */}
              <div className="space-y-4 border-t pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-primary" />
                      دسترسی ورود به پنل
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      امکان ورود پرسنل به داشبورد کلینیک با شماره موبایل یا رمز عبور
                    </p>
                  </div>
                  <Switch
                    checked={selectedStaff?.isOwner ? true : canLogin}
                    disabled={selectedStaff?.isOwner}
                    onCheckedChange={setCanLogin}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      شماره تماس <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      dir="ltr"
                      className="text-left"
                      placeholder="09123456789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">رمز عبور جدید (اختیاری)</Label>
                    <Input
                      id="password"
                      type="password"
                      dir="ltr"
                      className="text-left"
                      placeholder={
                        selectedStaff
                          ? "در صورت نیاز به تغییر وارد کنید"
                          : "حداقل ۶ کاراکتر (اختیاری)"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ۴. دسترسی به خدمات */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                دسترسی به خدمات
              </CardTitle>
              <CardDescription className="text-xs">
                مشخص کنید پرسنل کدام خدمات را می‌تواند ببیند یا مدیریت کند
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setHasAllServicesAccess(true)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-3.5 text-right transition-all",
                    hasAllServicesAccess
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40"
                  )}
                >
                  <span className="text-sm font-semibold">همه خدمات</span>
                  <span className="text-xs text-muted-foreground">
                    دسترسی کامل به تمامی خدمات کلینیک
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHasAllServicesAccess(false)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-3.5 text-right transition-all",
                    !hasAllServicesAccess
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40"
                  )}
                >
                  <span className="text-sm font-semibold">خدمات انتخابی</span>
                  <span className="text-xs text-muted-foreground">
                    فقط موارد مشخص‌شده در لیست زیر
                  </span>
                </button>
              </div>

              {!hasAllServicesAccess && (
                <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
                  <Label className="text-xs">انتخاب خدمات مجاز:</Label>
                  {services.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      هنوز سرویسی در بخش خدمات کلینیک تعریف نشده است.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {services.map((service) => {
                        const checked = assignedServiceIds.includes(service.id);
                        return (
                          <label
                            key={service.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border bg-background p-2.5 text-xs transition-colors",
                              checked && "border-primary bg-primary/5 font-medium"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                toggleServiceSelection(service.id)
                              }
                            />
                            <span className="truncate">{service.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ۵. دسترسی‌های عملیاتی */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    دسترسی‌های عملیاتی
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    حتماً حداقل یک دسترسی انتخاب کنید؛ بدون آن پرسنل ذخیره نمی‌شود
                  </CardDescription>
                </div>

                {!selectedStaff?.isOwner && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPermissions(ALL_PERMISSION_KEYS)}
                    >
                      انتخاب همه
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPermissions([])}
                    >
                      پاک کردن
                    </Button>
                  </div>
                )}
              </div>

              {/* نوار پیشرفت تعداد دسترسی‌های انتخاب‌شده */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>سطح دسترسی انتخاب‌شده</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {effectivePermissionsCount.toLocaleString("fa-IR")} از{" "}
                    {ALL_PERMISSION_KEYS.length.toLocaleString("fa-IR")} دسترسی انتخاب شده
                  </span>
                </div>
                <Progress value={permissionPercent} className="h-2" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.items.map((item) => item.key);
                const selectedInGroupCount = groupKeys.filter((k) =>
                  selectedStaff?.isOwner ? true : permissions.includes(k)
                ).length;
                const isGroupAllSelected =
                  selectedInGroupCount === groupKeys.length;

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {group.title}
                        </span>
                        <Badge variant="secondary" className="tabular-nums text-xs">
                          {selectedInGroupCount.toLocaleString("fa-IR")}/
                          {groupKeys.length.toLocaleString("fa-IR")}
                        </Badge>
                      </div>

                      {!selectedStaff?.isOwner && (
                        <button
                          type="button"
                          onClick={() => togglePermissionGroup(groupKeys)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {isGroupAllSelected ? "لغو گروه" : "انتخاب گروه"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                      {group.items.map((item) => {
                        const isChecked = selectedStaff?.isOwner
                          ? true
                          : permissions.includes(item.key);

                        return (
                          <label
                            key={item.key}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all",
                              isChecked
                                ? "border-primary/60 bg-primary/5 font-medium text-foreground"
                                : "hover:bg-muted/40 text-muted-foreground"
                            )}
                          >
                            <span>{item.label}</span>
                            <Checkbox
                              checked={isChecked}
                              disabled={selectedStaff?.isOwner}
                              onCheckedChange={() => togglePermission(item.key)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* ۶. تصویر و مهر پرسنل + دکمه نهایی ذخیره */}
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* آپلود تصویر پرسنل */}
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors hover:bg-muted/40">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="تصویر پرسنل"
                      className="h-16 w-16 rounded-full object-cover border"
                    />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">تصویر پرسنل</span>
                  <span className="text-[11px] text-muted-foreground">
                    PNG / JPG (حداکثر ۱ مگابایت)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e, setAvatarUrl)}
                  />
                </label>

                {/* آپلود مهر پرسنل */}
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors hover:bg-muted/40">
                  {stampUrl ? (
                    <img
                      src={stampUrl}
                      alt="مهر پرسنل"
                      className="h-16 w-24 object-contain"
                    />
                  ) : (
                    <Stamp className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium">مهر پرسنل</span>
                  <span className="text-[11px] text-muted-foreground">
                    PNG / JPG (حداکثر ۱ مگابایت)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e, setStampUrl)}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  بعد از هر ویرایش، حتماً دکمه ذخیره را بزنید تا تغییرات روی سرور ثبت شود.
                </p>
                <Button type="submit" disabled={isPending} className="min-w-36">
                  {isPending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      در حال ذخیره...
                    </>
                  ) : (
                    <>
                      <Save className="ml-2 h-4 w-4" />
                      ذخیره این پرسنل
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* دیالوگ تایید حذف نرم پرسنل */}
      <AlertDialog
        open={Boolean(staffToDelete)}
        onOpenChange={(open) => !open && setStaffToDelete(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پرسنل از فهرست کلینیک</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف <strong>{staffToDelete?.user.fullName}</strong> مطمئن هستید؟
              دسترسی ورود این پرسنل به پنل قطع می‌شود اما تمامی سوابق خدمات، فاکتورها و گزارش‌های قبلی او در دیتابیس محفوظ می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={handleConfirmSoftDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تایید و حذف
            </AlertDialogAction>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}