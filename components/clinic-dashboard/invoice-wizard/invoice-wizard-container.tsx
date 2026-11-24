// components/clinic-dashboard/invoice-wizard/invoice-wizard-container.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { calculateInvoiceFinancials } from "@/lib/finance/invoice-calculator";
import { saveMultiServiceInvoiceAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";
import { CircularStepper } from "./circular-stepper";
import { Step1Services, createEmptyServiceBlock } from "./step1-services";
import { Step2Payments } from "./step2-payments";
import { Step3PrintReceipt } from "./step3-print-receipt";
import type {
  DraftInstallmentRow,
  DraftPaymentRow,
  DraftServiceAccordionBlock,
  SelectOption,
  WizardCatalogService,
  WizardCreditProvider,
  WizardProduct,
  WizardTherapistOption,
} from "./types";

export interface InitialInvoiceEditData {
  invoiceId: string;
  invoiceNumber: number | null;
  performedAt: string;
  paidAt?: string;
  therapistId: string;
  assistantId: string;
  referrerType: "NONE" | "STAFF" | "CLIENT";
  referrerId: string;
  discountAmount: number;
  discountReason: string;
  extraChargeAmount: number;
  extraChargeReason: string;
  applyTax?: boolean;
  depositServiceId: string;
  depositAmount: number;
  remainingMode: "DEBT" | "INSTALLMENT";
  serviceBlocks: DraftServiceAccordionBlock[];
  payments: DraftPaymentRow[];
  installments: DraftInstallmentRow[];
}

interface InvoiceWizardContainerProps {
  clinicName: string;
  operatorName: string;
  vatPercent?: number;
  client: {
    id: string;
    fullName: string;
    phone: string | null;
    nationalId: string | null;
    gender: string | null;
    walletBalance: number;
  };
  catalogServices: WizardCatalogService[];
  products: WizardProduct[];
  therapists: WizardTherapistOption[];
  assistants: SelectOption[];
  staffReferrers: SelectOption[];
  clientReferrers: SelectOption[];
  terminals: SelectOption[];
  creditProviders: WizardCreditProvider[];
  canApplyDiscount: boolean;
  initialEditData?: InitialInvoiceEditData;
  initialStep?: 1 | 2 | 3;
}

function getCurrentTimeHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

function formatDateToHHMM(isoOrDate: string | Date) {
  const dt = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(dt.getTime())) return getCurrentTimeHHMM();
  return `${String(dt.getHours()).padStart(2, "0")}:${String(
    dt.getMinutes()
  ).padStart(2, "0")}`;
}

