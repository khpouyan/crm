// app/clinic-dashboard/(dashboard)/clients/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import {
  hasPermission,
  canAccessServiceCategory,
} from "@/lib/permissions";
import { normalizeIranPhone, isValidIranPhone } from "@/lib/iranian-mobile";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { calculateInvoiceFinancials } from "@/lib/finance/invoice-calculator";

export interface CreateClientInput {
  fullName: string;
  nickname?: string | null;
  fileNumber?: number | null;
  gender: "FEMALE" | "MALE";
  phone?: string;
  noPhone?: boolean;
  birthDate?: string | null;
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

  const cleanNickname = input.nickname?.trim() || null;

  let normalizedPhone = "";
  if (input.noPhone) {
    normalizedPhone = `NO_PHONE_${ctx.clinicId.slice(0, 6)}_${Date.now()}`;
  } else {
    const rawPhone = normalizePersianDigits(input.phone || "").trim();
    if (!rawPhone || !isValidIranPhone(rawPhone)) {
      return { success: false, error: "شماره موبایل واردشده معتبر نیست." };
    }
    normalizedPhone = normalizeIranPhone(rawPhone);
  }

  const cleanNationalId = input.noNationalId
    ? null
    : normalizePersianDigits(input.nationalId || "").trim() || null;

