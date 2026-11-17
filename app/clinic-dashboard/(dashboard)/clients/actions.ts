// app/clinic-dashboard/(dashboard)/clients/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import {
  hasPermission,
  canAccessServiceCategory,
} from "@/lib/permissions";
import { normalizeIranianPhone, isValidIranianMobile } from "@/lib/kavenegar/kavenegar";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

// ==========================================
// 1. ایجاد یا بازیابی پرونده مراجعه‌کننده
// ==========================================
export interface CreateClientInput {
  fullName: string;
  fileNumber?: number | null;
  gender: "FEMALE" | "MALE";
  phone?: string;
  noPhone?: boolean;
  birthDate?: string | null; // ISO string
  nationalId?: string;
  noNationalId?: boolean;
  referralSource?: string;
  referrerType?: "CLIENT" | "STAFF" | "NONE";
  referrerId?: string | null;
  notes?: string;
}

export async function createClientAction(input: CreateClientInput) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.create")) {
    return { success: false, error: "شما مجوز ثبت پرونده جدید ندارید." };
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return { success: false, error: "نام و نام خانوادگی مراجعه‌کننده الزامی است." };
  }

  // مدیریت شماره موبایل (یا ساخت شماره سیستمی موقت برای مراجعین بدون شماره)
  let normalizedPhone = "";
  if (input.noPhone) {
    normalizedPhone = `NO_PHONE_${ctx.clinicId.slice(0, 6)}_${Date.now()}`;
  } else {
    const rawPhone = normalizePersianDigits(input.phone || "").trim();
    if (!rawPhone || !isValidIranianMobile(rawPhone)) {
      return { success: false, error: "شماره موبایل واردشده معتبر نیست." };
    }
    normalizedPhone = normalizeIranianPhone(rawPhone);
  }

  // مدیریت کد ملی
  const cleanNationalId = input.noNationalId
    ? null
    : normalizePersianDigits(input.nationalId || "").trim() || null;

  if (!input.noNationalId && (!cleanNationalId || cleanNationalId.length !== 10)) {
    return { success: false, error: "کد ملی باید ۱۰ رقم باشد یا گزینه فاقد کد ملی را انتخاب کنید." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // محاسبه شماره پرونده خودکار در صورت عدم ورود
      let targetFileNumber = input.fileNumber;
      if (!targetFileNumber) {
        const lastClient = await tx.client.findFirst({
          where: { clinicId: ctx.clinicId, fileNumber: { not: null } },
          orderBy: { fileNumber: "desc" },
          select: { fileNumber: true },
        });
        targetFileNumber = (lastClient?.fileNumber || 1000) + 1;
      }

      // بررسی تکراری نبودن شماره پرونده در کلینیک
      const existingFile = await tx.client.findFirst({
        where: { clinicId: ctx.clinicId, fileNumber: targetFileNumber },
      });
      if (existingFile) {
        throw new Error(`شماره پرونده ${targetFileNumber} قبلاً ثبت شده است.`);
      }

      // پیدا کردن یا ایجاد User سراسری
      let user = await tx.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (!user && cleanNationalId) {
        user = await tx.user.findUnique({
          where: { nationalId: cleanNationalId },
        });
      }

      if (!user) {
        user = await tx.user.create({
          data: {
            phone: normalizedPhone,
            fullName,
            nationalId: cleanNationalId,
          },
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            fullName: user.fullName || fullName,
            nationalId: user.nationalId || cleanNationalId,
          },
        });
      }

      // بررسی وجود پرونده در همین کلینیک
      const existingClient = await tx.client.findUnique({
        where: {
          userId_clinicId: {
            userId: user.id,
            clinicId: ctx.clinicId,
          },
        },
      });

      if (existingClient) {
        throw new Error("پرونده این مراجعه‌کننده قبلاً در کلینیک ثبت شده است.");
      }

      const client = await tx.client.create({
        data: {
          userId: user.id,
          clinicId: ctx.clinicId,
          fileNumber: targetFileNumber,
          gender: input.gender,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          referralSource: input.referralSource || null,
          referrerClientId:
            input.referrerType === "CLIENT" && input.referrerId
              ? input.referrerId
              : null,
          referrerStaffId:
            input.referrerType === "STAFF" && input.referrerId
              ? input.referrerId
              : null,
          notes: input.notes?.trim() || null,
        },
      });

      return client;
    });

    revalidatePath("/clinic-dashboard/clients");
    return { success: true, clientId: result.id };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ثبت پرونده مراجعه‌کننده.";
    return { success: false, error: message };
  }
}