export function InvoiceWizardContainer({
  clinicName,
  operatorName,
  vatPercent = 0,
  client,
  catalogServices,
  products,
  therapists,
  assistants,
  staffReferrers,
  clientReferrers,
  terminals,
  creditProviders,
  canApplyDiscount,
  initialEditData,
  initialStep = 1,
}: InvoiceWizardContainerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);

  const [performedDate, setPerformedDate] = useState<Date | null>(() =>
    initialEditData ? new Date(initialEditData.performedAt) : new Date()
  );
  const [performedTime, setPerformedTime] = useState<string>(() => {
    if (initialEditData) {
      return formatDateToHHMM(initialEditData.performedAt);
    }
    return getCurrentTimeHHMM();
  });
  const [therapistId, setTherapistId] = useState<string>(
    initialEditData?.therapistId || "NONE"
  );
  const [assistantId, setAssistantId] = useState<string>(
    initialEditData?.assistantId || "NONE"
  );
  const [referrerType, setReferrerType] = useState<"NONE" | "STAFF" | "CLIENT">(
    initialEditData?.referrerType || "NONE"
  );
  const [referrerId, setReferrerId] = useState<string>(
    initialEditData?.referrerId || "NONE"
  );

  const [serviceBlocks, setServiceBlocks] = useState<
    DraftServiceAccordionBlock[]
  >(() =>
    initialEditData?.serviceBlocks?.length
      ? initialEditData.serviceBlocks
      : [createEmptyServiceBlock()]
  );
  const [openBlockUid, setOpenBlockUid] = useState<string>(
    () => serviceBlocks[0]?.uid || ""
  );

  const initialPaidAtIso = initialEditData?.paidAt || initialEditData?.performedAt;
  const [paymentDate, setPaymentDate] = useState<Date | null>(() =>
    initialPaidAtIso ? new Date(initialPaidAtIso) : new Date()
  );
  const [paymentTime, setPaymentTime] = useState<string>(() =>
    initialPaidAtIso ? formatDateToHHMM(initialPaidAtIso) : getCurrentTimeHHMM()
  );

  const [discountAmount, setDiscountAmount] = useState<number>(
    initialEditData?.discountAmount || 0
  );
  const [discountReason, setDiscountReason] = useState<string>(
    initialEditData?.discountReason || ""
  );
  const [extraChargeAmount, setExtraChargeAmount] = useState<number>(
    initialEditData?.extraChargeAmount || 0
  );
  const [extraChargeReason, setExtraChargeReason] = useState<string>(
    initialEditData?.extraChargeReason || ""
  );
  const [applyTax, setApplyTax] = useState<boolean>(
    Boolean(initialEditData?.applyTax)
  );
  const [depositServiceId, setDepositServiceId] = useState<string>(
    initialEditData?.depositServiceId || "NONE"
  );
  const [depositAmount, setDepositAmount] = useState<number>(
    initialEditData?.depositAmount || 0
  );

  const [payments, setPayments] = useState<DraftPaymentRow[]>(() =>
    initialEditData?.payments?.length
      ? initialEditData.payments
      : [
          {
            uid: crypto.randomUUID(),
            paymentMethod: "POS",
            amount: 0,
            terminalId: terminals[0]?.value || "NONE",
            creditProviderId: creditProviders[0]?.id || "CUSTOM",
            customCreditProvider: "",
            trackingCode: "",
          },
        ]
  );

  const [remainingMode, setRemainingMode] = useState<"DEBT" | "INSTALLMENT">(
    initialEditData?.remainingMode || "DEBT"
  );
  const [installments, setInstallments] = useState<DraftInstallmentRow[]>(
    () => initialEditData?.installments || []
  );

  const [savedInvoiceNumber, setSavedInvoiceNumber] = useState<number | null>(
    initialEditData?.invoiceNumber ?? null
  );

  const calculation = useMemo(() => {
    const flatServices = serviceBlocks.flatMap((block) => {
      const catSrv = catalogServices.find((s) => s.id === block.serviceId);
      return block.selectedSubServices.map((sub, idx) => ({
        finalPrice: sub.finalPrice,
        taxEnabled: Boolean(catSrv?.taxEnabled),
        consumables:
          idx === 0
            ? block.consumables.map((c) => ({
                quantity: c.quantity,
                sellingPrice: c.sellingPrice,
              }))
            : [],
      }));
    });

    return calculateInvoiceFinancials({
      services: flatServices,
      discountAmount,
      extraChargeAmount,
      depositAmount,
      depositServiceSelected:
        Boolean(depositServiceId) && depositServiceId !== "NONE",
      vatPercent,
      applyTax,
      payments: payments.map((p) => ({
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        terminalId: p.terminalId,
        creditProviderId: p.creditProviderId,
      })),
      remainingMode,
      installments: installments.map((ins) => ({ amount: ins.amount })),
      creditProviders,
      clientWalletBalance: client.walletBalance,
      hasActiveTerminals: terminals.length > 0,
    });
  }, [
    serviceBlocks,
    catalogServices,
    discountAmount,
    extraChargeAmount,
    depositAmount,
    depositServiceId,
    vatPercent,
    applyTax,
    payments,
    remainingMode,
    installments,
    creditProviders,
    client.walletBalance,
    terminals.length,
  ]);

  function handleMoveToStep2() {
    if (!initialEditData) {
      setPayments((prev) => {
        if (prev.length === 1 && prev[0].amount === 0) {
          return [{ ...prev[0], amount: calculation.baseTotalBeforeCreditFee }];
        }
        return prev;
      });
    }
    setCurrentStep(2);
  }

  function handleFinalSave() {
    if (calculation.validationError) {
      toast.error(calculation.validationError);
      return;
    }

    const perfDt = performedDate ? new Date(performedDate) : new Date();
    const [pHH, pMM] = (performedTime || "12:00").split(":").map(Number);
    if (!Number.isNaN(pHH)) perfDt.setHours(pHH, Number.isNaN(pMM) ? 0 : pMM, 0, 0);

    const fallbackPaidDate = initialPaidAtIso
      ? new Date(initialPaidAtIso)
      : new Date();
    const payDt = paymentDate ? new Date(paymentDate) : fallbackPaidDate;
    const effectivePaymentTime =
      paymentTime ||
      (initialPaidAtIso ? formatDateToHHMM(initialPaidAtIso) : getCurrentTimeHHMM());
    const [tHH, tMM] = effectivePaymentTime.split(":").map(Number);
    if (!Number.isNaN(tHH)) payDt.setHours(tHH, Number.isNaN(tMM) ? 0 : tMM, 0, 0);

    const serviceItems = serviceBlocks.flatMap((block) =>
      block.selectedSubServices.map((sub, idx) => ({
        serviceId: block.serviceId,
        subServiceId: sub.subServiceId,
        performedAt: perfDt.toISOString(),
        finalPrice: Number(sub.finalPrice) || 0,
        attributes: sub.attributes,
        therapistId: therapistId === "NONE" ? null : therapistId,
        assistantIds: assistantId === "NONE" ? [] : [assistantId],
        referrerType: referrerId === "NONE" ? ("NONE" as const) : referrerType,
        referrerId: referrerId === "NONE" ? null : referrerId,
        description: block.description,
        consumables:
          idx === 0
            ? block.consumables.map((c) => ({
                clinicProductId: c.clinicProductId,
                preferredBatchId:
                  c.preferredBatchId === "AUTO" ? null : c.preferredBatchId,
                quantity: Number(c.quantity) || 0,
                sellingPrice: Number(c.sellingPrice) || 0,
              }))
            : [],
      }))
    );

    const validDeposit = Math.max(0, Number(depositAmount) || 0);
    let depositServiceTitle = "";
    if (validDeposit > 0 && depositServiceId !== "NONE") {
      for (const srv of catalogServices) {
        const sub = srv.subServices.find((s) => s.id === depositServiceId);
        if (sub) {
          depositServiceTitle = `${srv.title} — ${sub.title}`;
          break;
        }
      }
    }

    startTransition(async () => {
      const res = await saveMultiServiceInvoiceAction({
        invoiceId: initialEditData?.invoiceId,
        clientId: client.id,
        services: serviceItems,
        discountAmount: Number(discountAmount) || 0,
        discountReason,
        extraChargeAmount: Number(extraChargeAmount) || 0,
        extraChargeReason,
        applyTax,
        taxAmount: calculation.taxAmount,
        depositAmount: validDeposit,
        depositServiceTitle,
        paidAt: payDt.toISOString(),
        payments: payments
          .filter((p) => p.amount > 0)
          .map((p) => ({
            paymentMethod: p.paymentMethod,
            amount: Number(p.amount),
            terminalId:
              p.paymentMethod === "POS" && p.terminalId !== "NONE"
                ? p.terminalId
                : null,
            creditProviderId:
              p.paymentMethod === "CREDIT" && p.creditProviderId !== "CUSTOM"
                ? p.creditProviderId
                : null,
            creditProvider:
              p.paymentMethod === "CREDIT"
                ? creditProviders.find((c) => c.id === p.creditProviderId)
                    ?.title ||
                  p.customCreditProvider.trim() ||
                  "سرویس اعتباری"
                : null,
            trackingCode: p.trackingCode,
          })),
        remainingMode: calculation.remaining === 0 ? "PAID" : remainingMode,
        installments:
          calculation.remaining > 0 && remainingMode === "INSTALLMENT"
            ? installments.map((ins) => ({
                amount: Number(ins.amount) || 0,
                dueDate: (ins.dueDate || new Date()).toISOString(),
                isCheck: ins.isCheck,
                checkNumber: ins.checkNumber,
              }))
            : [],
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره فاکتور");
        return;
      }

      toast.success(
        initialEditData
          ? "فاکتور و سرویس‌ها با موفقیت به‌روزرسانی شدند."
          : "سرویس ثبت و فاکتور با موفقیت صادر شد."
      );
      setSavedInvoiceNumber(res.invoiceNumber ?? null);
      setCurrentStep(3);
      router.refresh();
    });
  }

  const selectedTherapistName =
    therapistId !== "NONE"
      ? therapists.find((t) => t.id === therapistId)?.label || "—"
      : "—";

  return (
    <div className="flex min-h-full flex-col">
      <CircularStepper
        currentStep={currentStep}
        onExit={() => router.push(`/clinic-dashboard/clients/${client.id}`)}
        onStepClick={(s) => setCurrentStep(s)}
      />

      {currentStep === 1 && (
        <Step1Services
          performedDate={performedDate}
          onPerformedDateChange={setPerformedDate}
          performedTime={performedTime}
          onPerformedTimeChange={setPerformedTime}
          therapistId={therapistId}
          onTherapistIdChange={setTherapistId}
          assistantId={assistantId}
          onAssistantIdChange={setAssistantId}
          referrerType={referrerType}
          onReferrerTypeChange={setReferrerType}
          referrerId={referrerId}
          onReferrerIdChange={setReferrerId}
          therapists={therapists}
          assistants={assistants}
          staffReferrers={staffReferrers}
          clientReferrers={clientReferrers}
          catalogServices={catalogServices}
          products={products}
          serviceBlocks={serviceBlocks}
          onServiceBlocksChange={setServiceBlocks}
          openBlockUid={openBlockUid}
          onOpenBlockUidChange={setOpenBlockUid}
          onNextStep={handleMoveToStep2}
        />
      )}

      {currentStep === 2 && (
        <Step2Payments
          clientWalletBalance={client.walletBalance}
          canApplyDiscount={canApplyDiscount}
          isSubmitting={isPending}
          isEditMode={Boolean(initialEditData)}
          paymentDate={paymentDate}
          onPaymentDateChange={setPaymentDate}
          paymentTime={paymentTime}
          onPaymentTimeChange={setPaymentTime}
          discountAmount={discountAmount}
          onDiscountAmountChange={setDiscountAmount}
          discountReason={discountReason}
          onDiscountReasonChange={setDiscountReason}
          extraChargeAmount={extraChargeAmount}
          onExtraChargeAmountChange={setExtraChargeAmount}
          extraChargeReason={extraChargeReason}
          onExtraChargeReasonChange={setExtraChargeReason}
          vatPercent={vatPercent}
          hasTaxableServices={calculation.hasTaxableServices}
          applyTax={applyTax}
          onApplyTaxChange={setApplyTax}
          depositServiceId={depositServiceId}
          onDepositServiceIdChange={setDepositServiceId}
          depositAmount={depositAmount}
          onDepositAmountChange={setDepositAmount}
          catalogServices={catalogServices}
          payments={payments}
          onPaymentsChange={setPayments}
          terminals={terminals}
          creditProviders={creditProviders}
          remainingMode={remainingMode}
          onRemainingModeChange={setRemainingMode}
          installments={installments}
          onInstallmentsChange={setInstallments}
          calculation={calculation}
          onBackStep={() => setCurrentStep(1)}
          onSubmitInvoice={handleFinalSave}
        />
      )}

      {currentStep === 3 && (
        <Step3PrintReceipt
          clinicName={clinicName}
          operatorName={operatorName}
          invoiceNumber={savedInvoiceNumber}
          client={client}
          performedDate={performedDate}
          performedTime={performedTime}
          paymentDate={paymentDate}
          paymentTime={paymentTime}
          therapistName={selectedTherapistName}
          serviceBlocks={serviceBlocks}
          catalogServices={catalogServices}
          payments={payments}
          terminals={terminals}
          creditProviders={creditProviders}
          installments={installments}
          remainingMode={remainingMode}
          calculation={calculation}
          onFinish={() =>
            router.push(`/clinic-dashboard/clients/${client.id}`)
          }
        />
      )}
    </div>
  );
}
