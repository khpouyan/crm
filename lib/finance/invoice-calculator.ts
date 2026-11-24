// lib/finance/invoice-calculator.ts

export interface CreditProviderRule {
  id: string;
  title: string;
  commissionPercent: number;
  clientFeePercent: number;
}

export interface CalcServiceLine {
  finalPrice: number;
  taxEnabled?: boolean;
  consumables: {
    quantity: number;
    sellingPrice: number;
  }[];
}

export interface CalcPaymentLine {
  paymentMethod: "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT";
  amount: number; // برای CREDIT: اصل مبلغ فاکتور بدون کارمزد
  terminalId?: string | null;
  creditProviderId?: string | null;
}

export interface CalcInstallmentLine {
  amount: number;
}

export interface InvoiceCalculationInput {
  services: CalcServiceLine[];
  discountAmount: number;
  extraChargeAmount: number;
  depositAmount: number;
  depositServiceSelected: boolean;
  vatPercent?: number;
  applyTax?: boolean;
  payments: CalcPaymentLine[];
  remainingMode: "DEBT" | "INSTALLMENT";
  installments: CalcInstallmentLine[];
  creditProviders: CreditProviderRule[];
  clientWalletBalance: number;
  hasActiveTerminals: boolean;
}

export interface ResolvedCreditLine {
  principal: number;
  clientFee: number;
  totalCharge: number;
  clinicCost: number;
  providerTitle: string;
}

export interface InvoiceCalculationResult {
  servicesSum: number;
  consumablesSellSum: number;
  subTotal: number;
  discountAmount: number;
  extraChargeAmount: number;
  depositAmount: number;
  taxPercent: number;
  hasTaxableServices: boolean;
  taxAmount: number;
  baseTotalBeforeCreditFee: number;
  creditFeeTotal: number;
  finalTotal: number;
  paidSum: number;
  walletUsedTotal: number;
  remaining: number;
  excessOverpayment: number;
  installmentsSum: number;
  status: "PAID" | "PARTIAL" | "UNPAID" | "INSTALLMENT";
  validationError: string | null;
  creditBreakdown: Record<number, ResolvedCreditLine>;
}