// ==========================================
// 2. به‌روزرسانی برچسب یا یادداشت پرونده
// ==========================================
export async function updateClientMetaAction(
  clientId: string,
  data: { tag?: string | null; notes?: string | null }
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست نامعتبر است." };
  if (!hasPermission(ctx.clinicUser, "patients.edit")) {
    return { success: false, error: "مجوز ویرایش پرونده ندارید." };
  }

  await prisma.client.updateMany({
    where: { id: clientId, clinicId: ctx.clinicId },
    data: {
      ...(data.tag !== undefined ? { tag: data.tag } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  revalidatePath("/clinic-dashboard/clients");
  revalidatePath(`/clinic-dashboard/clients/${clientId}`);
  return { success: true };
}

// ==========================================
// 3. ثبت همزمان چند سرویس + کسر خودکار انبار + صدور فاکتور واحد
// ==========================================
export interface ServiceConsumableItemInput {
  clinicProductId: string;
  preferredBatchId?: string | null;
  quantity: number;
  sellingPrice: number;
}

export interface ServiceCartItemInput {
  serviceId: string;
  subServiceId: string;
  performedAt: string;
  finalPrice: number;
  therapistId?: string | null;
  assistantIds: string[];
  referrerType: "NONE" | "STAFF" | "CLIENT";
  referrerId?: string | null;
  description?: string;
  consumables: ServiceConsumableItemInput[];
}

export interface InvoicePaymentItemInput {
  paymentMethod: "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT";
  amount: number;
  terminalId?: string | null;
  creditProvider?: string | null;
  trackingCode?: string | null;
}

export interface InvoiceInstallmentItemInput {
  amount: number;
  dueDate: string;
  isCheck: boolean;
  checkNumber?: string | null;
}

export interface CreateMultiServiceInvoiceInput {
  clientId: string;
  services: ServiceCartItemInput[];
  discountAmount: number;
  discountReason?: string;
  extraChargeAmount: number;
  extraChargeReason?: string;
  payments: InvoicePaymentItemInput[];
  remainingMode: "PAID" | "DEBT" | "INSTALLMENT";
  installments: InvoiceInstallmentItemInput[];
}

export async function createMultiServiceInvoiceAction(
  input: CreateMultiServiceInvoiceInput
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "services.create")) {
    return { success: false, error: "شما مجوز ثبت سرویس ندارید." };
  }

  if (!input.services || input.services.length === 0) {
    return { success: false, error: "حداقل یک سرویس باید انتخاب شود." };
  }

  for (const item of input.services) {
    if (!canAccessServiceCategory(ctx.clinicUser, "services.create", item.serviceId)) {
      return {
        success: false,
        error: "شما مجوز ثبت سرویس در یکی از دسته‌بندی‌های انتخاب‌شده را ندارید.",
      };
    }
  }

  if (
    input.discountAmount > 0 &&
    !hasPermission(ctx.clinicUser, "other.discounts") &&
    !ctx.clinicUser.isOwner
  ) {
    return { success: false, error: "شما مجوز اعمال تخفیف ندارید." };
  }

  try {
    const createdInvoice = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: input.clientId, clinicId: ctx.clinicId },
      });
      if (!client) throw new Error("پرونده مراجع یافت نشد.");

      let servicesTotal = 0;
      let consumablesSellTotal = 0;

      for (const srv of input.services) {
        servicesTotal += Math.max(0, Math.round(srv.finalPrice));
        for (const cons of srv.consumables) {
          if (cons.quantity > 0 && cons.sellingPrice > 0) {
            consumablesSellTotal += Math.round(cons.quantity * cons.sellingPrice);
          }
        }
      }

      const subTotalAmount = servicesTotal + consumablesSellTotal;
      const discountAmount = Math.max(0, Math.round(input.discountAmount || 0));
      const extraChargeAmount = Math.max(0, Math.round(input.extraChargeAmount || 0));
      const totalAmount = Math.max(
        0,
        subTotalAmount - discountAmount + extraChargeAmount
      );

      const validPayments = input.payments.filter((p) => p.amount > 0);
      const paidAmount = validPayments.reduce((sum, p) => sum + Math.round(p.amount), 0);

      if (paidAmount > totalAmount) {
        throw new Error("مجموع مبالغ پرداختی نمی‌تواند بیشتر از مبلغ کل فاکتور باشد.");
      }

      const walletUsedAmount = validPayments
        .filter((p) => p.paymentMethod === "WALLET")
        .reduce((sum, p) => sum + Math.round(p.amount), 0);

      if (walletUsedAmount > client.walletBalance) {
        throw new Error("موجودی کیف پول مراجع برای پرداخت این مبلغ کافی نیست.");
      }

      const remainingAmount = totalAmount - paidAmount;

      if (remainingAmount > 0 && input.remainingMode === "INSTALLMENT") {
        if (!input.installments || input.installments.length === 0) {
          throw new Error("لطفاً حداقل یک قسط تعریف کنید.");
        }
        const installmentsSum = input.installments.reduce(
          (sum, ins) => sum + Math.round(ins.amount),
          0
        );
        if (installmentsSum !== remainingAmount) {
          throw new Error(
            `مجموع اقساط (${installmentsSum.toLocaleString()}) با مبلغ مانده (${remainingAmount.toLocaleString()}) برابر نیست.`
          );
        }
      }

      let invoiceStatus = "PAID";
      if (remainingAmount > 0) {
        if (input.remainingMode === "INSTALLMENT") {
          invoiceStatus = "INSTALLMENT";
        } else if (paidAmount > 0) {
          invoiceStatus = "PARTIAL";
        } else {
          invoiceStatus = "UNPAID";
        }
      }

      const lastInvoice = await tx.invoice.findFirst({
        where: { clinicId: ctx.clinicId, invoiceNumber: { not: null } },
        orderBy: { invoiceNumber: "desc" },
        select: { invoiceNumber: true },
      });
      const nextInvoiceNumber = (lastInvoice?.invoiceNumber || 150000) + 1;

      const invoice = await tx.invoice.create({
        data: {
          clinicId: ctx.clinicId,
          clientId: client.id,
          invoiceNumber: nextInvoiceNumber,
          subTotalAmount,
          discountAmount,
          discountReason: input.discountReason?.trim() || null,
          extraChargeAmount,
          extraChargeReason: input.extraChargeReason?.trim() || null,
          totalAmount,
          paidAmount,
          status: invoiceStatus,
        },
      });

      for (const srv of input.services) {
        let therapistNameSnapshot: string | null = null;
        if (srv.therapistId) {
          const therapist = await tx.clinicUser.findUnique({
            where: { id: srv.therapistId },
            include: { user: { select: { fullName: true } } },
          });
          therapistNameSnapshot = therapist?.user?.fullName || null;
        }

        let totalConsumableCostForService = 0;
        const usedConsumablesToCreate: {
          clinicProductId: string;
          productBatchId: string | null;
          quantity: number;
          sellingPrice: number | null;
          unitCost: number;
        }[] = [];

        for (const cons of srv.consumables) {
          if (cons.quantity <= 0) continue;

          const availableBatches = await tx.productBatch.findMany({
            where: {
              clinicProductId: cons.clinicProductId,
              quantity: { gt: 0 },
              clinicProduct: { clinicId: ctx.clinicId },
            },
            orderBy: [
              { expirationDate: "asc" },
              { createdAt: "asc" },
            ],
          });

          const sortedBatches = [...availableBatches].sort((a, b) => {
            if (cons.preferredBatchId) {
              if (a.id === cons.preferredBatchId) return -1;
              if (b.id === cons.preferredBatchId) return 1;
            }
            const aExact =
              a.exclusiveSubServiceId === srv.subServiceId &&
              a.exclusiveTherapistId === srv.therapistId;
            const bExact =
              b.exclusiveSubServiceId === srv.subServiceId &&
              b.exclusiveTherapistId === srv.therapistId;
            if (aExact !== bExact) return aExact ? -1 : 1;

            const aPartial =
              a.exclusiveSubServiceId === srv.subServiceId ||
              a.exclusiveTherapistId === srv.therapistId;
            const bPartial =
              b.exclusiveSubServiceId === srv.subServiceId ||
              b.exclusiveTherapistId === srv.therapistId;
            if (aPartial !== bPartial) return aPartial ? -1 : 1;

            return 0;
          });

          let remainingToDeduct = cons.quantity;

          for (const batch of sortedBatches) {
            if (remainingToDeduct <= 0) break;

            const deductFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
            await tx.productBatch.update({
              where: { id: batch.id },
              data: { quantity: { decrement: deductFromThisBatch } },
            });

            totalConsumableCostForService += Math.round(
              deductFromThisBatch * batch.purchasePrice
            );

            usedConsumablesToCreate.push({
              clinicProductId: cons.clinicProductId,
              productBatchId: batch.id,
              quantity: deductFromThisBatch,
              sellingPrice: cons.sellingPrice > 0 ? Math.round(cons.sellingPrice) : null,
              unitCost: batch.purchasePrice,
            });

            remainingToDeduct -= deductFromThisBatch;
          }

          if (remainingToDeduct > 0) {
            usedConsumablesToCreate.push({
              clinicProductId: cons.clinicProductId,
              productBatchId: null,
              quantity: remainingToDeduct,
              sellingPrice: cons.sellingPrice > 0 ? Math.round(cons.sellingPrice) : null,
              unitCost: 0,
            });
          }
        }

        const serviceRevenue = Math.max(0, Math.round(srv.finalPrice));
        const clinicNetProfit = Math.max(
          0,
          serviceRevenue - totalConsumableCostForService
        );

        await tx.providedService.create({
          data: {
            invoiceId: invoice.id,
            clientId: client.id,
            subServiceId: srv.subServiceId,
            therapistId: srv.therapistId || null,
            therapistNameSnapshot,
            referrerId:
              srv.referrerType === "STAFF" && srv.referrerId
                ? srv.referrerId
                : null,
            referrerClientId:
              srv.referrerType === "CLIENT" && srv.referrerId
                ? srv.referrerId
                : null,
            createdById: ctx.clinicUserId,
            performedAt: new Date(srv.performedAt),
            finalPrice: serviceRevenue,
            description: srv.description?.trim() || null,
            clinicNetProfit,
            assistants:
              srv.assistantIds.length > 0
                ? { connect: srv.assistantIds.map((id) => ({ id })) }
                : undefined,
            usedConsumables:
              usedConsumablesToCreate.length > 0
                ? { create: usedConsumablesToCreate }
                : undefined,
          },
        });
      }

      // ثبت پرداخت‌ها (شامل کارت‌خوان، نقدی، کارت به کارت، کیف پول و سرویس‌های اعتباری)
      for (const pay of validPayments) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: Math.round(pay.amount),
            paymentMethod: pay.paymentMethod,
            terminalId: pay.paymentMethod === "POS" ? pay.terminalId || null : null,
            creditProvider:
              pay.paymentMethod === "CREDIT"
                ? pay.creditProvider?.trim() || null
                : null,
            trackingCode: pay.trackingCode?.trim() || null,
            status: "COMPLETED",
          },
        });
      }

      if (walletUsedAmount > 0) {
        await tx.client.update({
          where: { id: client.id },
          data: { walletBalance: { decrement: walletUsedAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            clientId: client.id,
            type: "WITHDRAW",
            amount: walletUsedAmount,
            paymentMethod: "INVOICE_PAYMENT",
            description: `پرداخت فاکتور شماره ${nextInvoiceNumber}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      if (remainingAmount > 0 && input.remainingMode === "INSTALLMENT") {
        await tx.invoiceInstallment.createMany({
          data: input.installments.map((ins, idx) => ({
            invoiceId: invoice.id,
            installmentNumber: idx + 1,
            amount: Math.round(ins.amount),
            dueDate: new Date(ins.dueDate),
            isCheck: ins.isCheck,
            checkNumber: ins.checkNumber?.trim() || null,
            status: "PENDING",
          })),
        });
      }

      return invoice;
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}`);
    revalidatePath("/clinic-dashboard/inventory/products");

    return {
      success: true,
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.invoiceNumber,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ثبت سرویس و صدور فاکتور.";
    return { success: false, error: message };
  }
}

// ==========================================
// 4. شارژ یا استرداد کیف پول مراجع
// ==========================================
export async function createWalletTransactionAction(input: {
  clientId: string;
  type: "DEPOSIT" | "REFUND";
  amount: number;
  paymentMethod: string;
  terminalId?: string | null;
  description: string;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "finance.accounting")) {
    return { success: false, error: "شما مجوز ثبت تراکنش مالی ندارید." };
  }

  const amount = Math.round(input.amount);
  if (amount <= 0) {
    return { success: false, error: "مبلغ تراکنش باید بزرگتر از صفر باشد." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: input.clientId, clinicId: ctx.clinicId },
      });
      if (!client) throw new Error("پرونده مراجع یافت نشد.");

      if (input.type === "REFUND" && client.walletBalance < amount) {
        throw new Error("موجودی کیف پول برای استرداد کافی نیست.");
      }

      await tx.client.update({
        where: { id: client.id },
        data: {
          walletBalance:
            input.type === "DEPOSIT"
              ? { increment: amount }
              : { decrement: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          clientId: client.id,
          type: input.type,
          amount,
          paymentMethod: input.paymentMethod,
          terminalId: input.terminalId || null,
          description: input.description.trim(),
          createdById: ctx.clinicUserId,
        },
      });
    });

    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/wallet`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}`);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ثبت تراکنش کیف پول.";
    return { success: false, error: message };
  }
}