  if (!input.noNationalId && (!cleanNationalId || cleanNationalId.length !== 10)) {
    return {
      success: false,
      error: "کد ملی باید ۱۰ رقم باشد یا گزینه فاقد کد ملی را انتخاب کنید.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!input.noPhone && normalizedPhone) {
        const duplicatePhoneClient = await tx.client.findFirst({
          where: {
            clinicId: ctx.clinicId,
            user: { phone: normalizedPhone },
          },
          select: {
            id: true,
            fileNumber: true,
            user: { select: { fullName: true } },
          },
        });
        if (duplicatePhoneClient) {
          throw new Error(
            `این شماره تماس قبلاً در پرونده «${duplicatePhoneClient.user.fullName || "بدون نام"}»${
              duplicatePhoneClient.fileNumber
                ? ` (شماره پرونده ${duplicatePhoneClient.fileNumber})`
                : ""
            } در همین کلینیک ثبت شده است.`
          );
        }
      }

      if (!input.noNationalId && cleanNationalId) {
        const duplicateNationalIdClient = await tx.client.findFirst({
          where: {
            clinicId: ctx.clinicId,
            user: { nationalId: cleanNationalId },
          },
          select: {
            id: true,
            fileNumber: true,
            user: { select: { fullName: true } },
          },
        });
        if (duplicateNationalIdClient) {
          throw new Error(
            `این کد ملی قبلاً در پرونده «${duplicateNationalIdClient.user.fullName || "بدون نام"}»${
              duplicateNationalIdClient.fileNumber
                ? ` (شماره پرونده ${duplicateNationalIdClient.fileNumber})`
                : ""
            } در همین کلینیک ثبت شده است.`
          );
        }
      }

      let targetFileNumber = input.fileNumber;
      if (!targetFileNumber) {
        const lastClient = await tx.client.findFirst({
          where: { clinicId: ctx.clinicId, fileNumber: { not: null } },
          orderBy: { fileNumber: "desc" },
          select: { fileNumber: true },
        });
        targetFileNumber = (lastClient?.fileNumber || 1000) + 1;
      }

      const existingFile = await tx.client.findFirst({
        where: { clinicId: ctx.clinicId, fileNumber: targetFileNumber },
      });
      if (existingFile) {
        throw new Error(`شماره پرونده ${targetFileNumber} قبلاً ثبت شده است.`);
      }

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

      return tx.client.create({
        data: {
          userId: user.id,
          clinicId: ctx.clinicId,
          fileNumber: targetFileNumber,
          nickname: cleanNickname,
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
    });

    revalidatePath("/clinic-dashboard/clients");
    return { success: true, clientId: result.id };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "خطا در ثبت پرونده مراجعه‌کننده.";
    return { success: false, error: message };
  }
}

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

export interface ServiceConsumableItemInput {
  clinicProductId: string;
  preferredBatchId?: string | null;
  quantity: number;
  sellingPrice: number;
}

export interface InvoicePaymentItemInput {
  paymentMethod: "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT";
  amount: number;
  terminalId?: string | null;
  creditProviderId?: string | null;
  creditProvider?: string | null;
  trackingCode?: string | null;
}

export interface InvoiceInstallmentItemInput {
  amount: number;
  dueDate: string;
  isCheck: boolean;
  checkNumber?: string | null;
}

export interface SaveWizardInvoiceInput {
  invoiceId?: string;
  clientId: string;
  services: {
    serviceId: string;
    subServiceId: string;
    performedAt: string;
    finalPrice: number;
    attributes: { key: string; value: string }[];
    therapistId?: string | null;
    assistantIds: string[];
    referrerType: "NONE" | "STAFF" | "CLIENT";
    referrerId?: string | null;
    description?: string;
    consumables: ServiceConsumableItemInput[];
  }[];
  discountAmount: number;
  discountReason?: string;
  extraChargeAmount: number;
  extraChargeReason?: string;
  applyTax?: boolean;
  taxAmount?: number;
  depositAmount: number;
  depositServiceTitle?: string;
  paidAt: string;
  payments: InvoicePaymentItemInput[];
  remainingMode: "PAID" | "DEBT" | "INSTALLMENT";
  installments: InvoiceInstallmentItemInput[];
}

export async function saveMultiServiceInvoiceAction(
  input: SaveWizardInvoiceInput
) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) return { success: false, error: "نشست کاربری معتبر نیست." };

  const requiredPerm = input.invoiceId ? "services.edit" : "services.create";
  if (!hasPermission(ctx.clinicUser, requiredPerm)) {
    return { success: false, error: "مجوز انجام این عملیات را ندارید." };
  }

  for (const srv of input.services) {
    if (!canAccessServiceCategory(ctx.clinicUser, requiredPerm, srv.serviceId)) {
      return {
        success: false,
        error: "شما مجوز ثبت/ویرایش یکی از دسته‌بندی‌های انتخاب‌شده را ندارید.",
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
    const saved = await prisma.$transaction(async (tx) => {
      const [client, clinic] = await Promise.all([
        tx.client.findFirst({
          where: { id: input.clientId, clinicId: ctx.clinicId },
        }),
        tx.clinic.findUnique({
          where: { id: ctx.clinicId },
          select: { vatPercent: true },
        }),
      ]);
      if (!client) throw new Error("پرونده مراجع یافت نشد.");

      const catalogServices = await tx.service.findMany({
        where: {
          clinicId: ctx.clinicId,
          id: { in: Array.from(new Set(input.services.map((s) => s.serviceId))) },
        },
        select: { id: true, taxEnabled: true },
      });
      const taxEnabledMap = new Map(catalogServices.map((s) => [s.id, s.taxEnabled]));

      let effectiveWalletBalance = client.walletBalance;
      let existingInvoiceNumber: number | null = null;
      let existingPaidAt: Date | null = null;

      if (input.invoiceId) {
        const oldInvoice = await tx.invoice.findFirst({
          where: {
            id: input.invoiceId,
            clientId: client.id,
            clinicId: ctx.clinicId,
          },
          include: {
            providedServices: { include: { usedConsumables: true } },
            payments: { orderBy: { createdAt: "asc" } },
          },
        });
        if (!oldInvoice) throw new Error("فاکتور مورد نظر جهت ویرایش یافت نشد.");

        existingInvoiceNumber = oldInvoice.invoiceNumber;
        existingPaidAt =
          oldInvoice.payments[0]?.paidAt ??
          oldInvoice.payments[0]?.createdAt ??
          oldInvoice.createdAt;

        for (const oldSrv of oldInvoice.providedServices) {
          await restoreConsumablesToInventory(tx, oldSrv.usedConsumables);
        }

        const oldWalletSpent = oldInvoice.payments
          .filter((p) => p.paymentMethod === "WALLET")
          .reduce((sum, p) => sum + p.amount, 0);

        const oldDepositCredited = oldInvoice.depositAmount || 0;
        const walletDelta = oldWalletSpent - oldDepositCredited;

        if (walletDelta !== 0) {
          effectiveWalletBalance += walletDelta;
          await tx.client.update({
            where: { id: client.id },
            data: { walletBalance: { increment: walletDelta } },
          });
        }

        await tx.providedService.deleteMany({
          where: { invoiceId: oldInvoice.id },
        });
        await tx.payment.deleteMany({
          where: { invoiceId: oldInvoice.id },
        });
        await tx.invoiceInstallment.deleteMany({
          where: { invoiceId: oldInvoice.id },
        });
      }

      const creditProviders = await tx.clinicCreditProvider.findMany({
        where: { clinicId: ctx.clinicId },
      });
      const activeTerminalsCount = await tx.paymentTerminal.count({
        where: { clinicId: ctx.clinicId, isActive: true },
      });

      const calc = calculateInvoiceFinancials({
        services: input.services.map((s) => ({
          finalPrice: s.finalPrice,
          taxEnabled: Boolean(taxEnabledMap.get(s.serviceId)),
          consumables: s.consumables.map((c) => ({
            quantity: c.quantity,
            sellingPrice: c.sellingPrice,
          })),
        })),
        discountAmount: input.discountAmount,
        extraChargeAmount: input.extraChargeAmount,
        depositAmount: input.depositAmount,
        depositServiceSelected: Boolean(input.depositServiceTitle?.trim()),
        vatPercent: clinic?.vatPercent ?? 0,
        applyTax: Boolean(input.applyTax),
        payments: input.payments,
        remainingMode:
          input.remainingMode === "PAID" ? "DEBT" : input.remainingMode,
        installments: input.installments,
        creditProviders,
        clientWalletBalance: effectiveWalletBalance,
        hasActiveTerminals: activeTerminalsCount > 0,
      });

      if (calc.validationError) {
        throw new Error(calc.validationError);
      }

      const nextInvoiceNumber =
        existingInvoiceNumber ??
        ((
          await tx.invoice.findFirst({
            where: { clinicId: ctx.clinicId, invoiceNumber: { not: null } },
            orderBy: { invoiceNumber: "desc" },
            select: { invoiceNumber: true },
          })
        )?.invoiceNumber || 150000) + 1;

      const invoice = input.invoiceId
        ? await tx.invoice.update({
            where: { id: input.invoiceId },
            data: {
              subTotalAmount: calc.subTotal,
              discountAmount: calc.discountAmount,
              discountReason: input.discountReason?.trim() || null,
              extraChargeAmount: calc.extraChargeAmount,
              extraChargeReason: input.extraChargeReason?.trim() || null,
              taxAmount: calc.taxAmount,
              depositAmount: calc.depositAmount,
              depositServiceTitle:
                calc.depositAmount > 0
                  ? input.depositServiceTitle?.trim() || null
                  : null,
              creditFeeAmount: calc.creditFeeTotal,
              totalAmount: calc.finalTotal,
              paidAmount: calc.paidSum,
              status: calc.status,
            },
          })
        : await tx.invoice.create({
            data: {
              clinicId: ctx.clinicId,
              clientId: client.id,
              invoiceNumber: nextInvoiceNumber,
              subTotalAmount: calc.subTotal,
              discountAmount: calc.discountAmount,
              discountReason: input.discountReason?.trim() || null,
              extraChargeAmount: calc.extraChargeAmount,
              extraChargeReason: input.extraChargeReason?.trim() || null,
              taxAmount: calc.taxAmount,
              depositAmount: calc.depositAmount,
              depositServiceTitle:
                calc.depositAmount > 0
                  ? input.depositServiceTitle?.trim() || null
                  : null,
              creditFeeAmount: calc.creditFeeTotal,
              totalAmount: calc.finalTotal,
              paidAmount: calc.paidSum,
              status: calc.status,
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

        let totalConsumableCost = 0;
        const usedConsumablesData: {
          clinicProductId: string;
          productBatchId: string | null;
          quantity: number;
          sellingPrice: number | null;
          unitCost: number;
        }[] = [];

        for (const cons of srv.consumables) {
          if (cons.quantity <= 0) continue;

          const batches = await tx.productBatch.findMany({
            where: {
              clinicProductId: cons.clinicProductId,
              quantity: { gt: 0 },
              clinicProduct: { clinicId: ctx.clinicId },
            },
            orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
          });

          const sortedBatches = [...batches].sort((a, b) => {
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
            return 0;
          });

          let rem = cons.quantity;
          for (const batch of sortedBatches) {
            if (rem <= 0) break;
            const take = Math.min(batch.quantity, rem);
            await tx.productBatch.update({
              where: { id: batch.id },
              data: { quantity: { decrement: take } },
            });
            totalConsumableCost += Math.round(take * batch.purchasePrice);
            usedConsumablesData.push({
              clinicProductId: cons.clinicProductId,
              productBatchId: batch.id,
              quantity: take,
              sellingPrice:
                cons.sellingPrice > 0 ? Math.round(cons.sellingPrice) : null,
              unitCost: batch.purchasePrice,
            });
            rem -= take;
          }

          if (rem > 0) {
            const latestBatchForCost = await tx.productBatch.findFirst({
              where: {
                clinicProductId: cons.clinicProductId,
                clinicProduct: { clinicId: ctx.clinicId },
              },
              orderBy: { createdAt: "desc" },
              select: { purchasePrice: true },
            });

            const estimatedUnitCost = latestBatchForCost?.purchasePrice ?? 0;
            totalConsumableCost += Math.round(rem * estimatedUnitCost);

            usedConsumablesData.push({
              clinicProductId: cons.clinicProductId,
              productBatchId: null,
              quantity: rem,
              sellingPrice:
                cons.sellingPrice > 0 ? Math.round(cons.sellingPrice) : null,
              unitCost: estimatedUnitCost,
            });
          }
        }

        const rev = Math.max(0, Math.round(srv.finalPrice));
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
            finalPrice: rev,
            attributes: srv.attributes,
            description: srv.description?.trim() || null,
            clinicNetProfit: Math.max(0, rev - totalConsumableCost),
            assistants:
              srv.assistantIds.length > 0
                ? { connect: srv.assistantIds.map((id) => ({ id })) }
                : undefined,
            usedConsumables:
              usedConsumablesData.length > 0
                ? { create: usedConsumablesData }
                : undefined,
          },
        });
      }

      const parsedInputPaidAt = input.paidAt ? new Date(input.paidAt) : null;
      const paidAtDate =
        parsedInputPaidAt && !Number.isNaN(parsedInputPaidAt.getTime())
          ? parsedInputPaidAt
          : existingPaidAt ?? new Date();

      for (let i = 0; i < input.payments.length; i++) {
        const pay = input.payments[i];
        if ((Number(pay.amount) || 0) <= 0) continue;

        const creditInfo = calc.creditBreakdown[i];
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: creditInfo ? creditInfo.totalCharge : Math.round(pay.amount),
            paymentMethod: pay.paymentMethod,
            terminalId:
              pay.paymentMethod === "POS" ? pay.terminalId || null : null,
            creditProviderId:
              pay.paymentMethod === "CREDIT"
                ? pay.creditProviderId || null
                : null,
            creditProvider:
              pay.paymentMethod === "CREDIT"
                ? creditInfo?.providerTitle || pay.creditProvider || null
                : null,
            creditPrincipal: creditInfo?.principal ?? 0,
            creditClientFee: creditInfo?.clientFee ?? 0,
            creditClinicCost: creditInfo?.clinicCost ?? 0,
            trackingCode: pay.trackingCode?.trim() || null,
            status: "COMPLETED",
            paidAt: paidAtDate,
          },
        });
      }

      if (calc.walletUsedTotal > 0) {
        await tx.client.update({
          where: { id: client.id },
          data: { walletBalance: { decrement: calc.walletUsedTotal } },
        });
        await tx.walletTransaction.create({
          data: {
            clientId: client.id,
            type: "WITHDRAW",
            amount: calc.walletUsedTotal,
            paymentMethod: "INVOICE_PAYMENT",
            description: `${input.invoiceId ? "ویرایش پرداخت" : "پرداخت"} فاکتور شماره ${nextInvoiceNumber}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      if (calc.depositAmount > 0) {
        await tx.client.update({
          where: { id: client.id },
          data: { walletBalance: { increment: calc.depositAmount } },
        });
        await tx.walletTransaction.create({
          data: {
            clientId: client.id,
            type: "DEPOSIT",
            amount: calc.depositAmount,
            paymentMethod: "DEPOSIT",
            description: `بیعانه بابت سرویس «${input.depositServiceTitle}» — فاکتور #${nextInvoiceNumber}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      if (calc.remaining > 0 && input.remainingMode === "INSTALLMENT") {
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
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/wallet`);
    revalidatePath(`/clinic-dashboard/clients/${input.clientId}/financial-records`);
    revalidatePath("/clinic-dashboard/inventory/products");

    return {
      success: true,
      invoiceId: saved.id,
      invoiceNumber: saved.invoiceNumber,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در ثبت فاکتور.",
    };
  }
}

export async function deleteFullInvoiceAction(
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
          providedServices: { include: { usedConsumables: true } },
          payments: true,
        },
      });

      if (!invoice) throw new Error("فاکتور مورد نظر یافت نشد.");

      for (const srv of invoice.providedServices) {
        await restoreConsumablesToInventory(tx, srv.usedConsumables);
      }

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
            description: `بازگشت وجه پرداختی بابت حذف فاکتور #${invoice.invoiceNumber ?? ""}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      const depositToRevert = invoice.depositAmount || 0;
      if (depositToRevert > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: { walletBalance: { decrement: depositToRevert } },
        });
        await tx.walletTransaction.create({
          data: {
            clientId,
            type: "WITHDRAW",
            amount: depositToRevert,
            paymentMethod: "INVOICE_CANCEL",
            description: `کسر بیعانه بابت حذف فاکتور #${invoice.invoiceNumber ?? ""}`,
            createdById: ctx.clinicUserId,
          },
        });
      }

      await tx.invoice.delete({
        where: { id: invoice.id },
      });
    });

    revalidatePath("/clinic-dashboard/clients");
    revalidatePath(`/clinic-dashboard/clients/${clientId}`);
    revalidatePath(`/clinic-dashboard/clients/${clientId}/wallet`);
    revalidatePath(`/clinic-dashboard/clients/${clientId}/financial-records`);
    revalidatePath("/clinic-dashboard/inventory/products");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطا در حذف فاکتور.",
    };
  }
}

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
      if (!isValidIranPhone(rawPhone)) {
        return { success: false, error: "شماره موبایل واردشده معتبر نیست." };
      }
      updatedPhone = normalizeIranPhone(rawPhone);
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

