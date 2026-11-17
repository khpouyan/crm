// app/clinic-dashboard/(dashboard)/clients/[id]/invoices/[invoiceId]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentClinicContext } from "@/lib/auth/session";
import { hasPermission, buildServiceScopeFilter } from "@/lib/permissions";
import {
  InvoiceWizardContainer,
  type InitialInvoiceEditData,
} from "@/components/clinic-dashboard/invoice-wizard/invoice-wizard-container";
import type {
  AttributeEntry,
  DraftServiceAccordionBlock,
} from "@/components/clinic-dashboard/invoice-wizard/types";

export const metadata = {
  title: "ویرایش فاکتور و جزئیات سرویس | پنل کلینیک",
};

function parseAttributes(raw: unknown): AttributeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { key?: unknown; value?: unknown } =>
        typeof item === "object" && item !== null
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      value: String(item.value ?? ""),
    }))
    .filter((item) => item.key !== "");
}

export default async function EditClientInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const ctx = await getCurrentClinicContext();
  if (!ctx) redirect("/clinic-dashboard/login");

  const { id, invoiceId } = await params;
  const { step } = await searchParams;
  const requestedStep = step === "3" ? 3 : 1;

  if (requestedStep !== 3 && !hasPermission(ctx.clinicUser, "services.edit")) {
    redirect(`/clinic-dashboard/clients/${id}`);
  }

  const [client, clinic, operator, invoice] = await Promise.all([
    prisma.client.findFirst({
      where: { id, clinicId: ctx.clinicId },
      include: {
        user: {
          select: { fullName: true, phone: true, nationalId: true },
        },
      },
    }),
    prisma.clinic.findUnique({
      where: { id: ctx.clinicId },
      select: { name: true },
    }),
    prisma.clinicUser.findUnique({
      where: { id: ctx.clinicUserId },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        clientId: id,
        clinicId: ctx.clinicId,
      },
      include: {
        providedServices: {
          include: {
            subService: {
              include: { service: { select: { id: true, title: true } } },
            },
            assistants: { select: { id: true } },
            usedConsumables: {
              include: {
                clinicProduct: { select: { name: true, unit: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { createdAt: "asc" },
        },
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    }),
  ]);

  if (!client || !clinic || !invoice) notFound();

  const serviceScopeFilter = buildServiceScopeFilter(ctx.clinicUser);

  const [
    catalogServices,
    products,
    staffMembers,
    clientReferrers,
    terminals,
    creditProviders,
  ] = await Promise.all([
    prisma.service.findMany({
      where: {
        clinicId: ctx.clinicId,
        ...serviceScopeFilter,
      },
      include: {
        defaultServiceProducts: {
          include: {
            clinicProduct: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
        subServices: {
          include: {
            defaultProducts: {
              include: {
                clinicProduct: {
                  select: { id: true, name: true, unit: true },
                },
              },
            },
          },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),

    prisma.clinicProduct.findMany({
      where: { clinicId: ctx.clinicId },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    }),

    prisma.clinicUser.findMany({
      where: {
        clinicId: ctx.clinicId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        user: { select: { fullName: true } },
        assignedServices: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.client.findMany({
      where: {
        clinicId: ctx.clinicId,
        id: { not: client.id },
      },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    prisma.paymentTerminal.findMany({
      where: { clinicId: ctx.clinicId, isActive: true },
      include: {
        bankAccount: { select: { bankName: true } },
      },
    }),

    prisma.clinicCreditProvider.findMany({
      where: { clinicId: ctx.clinicId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // بازسازی آکاردیون‌های خدمت از روی ProvidedServices فاکتور
  const blocksByServiceId = new Map<string, DraftServiceAccordionBlock>();
  for (const ps of invoice.providedServices) {
    const sId = ps.subService.service.id;
    const existingBlock = blocksByServiceId.get(sId);

    const subSelection = {
      subServiceId: ps.subServiceId,
      subServiceTitle: ps.subService.title,
      finalPrice: ps.finalPrice,
      attributes: parseAttributes(ps.attributes),
    };

    const mappedConsumables = ps.usedConsumables.map((uc) => ({
      uid: uc.id,
      clinicProductId: uc.clinicProductId,
      productName: uc.clinicProduct.name,
      unit: uc.clinicProduct.unit,
      preferredBatchId: uc.productBatchId || "AUTO",
      quantity: uc.quantity,
      sellingPrice: uc.sellingPrice || 0,
      isDefault: false,
    }));

    if (existingBlock) {
      existingBlock.allowMultiSubServices = true;
      existingBlock.selectedSubServices.push(subSelection);
      existingBlock.consumables.push(...mappedConsumables);
    } else {
      blocksByServiceId.set(sId, {
        uid: ps.id,
        serviceId: sId,
        allowMultiSubServices: true,
        selectedSubServices: [subSelection],
        expandedSubServiceId: ps.subServiceId,
        consumables: mappedConsumables,
        selectedNewProductId: "NONE",
        selectedBatchForNewProduct: "AUTO",
        description: ps.description || "",
      });
    }
  }

  let resolvedDepositSubId = "NONE";
  if (invoice.depositAmount > 0 && invoice.depositServiceTitle) {
    for (const srv of catalogServices) {
      for (const sub of srv.subServices) {
        if (invoice.depositServiceTitle.includes(sub.title)) {
          resolvedDepositSubId = sub.id;
          break;
        }
      }
    }
  }

  const firstPs = invoice.providedServices[0];
  let refType: "NONE" | "STAFF" | "CLIENT" = "NONE";
  let refId = "NONE";
  if (firstPs?.referrerId) {
    refType = "STAFF";
    refId = firstPs.referrerId;
  } else if (firstPs?.referrerClientId) {
    refType = "CLIENT";
    refId = firstPs.referrerClientId;
  }

  const initialEditData: InitialInvoiceEditData = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    performedAt: (firstPs?.performedAt || invoice.createdAt).toISOString(),
    therapistId: firstPs?.therapistId || "NONE",
    assistantId: firstPs?.assistants[0]?.id || "NONE",
    referrerType: refType,
    referrerId: refId,
    discountAmount: invoice.discountAmount,
    discountReason: invoice.discountReason || "",
    extraChargeAmount: invoice.extraChargeAmount,
    extraChargeReason: invoice.extraChargeReason || "",
    depositServiceId: resolvedDepositSubId,
    depositAmount: invoice.depositAmount,
    remainingMode:
      invoice.status === "INSTALLMENT" ? "INSTALLMENT" : "DEBT",
    serviceBlocks: Array.from(blocksByServiceId.values()),
    payments: invoice.payments.map((p) => ({
      uid: p.id,
      paymentMethod: p.paymentMethod as
        | "POS"
        | "CASH"
        | "CARD_TO_CARD"
        | "WALLET"
        | "CREDIT",
      amount:
        p.paymentMethod === "CREDIT" && p.creditPrincipal > 0
          ? p.creditPrincipal
          : p.amount,
      terminalId: p.terminalId || "NONE",
      creditProviderId: p.creditProviderId || "CUSTOM",
      customCreditProvider: p.creditProvider || "",
      trackingCode: p.trackingCode || "",
    })),
    installments: invoice.installments.map((ins) => ({
      uid: ins.id,
      amount: ins.amount,
      dueDate: ins.dueDate,
      isCheck: ins.isCheck,
      checkNumber: ins.checkNumber || "",
    })),
  };

  const walletSpentBefore = invoice.payments
    .filter((p) => p.paymentMethod === "WALLET")
    .reduce((sum, p) => sum + p.amount, 0);
  const editableWalletBalance = Math.max(
    0,
    client.walletBalance + walletSpentBefore - (invoice.depositAmount || 0)
  );

  const isNoPhone = client.user.phone.startsWith("NO_PHONE_");

  return (
    <InvoiceWizardContainer
      clinicName={clinic.name}
      operatorName={operator?.user?.fullName || operator?.jobTitle || "اپراتور"}
      client={{
        id: client.id,
        fullName: client.user.fullName || "مراجعه‌کننده",
        phone: isNoPhone ? null : client.user.phone,
        nationalId: client.user.nationalId,
        gender: client.gender,
        walletBalance: editableWalletBalance,
      }}
      catalogServices={catalogServices.map((s) => ({
        id: s.id,
        title: s.title,
        defaultServiceProducts: s.defaultServiceProducts.map((dp) => ({
          clinicProductId: dp.clinicProductId,
          productName: dp.clinicProduct.name,
          unit: dp.clinicProduct.unit,
          quantity: dp.quantity,
        })),
        subServices: s.subServices.map((sub) => ({
          id: sub.id,
          title: sub.title,
          price: sub.price,
          attributes: parseAttributes(sub.attributes),
          defaultProducts: sub.defaultProducts.map((dp) => ({
            clinicProductId: dp.clinicProductId,
            productName: dp.clinicProduct.name,
            unit: dp.clinicProduct.unit,
            quantity: dp.quantity,
          })),
        })),
      }))}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        totalStock: p.batches.reduce((sum, b) => sum + b.quantity, 0),
        batches: p.batches.map((b) => ({
          id: b.id,
          quantity: b.quantity,
          purchasePrice: b.purchasePrice,
          sellingPrice: b.sellingPrice,
          expirationDate: b.expirationDate
            ? b.expirationDate.toISOString()
            : null,
          exclusiveSubServiceId: b.exclusiveSubServiceId,
          exclusiveTherapistId: b.exclusiveTherapistId,
        })),
      }))}
      therapists={staffMembers
        .filter((s) => s.canBeTherapist)
        .map((s) => ({
          id: s.id,
          label: s.user.fullName || s.jobTitle,
          hasAllServicesAccess: s.isOwner || s.hasAllServicesAccess,
          assignedServiceIds: s.assignedServices.map((as) => as.id),
        }))}
      assistants={staffMembers
        .filter((s) => s.canBeAssistant)
        .map((s) => ({
          value: s.id,
          label: s.user.fullName || s.jobTitle,
        }))}
      staffReferrers={staffMembers
        .filter((s) => s.canBeReferrer)
        .map((s) => ({
          value: s.id,
          label: s.user.fullName || s.jobTitle,
        }))}
      clientReferrers={clientReferrers.map((c) => ({
        value: c.id,
        label: `${c.user.fullName || "بدون نام"}${
          c.fileNumber ? ` (پرونده ${c.fileNumber})` : ""
        }`,
      }))}
      terminals={terminals.map((t) => ({
        value: t.id,
        label: `${t.name} (${t.bankAccount.bankName})`,
      }))}
      creditProviders={creditProviders.map((cp) => ({
        id: cp.id,
        title: cp.title,
        commissionPercent: cp.commissionPercent,
        clientFeePercent: cp.clientFeePercent,
      }))}
      canApplyDiscount={
        ctx.clinicUser.isOwner ||
        hasPermission(ctx.clinicUser, "other.discounts")
      }
      initialEditData={initialEditData}
      initialStep={requestedStep}
    />
  );
}