// ==========================================
// 5. پرداخت قسط یا تسویه بدهی فاکتور
// ==========================================
export async function settleInvoiceOrInstallmentAction(input: {
  clientId: string;
  invoiceId: string;
  installmentId?: string | null;
  amount: number;
  paymentMethod: "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT";
  terminalId?: string | null;
  creditProvider?: string | null;
  trackingCode?: string | null;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "finance.accounting")) {
    return { success: false, error: "شما مجوز ثبت پرداختی مالی ندارید." };
  }

  const amount = Math.round(input.amount);
  if (amount <= 0) {
    return { success: false, error: "مبلغ پرداختی باید بزرگتر از صفر باشد." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: input.invoiceId,
          clientId: input.clientId,
          clinicId: ctx.clinicId,
        },
        include: { client: true },
      });

      if (!invoice) throw new Error("فاکتور مورد نظر یافت نشد.");

      const currentRemaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      if (amount > currentRemaining) {
        throw new Error("مبلغ پرداختی از مانده بدهی فاکتور بیشتر است.");
      }

      if (input.paymentMethod === "WALLET") {
        if (invoice.client.walletBalance < amount) {
          throw new Error("موجودی کیف پول مراجع کافی نیست.");
        }
        await tx.client.update({
          where: { id: invoice.clientId },
          data: { walletBalance: { decrement: amount } },
        });
        await tx.walletTransaction.create({
          data: {
            clientId: invoice.clientId,
            type: "WITHDRAW",
            amount,
            paymentMethod: "INVOICE_PAYMENT",
            description: `تسویه بدهی/قسط فاکتور #${invoice.invoiceNumber}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paymentMethod: input.paymentMethod,
          terminalId: input.paymentMethod === "POS" ? input.terminalId || null : null,
          creditProvider:
            input.paymentMethod === "CREDIT"
              ? input.creditProvider?.trim() || null
              : null,
          trackingCode: input.trackingCode?.trim() || null,
          status: "COMPLETED",
        },
      });

      if (input.installmentId) {
        await tx.invoiceInstallment.update({
          where: { id: input.installmentId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }

      const newPaidAmount = invoice.paidAmount + amount;
      const newStatus =
        newPaidAmount >= invoice.totalAmount
          ? "PAID"
          : invoice.status === "INSTALLMENT"
          ? "INSTALLMENT"
          : "PARTIAL";

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });
    });

    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/financial-records`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/wallet`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}`);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ثبت پرداخت.";
    return { success: false, error: message };
  }
}

// ==========================================
// 6. ذخیره اطلاعات تکمیلی و ویرایش مشخصات پرونده
// ==========================================
export interface UpdateClientAdditionalInfoInput {
  clientId: string;
  fullName: string;
  phone?: string;
  nationalId?: string;
  gender?: string;
  birthDate?: string | null;
  tag?: string | null;
  additionalInfo: {
    fatherName?: string;
    secondaryPhone?: string;
    maritalStatus?: string;
    marriageDate?: string | null;
    educationLevel?: string;
    fieldOfStudy?: string;
    insurance?: string;
    occupation?: string;
    postalCode?: string;
    address?: string;
  };
}

export async function updateClientAdditionalInfoAction(
  input: UpdateClientAdditionalInfoInput
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.edit")) {
    return { success: false, error: "شما مجوز ویرایش پرونده ندارید." };
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return { success: false, error: "نام و نام خانوادگی الزامی است." };
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, clinicId: ctx.clinicId },
      include: { user: true },
    });

    if (!client) {
      return { success: false, error: "پرونده مراجع یافت نشد." };
    }

    const rawPhone = normalizePersianDigits(input.phone || "").trim();
    const rawNationalId = normalizePersianDigits(input.nationalId || "").trim();

    let updatedPhone = client.user.phone;
    if (rawPhone) {
      if (!isValidIranianMobile(rawPhone)) {
        return { success: false, error: "شماره موبایل واردشده معتبر نیست." };
      }
      updatedPhone = normalizeIranianPhone(rawPhone);
    }

    if (rawNationalId && rawNationalId.length !== 10) {
      return { success: false, error: "کد ملی باید ۱۰ رقم باشد." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: client.userId },
        data: {
          fullName,
          phone: updatedPhone,
          nationalId: rawNationalId || null,
        },
      });

      await tx.client.update({
        where: { id: client.id },
        data: {
          gender: input.gender || null,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          tag: input.tag === "NONE" ? null : input.tag || null,
          additionalInfo: input.additionalInfo,
        },
      });
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/additional-info`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/detail`);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ذخیره اطلاعات تکمیلی.";
    return { success: false, error: message };
  }
}

