// app/clinic-dashboard/(dashboard)/calendar/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { AppointmentBookingSource, AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { canAccessServiceCategory, hasPermission } from "@/lib/permissions";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import {
  evaluateAppointmentSlot,
  findAvailableSlotsForDate,
  resolveCalendarDate,
  type AvailableSlotSuggestion,
  type ValidationIssue,
} from "@/lib/scheduling/availability";

const CALENDAR_PATH = "/clinic-dashboard/calendar";

export interface UpsertAppointmentInput {
  id?: string;
  clientId: string;
  serviceId: string;
  subServiceId?: string | null;
  therapistId?: string | null;
  spaceId?: string | null;
  dateInput: string;
  startTime: string;
  bookingSource?: AppointmentBookingSource;
  status?: AppointmentStatus;
  allowManualOverride?: boolean;
  overrideReason?: string | null;
  notes?: string | null;
}

export interface UpsertAppointmentResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
  reasons?: string[];
  issues?: ValidationIssue[];
  canOverrideManually?: boolean;
}

export interface QuickCreateClientInput {
  fullName: string;
  phone?: string | null;
  nationalId?: string | null;
  nickname?: string | null;
}

export interface CreatedClientSummary {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string | null;
  nickname: string | null;
  fileNumber: number | null;
}

function normalizeIranPhoneLocal(raw?: string | null): string {
  const digits = normalizePersianDigits(String(raw || "")).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0098") && digits.length >= 14) {
    return "0" + digits.slice(4, 14);
  }
  if (digits.startsWith("98") && digits.length >= 12) {
    return "0" + digits.slice(2, 12);
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return "0" + digits;
  }
  return digits;
}

/**
 * ثبت سریع پرونده مراجع جدید در کلینیک از داخل ویزارد نوبت‌دهی
 * بررسی تکراری بودن صرفاً در مدل Client همین کلینیک انجام می‌شود.
 */