export interface UpdateClientMedicalRecordInput {
  clientId: string;
  medicalRecord: {
    conditions: string[];
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

export interface QuickUpdateClientInput {
  clientId: string;
  fullName: string;
  nickname?: string | null;
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

  const cleanNickname = input.nickname?.trim() || null;

  try {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, clinicId: ctx.clinicId },
      include: { user: true },
    });

    if (!client) {
      return { success: false, error: "پرونده مورد نظر یافت نشد." };
    }

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

    let updatedPhone = client.user.phone;
    if (input.noPhone) {
      if (!client.user.phone.startsWith("NO_PHONE_")) {
        updatedPhone = `NO_PHONE_${ctx.clinicId.slice(0, 6)}_${Date.now()}`;
      }
    } else if (input.phone?.trim()) {
      const rawPhone = normalizePersianDigits(input.phone).trim();
      if (!isValidIranPhone(rawPhone)) {
        return { success: false, error: "شماره موبایل واردشده معتبر نیست." };
      }
      const normalized = normalizeIranPhone(rawPhone);
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
          nickname: cleanNickname,
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

      for (const srv of client.providedServices) {
        await restoreConsumablesToInventory(tx, srv.usedConsumables);
      }

      await tx.invoice.deleteMany({
        where: { clientId: client.id, clinicId: ctx.clinicId },
      });

      await tx.providedService.deleteMany({
        where: { clientId: client.id },
      });

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