// ==========================================
// 7. ذخیره پرونده پزشکی مراجع
// ==========================================
export interface UpdateClientMedicalRecordInput {
  clientId: string;
  medicalRecord: {
    conditions: string[]; // لیست بیماری‌های علامت‌خورده
    surgeryCount?: string;
    allergies?: string;
    cosmeticHistory?: string;
    specialDisease?: string;
    medications?: string;
    heightCm?: string;
    weightKg?: string;
    weightGainLastYear?: string;
    weightLossLastYear?: string;
    notes?: string;
  };
}

export async function updateClientMedicalRecordAction(
  input: UpdateClientMedicalRecordInput
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.edit")) {
    return { success: false, error: "شما مجوز ویرایش پرونده پزشکی ندارید." };
  }

  const updated = await prisma.client.updateMany({
    where: { id: input.clientId, clinicId: ctx.clinicId },
    data: {
      medicalRecord: input.medicalRecord,
    },
  });

  if (updated.count === 0) {
    return { success: false, error: "پرونده مراجع یافت نشد." };
  }

  revalidatePath(`/clinic-dashboard/clients/${input.clientId}/medical-file`);
  revalidatePath(`/clinic-dashboard/clients/${input.clientId}/detail`);
  return { success: true };
}

// ==========================================
// 8. افزودن و حذف ضمیمه پرونده
// ==========================================
export async function addClientAttachmentAction(input: {
  clientId: string;
  title: string;
  fileUrl: string;
  fileType?: string;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.edit")) {
    return { success: false, error: "شما مجوز افزودن ضمیمه ندارید." };
  }

  if (!input.title.trim() || !input.fileUrl.trim()) {
    return { success: false, error: "عنوان و فایل ضمیمه الزامی است." };
  }

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, clinicId: ctx.clinicId },
  });
  if (!client) return { success: false, error: "پرونده مراجع یافت نشد." };

  await prisma.clientAttachment.create({
    data: {
      clientId: client.id,
      title: input.title.trim(),
      fileUrl: input.fileUrl.trim(),
      fileType: input.fileType || "OTHER",
      uploadedById: ctx.clinicUserId,
    },
  });

  revalidatePath(`/clinic-dashboard/clients/${input.clientId}/attachments`);
  return { success: true };
}