export async function quickCreateClientAction(
  input: QuickCreateClientInput
): Promise<{
  success: boolean;
  error?: string;
  client?: CreatedClientSummary;
}> {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (
      !ctx.clinicUser.isOwner &&
      !hasPermission(ctx.clinicUser, "appointments.create") &&
      !hasPermission(ctx.clinicUser, "appointments.edit")
    ) {
      return {
        success: false,
        error: "شما مجوز ثبت پرونده مراجع جدید را ندارید.",
      };
    }

    const fullName = String(input.fullName || "").trim();
    if (!fullName) {
      return {
        success: false,
        error: "علت عدم ثبت: وارد کردن نام و نام خانوادگی مراجع الزامی است.",
      };
    }

    const cleanPhone = normalizeIranPhoneLocal(input.phone);
    const cleanNationalId =
      normalizePersianDigits(String(input.nationalId || "")).replace(
        /\D/g,
        ""
      ) || null;
    const cleanNickname = String(input.nickname || "").trim() || null;

    const existingClinicClients = await prisma.client.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            nationalId: true,
          },
        },
      },
    });

    if (cleanNationalId) {
      const dupNat = existingClinicClients.find(
        (c) => c.user.nationalId && c.user.nationalId === cleanNationalId
      );
      if (dupNat) {
        return {
          success: false,
          error: `علت عدم ثبت: مراجعی با کد ملی ${normalizePersianDigits(
            cleanNationalId
          )} پیش‌تر با نام «${
            dupNat.user.fullName || "بدون نام"
          }» در این کلینیک پرونده دارد.`,
        };
      }
    }

    if (cleanPhone) {
      const dupPhone = existingClinicClients.find(
        (c) =>
          !c.user.phone.startsWith("NO_PHONE_") && c.user.phone === cleanPhone
      );
      if (dupPhone) {
        return {
          success: false,
          error: `علت عدم ثبت: مراجعی با شماره تماس ${normalizePersianDigits(
            cleanPhone
          )} پیش‌تر با نام «${
            dupPhone.user.fullName || "بدون نام"
          }» در این کلینیک پرونده دارد.`,
        };
      }
    }

    const maxFileRow = await prisma.client.findFirst({
      where: { clinicId: ctx.clinicId },
      orderBy: { fileNumber: "desc" },
      select: { fileNumber: true },
    });
    const nextFileNumber = (maxFileRow?.fileNumber ?? 0) + 1;

    const syntheticPhone =
      cleanPhone ||
      `NO_PHONE_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const createdClient = await prisma.$transaction(async (tx) => {
      let targetUser = cleanPhone
        ? await tx.user.findUnique({ where: { phone: cleanPhone } })
        : null;

      if (!targetUser) {
        targetUser = await tx.user.create({
          data: {
            phone: syntheticPhone,
            fullName,
            nationalId: cleanNationalId,
          },
        });
      } else {
        targetUser = await tx.user.update({
          where: { id: targetUser.id },
          data: {
            fullName: targetUser.fullName || fullName,
            nationalId: targetUser.nationalId || cleanNationalId,
          },
        });
      }

      return tx.client.create({
        data: {
          clinicId: ctx.clinicId,
          userId: targetUser.id,
          fileNumber: nextFileNumber,
          nickname: cleanNickname,
        },
        include: {
          user: {
            select: {
              fullName: true,
              phone: true,
              nationalId: true,
            },
          },
        },
      });
    });

    revalidatePath(CALENDAR_PATH);
    revalidatePath("/clinic-dashboard/clients");

    return {
      success: true,
      client: {
        id: createdClient.id,
        fullName: createdClient.user.fullName || fullName,
        phone: createdClient.user.phone.startsWith("NO_PHONE_")
          ? ""
          : createdClient.user.phone,
        nationalId: createdClient.user.nationalId,
        nickname: createdClient.nickname,
        fileNumber: createdClient.fileNumber,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? `علت عدم ثبت پرونده: ${err.message}`
          : "علت عدم ثبت پرونده: خطای غیرمنتظره هنگام ایجاد پرونده مراجع رخ داد.",
    };
  }
}

export async function upsertAppointmentAction(
  input: UpsertAppointmentInput
): Promise<UpsertAppointmentResult> {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    const isEdit = Boolean(input.id);
    const requiredPerm = isEdit ? "appointments.edit" : "appointments.create";

    if (!hasPermission(ctx.clinicUser, requiredPerm)) {
      return {
        success: false,
        error: isEdit
          ? "شما مجوز ویرایش نوبت را ندارید."
          : "شما مجوز ثبت نوبت جدید را ندارید.",
      };
    }

    if (!input.clientId || !input.serviceId) {
      return {
        success: false,
        error: "انتخاب مراجع و سرویس برای ثبت نوبت الزامی است.",
      };
    }

    if (
      !canAccessServiceCategory(ctx.clinicUser, requiredPerm, input.serviceId)
    ) {
      return {
        success: false,
        error: "شما دسترسی نوبت‌دهی برای این دسته‌بندی سرویس را ندارید.",
      };
    }

    const bookingSource =
      input.bookingSource === AppointmentBookingSource.AUTO
        ? AppointmentBookingSource.AUTO
        : AppointmentBookingSource.MANUAL;

    const [client, service, subService] = await Promise.all([
      prisma.client.findFirst({
        where: { id: input.clientId, clinicId: ctx.clinicId },
        include: { user: { select: { fullName: true, phone: true } } },
      }),
      prisma.service.findFirst({
        where: { id: input.serviceId, clinicId: ctx.clinicId },
        select: { id: true, title: true },
      }),
      input.subServiceId && input.subServiceId !== "NONE"
        ? prisma.subService.findFirst({
            where: {
              id: input.subServiceId,
              serviceId: input.serviceId,
            },
            select: { id: true, title: true },
          })
        : Promise.resolve(null),
    ]);

    if (!client) {
      return {
        success: false,
        error: "مراجع انتخاب‌شده در این کلینیک یافت نشد.",
      };
    }

    if (!service) {
      return {
        success: false,
        error: "سرویس انتخاب‌شده در این کلینیک یافت نشد.",
      };
    }

    const resolvedDate = resolveCalendarDate(input.dateInput);
    if (!resolvedDate) {
      return {
        success: false,
        error: "تاریخ واردشده برای نوبت معتبر نیست.",
      };
    }

    if (isEdit && input.id) {
      const existingAppt = await prisma.appointment.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId },
        select: { id: true },
      });
      if (!existingAppt) {
        return {
          success: false,
          error: "نوبت مورد نظر برای ویرایش یافت نشد.",
        };
      }
    }

    const evaluation = await evaluateAppointmentSlot({
      clinicId: ctx.clinicId,
      clientId: client.id,
      serviceId: service.id,
      subServiceId: subService?.id ?? null,
      therapistId:
        input.therapistId && input.therapistId !== "NONE"
          ? input.therapistId
          : null,
      spaceId: input.spaceId && input.spaceId !== "NONE" ? input.spaceId : null,
      dateInput: resolvedDate.utcMidnight,
      startTime: input.startTime,
      bookingSource,
      allowManualOverride:
        bookingSource === AppointmentBookingSource.MANUAL &&
        Boolean(input.allowManualOverride),
      excludeAppointmentId: input.id,
    });

    if (!evaluation.valid || !evaluation.computed || !evaluation.timing) {
      const detailedError =
        evaluation.reasons.length > 0
          ? evaluation.reasons.join(" | ")
          : "امکان ثبت نوبت در این زمان وجود ندارد.";

      return {
        success: false,
        error: detailedError,
        reasons: evaluation.reasons,
        issues: evaluation.issues,
        canOverrideManually: evaluation.canOverrideManually,
      };
    }

    const hasBlockingIssues = evaluation.issues.some((i) => i.blocking);
    const isManualOverride =
      bookingSource === AppointmentBookingSource.MANUAL &&
      Boolean(input.allowManualOverride) &&
      hasBlockingIssues;

    const nextStatus = input.status ?? AppointmentStatus.CONFIRMED;
    const therapistId =
      input.therapistId && input.therapistId !== "NONE"
        ? input.therapistId
        : null;

    const savedId = await prisma.$transaction(async (tx) => {
      const payload = {
        clinicId: ctx.clinicId,
        clientId: client.id,
        serviceId: service.id,
        subServiceId: subService?.id ?? null,
        therapistId,
        spaceId: evaluation.resolvedSpaceId,
        bookingSource,
        status: nextStatus,
        date: resolvedDate.utcMidnight,
        arrivalTime: evaluation.computed!.arrivalTime,
        startTime: evaluation.computed!.startTime,
        endTime: evaluation.computed!.endTime,
        blockEndTime: evaluation.computed!.blockEndTime,
        timingMode: evaluation.timing!.timingMode,
        prepBeforeMinutes: evaluation.timing!.prepBeforeMinutes,
        durationMinutes: evaluation.timing!.durationMinutes,
        stage1Minutes: evaluation.timing!.stage1Minutes,
        freeGapMinutes: evaluation.timing!.freeGapMinutes,
        stage2Minutes: evaluation.timing!.stage2Minutes,
        restAfterMinutes: evaluation.timing!.restAfterMinutes,
        requiresPrivacy: evaluation.timing!.requiresPrivacy,
        isManualOverride,
        overrideReason: isManualOverride
          ? input.overrideReason?.trim() || "ثبت دستی با هماهنگی ویژه"
          : null,
        notes: input.notes?.trim() || null,
      };

      if (isEdit && input.id) {
        const updated = await tx.appointment.update({
          where: { id: input.id },
          data: payload,
          select: { id: true },
        });
        return updated.id;
      }

      const created = await tx.appointment.create({
        data: {
          ...payload,
          createdById: ctx.clinicUserId,
        },
        select: { id: true },
      });
      return created.id;
    });

    revalidatePath(CALENDAR_PATH);
    revalidatePath("/clinic-dashboard");

    return {
      success: true,
      appointmentId: savedId,
      reasons: evaluation.reasons,
      issues: evaluation.issues,
    };
  } catch (err: unknown) {
    console.error("upsertAppointmentAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "خطای غیرمنتظره هنگام ثبت نوبت رخ داد.",
    };
  }
}

export async function getAvailableAppointmentSlotsAction(params: {
  serviceId: string;
  subServiceId?: string | null;
  therapistId?: string | null;
  spaceId?: string | null;
  dateInput: string;
  stepMinutes?: number;
  includeConditionalOnCall?: boolean;
}): Promise<{
  success: boolean;
  slots: AvailableSlotSuggestion[];
  summaryReason: string | null;
  error?: string;
}> {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return {
        success: false,
        slots: [],
        summaryReason: null,
        error: "نشست کاربری معتبر نیست.",
      };
    }

    if (
      !hasPermission(ctx.clinicUser, "appointments.view") &&
      !hasPermission(ctx.clinicUser, "appointments.create")
    ) {
      return {
        success: false,
        slots: [],
        summaryReason: null,
        error: "شما مجوز مشاهده زمان‌های نوبت‌دهی را ندارید.",
      };
    }

    const res = await findAvailableSlotsForDate({
      clinicId: ctx.clinicId,
      serviceId: params.serviceId,
      subServiceId:
        params.subServiceId && params.subServiceId !== "NONE"
          ? params.subServiceId
          : null,
      therapistId:
        params.therapistId && params.therapistId !== "NONE"
          ? params.therapistId
          : null,
      spaceId:
        params.spaceId && params.spaceId !== "NONE" ? params.spaceId : null,
      dateInput: normalizePersianDigits(params.dateInput),
      stepMinutes: params.stepMinutes ?? 15,
      includeConditionalOnCall: params.includeConditionalOnCall ?? true,
    });

    const summaryReason =
      res.slots.length === 0
        ? res.blockingReasons[0] ||
          "در تاریخ انتخاب‌شده، زمان آزاد و معتبری برای این سرویس و شرایط یافت نشد."
        : null;

    return {
      success: true,
      slots: res.slots,
      summaryReason,
    };
  } catch (err: unknown) {
    return {
      success: false,
      slots: [],
      summaryReason: null,
      error:
        err instanceof Error
          ? err.message
          : "خطا در محاسبه بازه‌های خالی نوبت‌دهی.",
    };
  }
}

export async function updateAppointmentStatusAction(params: {
  appointmentId: string;
  status: AppointmentStatus;
  cancellationReason?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    const isDeleteOrCancel = params.status === AppointmentStatus.CANCELED;
    const perm = isDeleteOrCancel ? "appointments.delete" : "appointments.edit";

    if (
      !hasPermission(ctx.clinicUser, perm) &&
      !hasPermission(ctx.clinicUser, "appointments.edit")
    ) {
      return {
        success: false,
        error: "شما مجوز تغییر وضعیت این نوبت را ندارید.",
      };
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: params.appointmentId, clinicId: ctx.clinicId },
      select: { id: true, serviceId: true },
    });

    if (!existing) {
      return { success: false, error: "نوبت مورد نظر یافت نشد." };
    }

    if (
      !canAccessServiceCategory(
        ctx.clinicUser,
        "appointments.edit",
        existing.serviceId
      )
    ) {
      return {
        success: false,
        error: "شما دسترسی تغییر نوبت‌های این دسته‌بندی سرویس را ندارید.",
      };
    }

    await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: params.status,
        cancellationReason:
          params.status === AppointmentStatus.CANCELED
            ? params.cancellationReason?.trim() || "لغو توسط کلینیک"
            : null,
      },
    });

    revalidatePath(CALENDAR_PATH);
    revalidatePath("/clinic-dashboard");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "خطا در به‌روزرسانی وضعیت نوبت.",
    };
  }
}

export async function deleteAppointmentAction(
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getCurrentClinicContext();
    if (!ctx) {
      return { success: false, error: "نشست کاربری معتبر نیست." };
    }

    if (!hasPermission(ctx.clinicUser, "appointments.delete")) {
      return { success: false, error: "شما مجوز حذف نوبت را ندارید." };
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId: ctx.clinicId },
      select: { id: true, serviceId: true },
    });

    if (!existing) {
      return { success: false, error: "نوبت مورد نظر یافت نشد." };
    }

    if (
      !canAccessServiceCategory(
        ctx.clinicUser,
        "appointments.delete",
        existing.serviceId
      )
    ) {
      return {
        success: false,
        error: "شما مجوز حذف نوبت‌های این سرویس را ندارید.",
      };
    }

    await prisma.appointment.delete({
      where: { id: existing.id },
    });

    revalidatePath(CALENDAR_PATH);
    revalidatePath("/clinic-dashboard");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در حذف نوبت.",
    };
  }
}