export function calculateInvoiceFinancials(
  input: InvoiceCalculationInput
): InvoiceCalculationResult {
  let servicesSum = 0;
  let consumablesSellSum = 0;
  let taxableBaseSum = 0;
  let hasTaxableServices = false;

  for (const srv of input.services) {
    const srvPrice = Math.max(0, Math.round(Number(srv.finalPrice) || 0));
    let lineConsSum = 0;
    for (const cons of srv.consumables) {
      const q = Number(cons.quantity) || 0;
      const sp = Number(cons.sellingPrice) || 0;
      if (q > 0 && sp > 0) {
        lineConsSum += Math.round(q * sp);
      }
    }
    servicesSum += srvPrice;
    consumablesSellSum += lineConsSum;

    if (srv.taxEnabled) {
      hasTaxableServices = true;
      taxableBaseSum += srvPrice + lineConsSum;
    }
  }

  const subTotal = servicesSum + consumablesSellSum;
  const discountAmount = Math.max(0, Math.round(Number(input.discountAmount) || 0));
  const extraChargeAmount = Math.max(0, Math.round(Number(input.extraChargeAmount) || 0));
  const depositAmount = Math.max(0, Math.round(Number(input.depositAmount) || 0));

  const vatPercent = Math.max(0, Math.min(100, Number(input.vatPercent) || 0));
  const shouldApplyTax =
    Boolean(input.applyTax) && vatPercent > 0 && taxableBaseSum > 0;

  let taxAmount = 0;
  if (shouldApplyTax) {
    const netItemsBase = Math.max(0, subTotal - discountAmount + extraChargeAmount);
    const ratio = subTotal > 0 ? taxableBaseSum / subTotal : 0;
    const effectiveTaxable = Math.max(0, netItemsBase * ratio);
    taxAmount = Math.round((effectiveTaxable * vatPercent) / 100);
  }

  const baseTotalBeforeCreditFee = Math.max(
    0,
    subTotal - discountAmount + extraChargeAmount + depositAmount + taxAmount
  );

  let creditFeeTotal = 0;
  let paidSum = 0;
  let walletUsedTotal = 0;
  const creditBreakdown: Record<number, ResolvedCreditLine> = {};

  input.payments.forEach((pay, idx) => {
    const rawAmt = Number(pay.amount) || 0;
    if (rawAmt <= 0) return;

    if (pay.paymentMethod === "WALLET") {
      walletUsedTotal += Math.round(rawAmt);
    }

    if (pay.paymentMethod === "CREDIT") {
      const principal = Math.round(rawAmt);
      const cp = input.creditProviders.find((c) => c.id === pay.creditProviderId);
      const clientFeePercent = cp?.clientFeePercent ?? 0;
      const commissionPercent = cp?.commissionPercent ?? 0;

      const clientFee = Math.round((principal * clientFeePercent) / 100);
      const totalCharge = principal + clientFee;
      const clinicCost = Math.round((totalCharge * commissionPercent) / 100);

      creditFeeTotal += clientFee;
      paidSum += totalCharge;

      creditBreakdown[idx] = {
        principal,
        clientFee,
        totalCharge,
        clinicCost,
        providerTitle: cp?.title || "سرویس اعتباری",
      };
    } else {
      paidSum += Math.round(rawAmt);
    }
  });

  const finalTotal = baseTotalBeforeCreditFee + creditFeeTotal;
  const remaining = Math.max(0, finalTotal - paidSum);
  const excessOverpayment = Math.max(0, paidSum - finalTotal);

  const installmentsSum =
    remaining > 0 && input.remainingMode === "INSTALLMENT"
      ? input.installments.reduce(
          (sum, ins) => sum + Math.max(0, Math.round(Number(ins.amount) || 0)),
          0
        )
      : 0;

  let status: InvoiceCalculationResult["status"] = "PAID";
  if (remaining > 0) {
    if (input.remainingMode === "INSTALLMENT") {
      status = "INSTALLMENT";
    } else if (paidSum > 0) {
      status = "PARTIAL";
    } else {
      status = "UNPAID";
    }
  }

  let validationError: string | null = null;

  if (input.services.length === 0) {
    validationError = "حداقل یک زیرسرویس باید انتخاب شود.";
  } else if (excessOverpayment > 0) {
    validationError = `مجموع مبالغ پرداختی (${paidSum.toLocaleString("fa-IR")} تومان) به میزان ${excessOverpayment.toLocaleString("fa-IR")} تومان از مبلغ کل فاکتور (${finalTotal.toLocaleString("fa-IR")} تومان) بیشتر است. لطفاً مبالغ پرداختی را اصلاح کنید.`;
  } else if (walletUsedTotal > input.clientWalletBalance) {
    validationError = `مبلغ برداشتی از کیف پول (${walletUsedTotal.toLocaleString("fa-IR")} تومان) از موجودی کیف پول مراجع (${input.clientWalletBalance.toLocaleString("fa-IR")} تومان) بیشتر است.`;
  } else if (depositAmount > 0 && !input.depositServiceSelected) {
    validationError = "برای ثبت مبلغ بیعانه، انتخاب سرویس مربوطه الزامی است.";
  } else {
    for (let i = 0; i < input.payments.length; i++) {
      const p = input.payments[i];
      if ((Number(p.amount) || 0) < 0) {
        validationError = `مبلغ ردیف پرداخت شماره ${(i + 1).toLocaleString("fa-IR")} نمی‌تواند منفی باشد.`;
        break;
      }
      if (
        (Number(p.amount) || 0) > 0 &&
        p.paymentMethod === "POS" &&
        input.hasActiveTerminals &&
        (!p.terminalId || p.terminalId === "NONE")
      ) {
        validationError = `لطفاً دستگاه کارت‌خوان ردیف پرداخت شماره ${(i + 1).toLocaleString("fa-IR")} را انتخاب کنید.`;
        break;
      }
    }
  }

  if (!validationError && remaining > 0 && input.remainingMode === "INSTALLMENT") {
    if (input.installments.length === 0) {
      validationError = "لطفاً حداقل یک قسط تعریف کنید.";
    } else if (installmentsSum !== remaining) {
      validationError = `مجموع اقساط (${installmentsSum.toLocaleString("fa-IR")} تومان) با مانده حساب (${remaining.toLocaleString("fa-IR")} تومان) برابر نیست.`;
    }
  }

  return {
    servicesSum,
    consumablesSellSum,
    subTotal,
    discountAmount,
    extraChargeAmount,
    depositAmount,
    taxPercent: vatPercent,
    hasTaxableServices,
    taxAmount,
    baseTotalBeforeCreditFee,
    creditFeeTotal,
    finalTotal,
    paidSum,
    walletUsedTotal,
    remaining,
    excessOverpayment,
    installmentsSum,
    status,
    validationError,
    creditBreakdown,
  };
}