export async function deleteClientAttachmentAction(
  clientId: string,
  attachmentId: string
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.edit")) {
    return { success: false, error: "شما مجوز حذف ضمیمه ندارید." };
  }

  await prisma.clientAttachment.deleteMany({
    where: {
      id: attachmentId,
      client: { id: clientId, clinicId: ctx.clinicId },
    },
  });

  revalidatePath(`/clinic-dashboard/clients/${clientId}/attachments`);
  return { success: true };
}

// ==========================================
// 9. ارسال پیامک فوری به مراجع و ثبت در SmsLog
// ==========================================
export async function sendClientQuickSmsAction(input: {
  clientId: string;
  title?: string;
  messageBody: string;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "other.messages")) {
    return { success: false, error: "شما مجوز ارسال پیامک ندارید." };
  }

  const body = input.messageBody?.trim();
  if (!body) {
    return { success: false, error: "متن پیامک نمی‌تواند خالی باشد." };
  }

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, clinicId: ctx.clinicId },
    include: {
      user: { select: { phone: true } },
      clinic: { select: { smsBalance: true } },
    },
  });

  if (!client) return { success: false, error: "پرونده مراجع یافت نشد." };
  if (client.user.phone.startsWith("NO_PHONE_")) {
    return { success: false, error: "برای این مراجع شماره موبایل ثبت نشده است." };
  }

  const partsCount = Math.max(1, Math.ceil(body.length / 70));
  if (client.clinic.smsBalance < partsCount) {
    return { success: false, error: "شارژ پنل پیامک کلینیک کافی نیست." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.clinic.update({
      where: { id: ctx.clinicId },
      data: { smsBalance: { decrement: partsCount } },
    });

    await tx.smsLog.create({
      data: {
        clinicId: ctx.clinicId,
        clientId: client.id,
        mobileNumber: client.user.phone,
        title: input.title?.trim() || "پیامک فوری",
        messageBody: body,
        partsCount,
        type: "MANUAL",
        status: "SENT",
      },
    });
  });

  revalidatePath(`/clinic-dashboard/clients/${input.clientId}/messages`);
  return { success: true };
}

// ==========================================
// 10. تابع کمکی بازگرداندن مصرفی‌ها به انبار
// ==========================================
async function restoreConsumablesToInventory(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  consumables: {
    clinicProductId: string;
    productBatchId: string | null;
    quantity: number;
  }[]
) {
  for (const cons of consumables) {
    if (cons.quantity <= 0) continue;

    if (cons.productBatchId) {
      const batchExists = await tx.productBatch.findUnique({
        where: { id: cons.productBatchId },
        select: { id: true },
      });

      if (batchExists) {
        await tx.productBatch.update({
          where: { id: cons.productBatchId },
          data: { quantity: { increment: cons.quantity } },
        });
        continue;
      }
    }

    // اگر بچ قبلی وجود نداشت، به جدیدترین بچ همان کالا اضافه شود
    const fallbackBatch = await tx.productBatch.findFirst({
      where: { clinicProductId: cons.clinicProductId },
      orderBy: { createdAt: "desc" },
    });

    if (fallbackBatch) {
      await tx.productBatch.update({
        where: { id: fallbackBatch.id },
        data: { quantity: { increment: cons.quantity } },
      });
    }
  }
}

// ==========================================
// 11. حذف کامل یک فاکتور به همراه تمام سرویس‌ها و بازگشت انبار/کیف پول
// ==========================================
export async function deleteInvoiceWithServicesAction(
  clientId: string,
  invoiceId: string
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "services.delete")) {
    return { success: false, error: "شما مجوز حذف سرویس و فاکتور را ندارید." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          clientId,
          clinicId: ctx.clinicId,
        },
        include: {
          providedServices: {
            include: { usedConsumables: true },
          },
          payments: true,
        },
      });

      if (!invoice) throw new Error("فاکتور مورد نظر یافت نشد.");

      // ۱. بازگشت تمام مصرفی‌های سرویس‌های این فاکتور به انبار
      for (const srv of invoice.providedServices) {
        await restoreConsumablesToInventory(tx, srv.usedConsumables);
      }

      // ۲. بازگشت مبالغ پرداخت‌شده از کیف پول به حساب مراجع
      const walletPaid = invoice.payments
        .filter((p) => p.paymentMethod === "WALLET")
        .reduce((sum, p) => sum + p.amount, 0);

      if (walletPaid > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: { walletBalance: { increment: walletPaid } },
        });
        await tx.walletTransaction.create({
          data: {
            clientId,
            type: "REFUND",
            amount: walletPaid,
            paymentMethod: "WALLET_REFUND",
            description: `بازگشت وجه بابت حذف فاکتور #${invoice.invoiceNumber ?? ""}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      // ۳. حذف فاکتور (سرویس‌ها، مصرفی‌ها، پرداخت‌ها و اقساط به صورت Cascade حذف می‌شوند)
      await tx.invoice.delete({
        where: { id: invoice.id },
      });
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${clientId}`);
    revalidatePath(`/clinic-dashboard/clients/${clientId}/financial-records`);
    revalidatePath(`/clinic-dashboard/clients/${clientId}/wallet`);
    revalidatePath("/clinic-dashboard/inventory/products");

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در حذف فاکتور و سرویس‌ها.";
    return { success: false, error: message };
  }
}

// ==========================================
// 12. حذف یک سرویس تکی (و به‌روزرسانی فاکتور یا حذف کل فاکتور در صورت تک‌سرویسی بودن)
// ==========================================
export async function deleteSingleProvidedServiceAction(
  clientId: string,
  providedServiceId: string
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "services.delete")) {
    return { success: false, error: "شما مجوز حذف سرویس را ندارید." };
  }

  try {
    const target = await prisma.providedService.findFirst({
      where: {
        id: providedServiceId,
        clientId,
        client: { clinicId: ctx.clinicId },
      },
      include: {
        usedConsumables: true,
        invoice: {
          include: {
            providedServices: {
              include: { usedConsumables: true },
            },
          },
        },
      },
    });

    if (!target) {
      return { success: false, error: "سرویس مورد نظر یافت نشد." };
    }

    // اگر فاکتور فقط همین یک سرویس را دارد، کل فاکتور را حذف کن
    if (target.invoice && target.invoice.providedServices.length <= 1) {
      return deleteInvoiceWithServicesAction(clientId, target.invoice.id);
    }

    await prisma.$transaction(async (tx) => {
      // بازگشت مصرفی‌های همین سرویس به انبار
      await restoreConsumablesToInventory(tx, target.usedConsumables);

      // حذف خود سرویس
      await tx.providedService.delete({
        where: { id: target.id },
      });

      // اگر به فاکتوری متصل است، مبالغ فاکتور را مجدداً محاسبه کن
      if (target.invoice) {
        const remainingServices = target.invoice.providedServices.filter(
          (s) => s.id !== target.id
        );

        let newSubTotal = 0;
        for (const srv of remainingServices) {
          newSubTotal += srv.finalPrice;
          for (const uc of srv.usedConsumables) {
            if (uc.sellingPrice && uc.sellingPrice > 0) {
              newSubTotal += Math.round(uc.quantity * uc.sellingPrice);
            }
          }
        }

        const newTotal = Math.max(
          0,
          newSubTotal -
            target.invoice.discountAmount +
            target.invoice.extraChargeAmount
        );

        const newStatus =
          target.invoice.paidAmount >= newTotal
            ? "PAID"
            : target.invoice.status === "INSTALLMENT"
            ? "INSTALLMENT"
            : target.invoice.paidAmount > 0
            ? "PARTIAL"
            : "UNPAID";

        await tx.invoice.update({
          where: { id: target.invoice.id },
          data: {
            subTotalAmount: newSubTotal,
            totalAmount: newTotal,
            status: newStatus,
          },
        });
      }
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${clientId}`);
    revalidatePath(`/clinic-dashboard/clients/${clientId}/financial-records`);
    revalidatePath("/clinic-dashboard/inventory/products");

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در حذف سرویس.";
    return { success: false, error: message };
  }
}

// ==========================================
// 13. ویرایش سرویس انجام‌شده و به‌روزرسانی مصرفی‌ها و فاکتور
// ==========================================
export interface UpdateProvidedServiceInput {
  clientId: string;
  providedServiceId: string;
  serviceId: string;
  subServiceId: string;
  performedAt: string;
  finalPrice: number;
  therapistId?: string | null;
  assistantIds: string[];
  referrerType: "NONE" | "STAFF" | "CLIENT";
  referrerId?: string | null;
  description?: string;
  consumables: ServiceConsumableItemInput[];
}

export async function updateProvidedServiceAction(
  input: UpdateProvidedServiceInput
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "services.edit")) {
    return { success: false, error: "شما مجوز ویرایش سرویس را ندارید." };
  }

  if (!canAccessServiceCategory(ctx.clinicUser, "services.edit", input.serviceId)) {
    return {
      success: false,
      error: "شما مجوز ویرایش در این دسته‌بندی خدمت را ندارید.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.providedService.findFirst({
        where: {
          id: input.providedServiceId,
          clientId: input.clientId,
          client: { clinicId: ctx.clinicId },
        },
        include: {
          usedConsumables: true,
          assistants: { select: { id: true } },
          invoice: {
            include: {
              providedServices: {
                include: { usedConsumables: true },
              },
            },
          },
        },
      });

      if (!existing) throw new Error("سرویس مورد نظر یافت نشد.");

      // ۱. بازگشت مصرفی‌های قبلی به انبار و حذف رکوردهای قبلی
      await restoreConsumablesToInventory(tx, existing.usedConsumables);
      await tx.usedConsumable.deleteMany({
        where: { providedServiceId: existing.id },
      });

      // ۲. کسر مصرفی‌های جدید از انبار
      let totalConsumableCost = 0;
      const newConsumablesData: {
        clinicProductId: string;
        productBatchId: string | null;
        quantity: number;
        sellingPrice: number | null;
        unitCost: number;
      }[] = [];

      for (const cons of input.consumables) {
        if (cons.quantity <= 0) continue;

        const availableBatches = await tx.productBatch.findMany({
          where: {
            clinicProductId: cons.clinicProductId,
            quantity: { gt: 0 },
            clinicProduct: { clinicId: ctx.clinicId },
          },
          orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
        });

        const sortedBatches = [...availableBatches].sort((a, b) => {
          if (cons.preferredBatchId) {
            if (a.id === cons.preferredBatchId) return -1;
            if (b.id === cons.preferredBatchId) return 1;
          }
          const aExact =
            a.exclusiveSubServiceId === input.subServiceId &&
            a.exclusiveTherapistId === input.therapistId;
          const bExact =
            b.exclusiveSubServiceId === input.subServiceId &&
            b.exclusiveTherapistId === input.therapistId;
          if (aExact !== bExact) return aExact ? -1 : 1;
          return 0;
        });

        let remainingToDeduct = cons.quantity;
        for (const batch of sortedBatches) {
          if (remainingToDeduct <= 0) break;
          const deduct = Math.min(batch.quantity, remainingToDeduct);
          await tx.productBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: deduct } },
          });

          totalConsumableCost += Math.round(deduct * batch.purchasePrice);
          newConsumablesData.push({
            clinicProductId: cons.clinicProductId,
            productBatchId: batch.id,
            quantity: deduct,
            sellingPrice: cons.sellingPrice > 0 ? Math.round(cons.sellingPrice) : null,
            unitCost: batch.purchasePrice,
          });
          remainingToDeduct -= deduct;
        }

        if (remainingToDeduct > 0) {
          newConsumablesData.push({
            clinicProductId: cons.clinicProductId,
            productBatchId: null,
            quantity: remainingToDeduct,
            sellingPrice: cons.sellingPrice > 0 ? Math.round(cons.sellingPrice) : null,
            unitCost: 0,
          });
        }
      }

      // ۳. واکشی نام درمانگر جدید
      let therapistNameSnapshot: string | null = null;
      if (input.therapistId) {
        const therapist = await tx.clinicUser.findUnique({
          where: { id: input.therapistId },
          include: { user: { select: { fullName: true } } },
        });
        therapistNameSnapshot = therapist?.user?.fullName || null;
      }

      const serviceRevenue = Math.max(0, Math.round(input.finalPrice));
      const clinicNetProfit = Math.max(0, serviceRevenue - totalConsumableCost);

      // ۴. به‌روزرسانی خود سرویس
      await tx.providedService.update({
        where: { id: existing.id },
        data: {
          subServiceId: input.subServiceId,
          therapistId: input.therapistId || null,
          therapistNameSnapshot,
          referrerId:
            input.referrerType === "STAFF" && input.referrerId
              ? input.referrerId
              : null,
          referrerClientId:
            input.referrerType === "CLIENT" && input.referrerId
              ? input.referrerId
              : null,
          performedAt: new Date(input.performedAt),
          finalPrice: serviceRevenue,
          description: input.description?.trim() || null,
          clinicNetProfit,
          assistants: {
            set: input.assistantIds.map((id) => ({ id })),
          },
          usedConsumables:
            newConsumablesData.length > 0
              ? { create: newConsumablesData }
              : undefined,
        },
      });

      // ۵. محاسبه مجدد مبالغ فاکتور متصل
      if (existing.invoice) {
        const otherServices = existing.invoice.providedServices.filter(
          (s) => s.id !== existing.id
        );

        let newSubTotal = serviceRevenue;
        for (const nc of newConsumablesData) {
          if (nc.sellingPrice && nc.sellingPrice > 0) {
            newSubTotal += Math.round(nc.quantity * nc.sellingPrice);
          }
        }
        for (const srv of otherServices) {
          newSubTotal += srv.finalPrice;
          for (const uc of srv.usedConsumables) {
            if (uc.sellingPrice && uc.sellingPrice > 0) {
              newSubTotal += Math.round(uc.quantity * uc.sellingPrice);
            }
          }
        }

        const newTotal = Math.max(
          0,
          newSubTotal -
            existing.invoice.discountAmount +
            existing.invoice.extraChargeAmount
        );

        const newStatus =
          existing.invoice.paidAmount >= newTotal
            ? "PAID"
            : existing.invoice.status === "INSTALLMENT"
            ? "INSTALLMENT"
            : existing.invoice.paidAmount > 0
            ? "PARTIAL"
            : "UNPAID";

        await tx.invoice.update({
          where: { id: existing.invoice.id },
          data: {
            subTotalAmount: newSubTotal,
            totalAmount: newTotal,
            status: newStatus,
          },
        });
      }
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/financial-records`);
    revalidatePath("/clinic-dashboard/inventory/products");

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ویرایش سرویس.";
    return { success: false, error: message };
  }
}

// ==========================================
// 14. ویرایش اطلاعات پایه پرونده از لیست پرونده‌ها
// ==========================================
export interface QuickUpdateClientInput {
  clientId: string;
  fullName: string;
  fileNumber?: number | null;
  phone?: string;
  noPhone?: boolean;
  nationalId?: string;
  gender?: "FEMALE" | "MALE";
}

export async function quickUpdateClientAction(input: QuickUpdateClientInput) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.edit")) {
    return { success: false, error: "شما مجوز ویرایش پرونده ندارید." };
  }

  const fullName = input.fullName?.trim();
  if (!fullName) {
    return { success: false, error: "نام و نام خانوادگی الزامی است." };
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, clinicId: ctx.clinicId },
      include: { user: true },
    });

    if (!client) {
      return { success: false, error: "پرونده مورد نظر یافت نشد." };
    }

    // بررسی تکراری نبودن شماره پرونده جدید در کلینیک
    if (input.fileNumber && input.fileNumber !== client.fileNumber) {
      const duplicateFile = await prisma.client.findFirst({
        where: {
          clinicId: ctx.clinicId,
          fileNumber: input.fileNumber,
          id: { not: client.id },
        },
      });
      if (duplicateFile) {
        return {
          success: false,
          error: `شماره پرونده ${input.fileNumber} قبلاً برای مراجع دیگری ثبت شده است.`,
        };
      }
    }

    // مدیریت شماره موبایل
    let updatedPhone = client.user.phone;
    if (input.noPhone) {
      if (!client.user.phone.startsWith("NO_PHONE_")) {
        updatedPhone = `NO_PHONE_${ctx.clinicId.slice(0, 6)}_${Date.now()}`;
      }
    } else if (input.phone?.trim()) {
      const rawPhone = normalizePersianDigits(input.phone).trim();
      if (!isValidIranianMobile(rawPhone)) {
        return { success: false, error: "شماره موبایل واردشده معتبر نیست." };
      }
      const normalized = normalizeIranianPhone(rawPhone);
      if (normalized !== client.user.phone) {
        const phoneInUse = await prisma.user.findUnique({
          where: { phone: normalized },
        });
        if (phoneInUse && phoneInUse.id !== client.userId) {
          return {
            success: false,
            error: "این شماره موبایل قبلاً در سیستم ثبت شده است.",
          };
        }
        updatedPhone = normalized;
      }
    }

    const cleanNationalId =
      normalizePersianDigits(input.nationalId || "").trim() || null;

    if (cleanNationalId && cleanNationalId.length !== 10) {
      return { success: false, error: "کد ملی باید ۱۰ رقم باشد." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: client.userId },
        data: {
          fullName,
          phone: updatedPhone,
          nationalId: cleanNationalId,
        },
      });

      await tx.client.update({
        where: { id: client.id },
        data: {
          fileNumber: input.fileNumber ?? client.fileNumber,
          gender: input.gender || client.gender,
        },
      });
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${client.id}`);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ویرایش پرونده.";
    return { success: false, error: message };
  }
}

// ==========================================
// 15. حذف پرونده مراجع + بازگشت خودکار انبار و حذف فاکتورها
// ==========================================
export async function deleteClientAction(clientId: string) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  if (!hasPermission(ctx.clinicUser, "patients.delete")) {
    return { success: false, error: "شما مجوز حذف پرونده را ندارید." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: clientId, clinicId: ctx.clinicId },
        include: {
          providedServices: {
            include: { usedConsumables: true },
          },
        },
      });

      if (!client) {
        throw new Error("پرونده مورد نظر یافت نشد.");
      }

      // ۱. بازگرداندن تمام کالاهای مصرفی ثبت‌شده در سوابق این مراجع به انبار
      for (const srv of client.providedServices) {
        await restoreConsumablesToInventory(tx, srv.usedConsumables);
      }

      // ۲. حذف فاکتورها و سرویس‌های متصل به این مراجع
      await tx.invoice.deleteMany({
        where: { clientId: client.id, clinicId: ctx.clinicId },
      });

      await tx.providedService.deleteMany({
        where: { clientId: client.id },
      });

      // ۳. حذف رکورد پرونده (ضمیمه‌ها، تراکنش‌های کیف پول و لاگ پیامک به صورت Cascade پاک می‌شوند)
      await tx.client.delete({
        where: { id: client.id },
      });
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath("/clinic-dashboard/inventory/products");
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در حذف پرونده مراجع.";
    return { success: false, error: message };
  }
}