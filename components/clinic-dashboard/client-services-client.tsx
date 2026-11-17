// components/clinic-dashboard/client-services-client.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  LayoutGrid,
  List,
  Trash2,
  PackagePlus,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Wallet,
  Calendar as CalendarIcon,
  UserCheck,
  Sparkles,
  Receipt,
  AlertTriangle,
  MoreVertical,
  Pencil,
  FileX2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { PriceInput } from "@/components/ui/price-input";
import { TomanIcon } from "@/components/ui/toman-icon";
import { formatJalali } from "@/lib/jalali";
import {
  createMultiServiceInvoiceAction,
  updateProvidedServiceAction,
  deleteSingleProvidedServiceAction,
  deleteInvoiceWithServicesAction,
  type ServiceCartItemInput,
  type InvoicePaymentItemInput,
  type InvoiceInstallmentItemInput,
} from "@/app/clinic-dashboard/(dashboard)/clients/actions";

interface ProvidedServiceItem {
  id: string;
  serviceId: string;
  subServiceId: string;
  serviceTitle: string;
  subServiceTitle: string;
  performedAt: string;
  finalPrice: number;
  description: string | null;
  therapistId: string | null;
  therapistName: string;
  assistantIds: string[];
  assistantNames: string[];
  referrerStaffId: string | null;
  referrerClientId: string | null;
  referrerName: string | null;
  invoice: {
    id: string;
    invoiceNumber: number | null;
    totalAmount: number;
    paidAmount: number;
    status: string;
  } | null;
  usedConsumables: {
    id: string;
    clinicProductId: string;
    productBatchId: string | null;
    productName: string;
    unit: string;
    quantity: number;
    sellingPrice: number | null;
  }[];
}

interface CatalogService {
  id: string;
  title: string;
  subServices: {
    id: string;
    title: string;
    price: number;
    defaultProducts: {
      clinicProductId: string;
      productName: string;
      unit: string;
      quantity: number;
    }[];
  }[];
}

interface InventoryProductItem {
  id: string;
  name: string;
  unit: string;
  totalStock: number;
  batches: {
    id: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number | null;
    expirationDate: string | null;
    exclusiveSubServiceId: string | null;
    exclusiveTherapistId: string | null;
  }[];
}

interface SelectOption {
  value: string;
  label: string;
}

interface ClientServicesClientProps {
  client: {
    id: string;
    fullName: string;
    walletBalance: number;
  };
  providedServices: ProvidedServiceItem[];
  catalogServices: CatalogService[];
  products: InventoryProductItem[];
  therapists: SelectOption[];
  assistants: SelectOption[];
  staffReferrers: SelectOption[];
  clientReferrers: SelectOption[];
  terminals: SelectOption[];
  canCreateService: boolean;
  canEditService: boolean;
  canDeleteService: boolean;
  canApplyDiscount: boolean;
}

interface DraftConsumable {
  uid: string;
  clinicProductId: string;
  productName: string;
  unit: string;
  preferredBatchId: string;
  quantity: number;
  sellingPrice: number;
  isDefault: boolean;
}

interface DraftServiceCard {
  uid: string;
  serviceId: string;
  subServiceId: string;
  performedDate: Date | null;
  performedTime: string;
  finalPrice: number;
  therapistId: string;
  assistantId: string;
  referrerType: "NONE" | "STAFF" | "CLIENT";
  referrerId: string;
  description: string;
  consumables: DraftConsumable[];
  selectedNewProductId: string;
}

interface DraftPaymentRow {
  uid: string;
  paymentMethod: "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT";
  amount: number;
  terminalId: string;
  creditProvider: string;
  customCreditProvider: string;
  trackingCode: string;
}

interface DraftInstallmentRow {
  uid: string;
  amount: number;
  dueDate: Date | null;
  isCheck: boolean;
  checkNumber: string;
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "POS", label: "کارت‌خوان (POS)" },
  { value: "CREDIT", label: "سرویس اعتباری (اسنپ‌پی، دیجی‌پی و...)" },
  { value: "CASH", label: "نقدی" },
  { value: "CARD_TO_CARD", label: "کارت به کارت" },
  { value: "WALLET", label: "کسر از کیف پول" },
];

const CREDIT_PROVIDER_OPTIONS: SelectOption[] = [
  { value: "SNAPP_PAY", label: "اسنپ‌پی (Snapp! Pay)" },
  { value: "DIGIPAY", label: "دیجی‌پی (DigiPay)" },
  { value: "TARA", label: "تارا (Tara)" },
  { value: "AZKIVAM", label: "ازکی‌وام (AzkiVam)" },
  { value: "EVAM", label: "ای‌وام (eVam)" },
  { value: "BAJET", label: "باجت (تجارت)" },
  { value: "TOROB_PAY", label: "ترب‌پی (TorobPay)" },
  { value: "OTHER", label: "سایر (ورود نام سرویس)" },
];

function createEmptyServiceCard(): DraftServiceCard {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return {
    uid: crypto.randomUUID(),
    serviceId: "NONE",
    subServiceId: "NONE",
    performedDate: now,
    performedTime: `${hh}:${mm}`,
    finalPrice: 0,
    therapistId: "NONE",
    assistantId: "NONE",
    referrerType: "NONE",
    referrerId: "NONE",
    description: "",
    consumables: [],
    selectedNewProductId: "NONE",
  };
}

export function ClientServicesClient({
  client,
  providedServices,
  catalogServices,
  products,
  therapists,
  assistants,
  staffReferrers,
  clientReferrers,
  terminals,
  canCreateService,
  canEditService,
  canDeleteService,
  canApplyDiscount,
}: ClientServicesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<"card" | "timeline">("card");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // ویزارد ایجاد سرویس و فاکتور جدید
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [serviceCards, setServiceCards] = useState<DraftServiceCard[]>(() => [
    createEmptyServiceCard(),
  ]);

  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [extraChargeAmount, setExtraChargeAmount] = useState(0);
  const [extraChargeReason, setExtraChargeReason] = useState("");
  const [payments, setPayments] = useState<DraftPaymentRow[]>([
    {
      uid: "pay-1",
      paymentMethod: "POS",
      amount: 0,
      terminalId: terminals[0]?.value || "NONE",
      creditProvider: "SNAPP_PAY",
      customCreditProvider: "",
      trackingCode: "",
    },
  ]);
  const [remainingMode, setRemainingMode] = useState<"DEBT" | "INSTALLMENT">(
    "DEBT"
  );
  const [installments, setInstallments] = useState<DraftInstallmentRow[]>([]);
  const [createdInvoiceResult, setCreatedInvoiceResult] = useState<{
    invoiceId: string;
    invoiceNumber: number | null;
    totalAmount: number;
    paidAmount: number;
  } | null>(null);

  // مودال ویرایش یک سرویس موجود
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftServiceCard | null>(null);

  const filteredServices = useMemo(() => {
    if (selectedCategoryFilter === "ALL") return providedServices;
    return providedServices.filter(
      (ps) => ps.serviceId === selectedCategoryFilter
    );
  }, [providedServices, selectedCategoryFilter]);

  const categoryFilterItems: SelectOption[] = useMemo(
    () => [
      { value: "ALL", label: "همه بخش‌ها" },
      ...catalogServices.map((s) => ({ value: s.id, label: s.title })),
    ],
    [catalogServices]
  );

  const serviceSelectItems: SelectOption[] = useMemo(
    () => [
      { value: "NONE", label: "انتخاب خدمت اصلی..." },
      ...catalogServices.map((s) => ({ value: s.id, label: s.title })),
    ],
    [catalogServices]
  );

  const productSelectItems: SelectOption[] = useMemo(
    () => [
      { value: "NONE", label: "انتخاب کالا از انبار..." },
      ...products.map((p) => ({
        value: p.id,
        label: `${p.name} (موجودی: ${p.totalStock.toLocaleString("fa-IR")} ${p.unit})`,
      })),
    ],
    [products]
  );

  const financialSummary = useMemo(() => {
    const servicesSum = serviceCards.reduce(
      (sum, c) => sum + (Number(c.finalPrice) || 0),
      0
    );
    const consumablesSellSum = serviceCards.reduce(
      (sum, c) =>
        sum +
        c.consumables.reduce(
          (cSum, item) =>
            cSum + (Number(item.quantity) || 0) * (Number(item.sellingPrice) || 0),
          0
        ),
      0
    );
    const subTotal = servicesSum + consumablesSellSum;
    const finalTotal = Math.max(
      0,
      subTotal - (Number(discountAmount) || 0) + (Number(extraChargeAmount) || 0)
    );
    const paidSum = payments.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    const remaining = Math.max(0, finalTotal - paidSum);

    return {
      servicesSum,
      consumablesSellSum,
      subTotal,
      finalTotal,
      paidSum,
      remaining,
    };
  }, [serviceCards, discountAmount, extraChargeAmount, payments]);

  function openNewWizard() {
    setWizardStep(1);
    setServiceCards([createEmptyServiceCard()]);
    setDiscountAmount(0);
    setDiscountReason("");
    setExtraChargeAmount(0);
    setExtraChargeReason("");
    setPayments([
      {
        uid: crypto.randomUUID(),
        paymentMethod: "POS",
        amount: 0,
        terminalId: terminals[0]?.value || "NONE",
        creditProvider: "SNAPP_PAY",
        customCreditProvider: "",
        trackingCode: "",
      },
    ]);
    setRemainingMode("DEBT");
    setInstallments([]);
    setCreatedInvoiceResult(null);
    setIsWizardOpen(true);
  }

  function updateCard(uid: string, updater: (prev: DraftServiceCard) => DraftServiceCard) {
    setServiceCards((prev) =>
      prev.map((card) => (card.uid === uid ? updater(card) : card))
    );
  }

  function handleSubServiceSelect(cardUid: string, serviceId: string, subServiceId: string) {
    const service = catalogServices.find((s) => s.id === serviceId);
    const sub = service?.subServices.find((ss) => ss.id === subServiceId);

    if (!sub) {
      updateCard(cardUid, (c) => ({
        ...c,
        subServiceId: "NONE",
        finalPrice: 0,
        consumables: [],
      }));
      return;
    }

    const defaultConsumables: DraftConsumable[] = sub.defaultProducts.map((dp) => {
      const prod = products.find((p) => p.id === dp.clinicProductId);
      const firstBatch = prod?.batches[0];
      return {
        uid: crypto.randomUUID(),
        clinicProductId: dp.clinicProductId,
        productName: dp.productName,
        unit: dp.unit,
        preferredBatchId: "AUTO",
        quantity: dp.quantity,
        sellingPrice: firstBatch?.sellingPrice || 0,
        isDefault: true,
      };
    });

    updateCard(cardUid, (c) => ({
      ...c,
      subServiceId: sub.id,
      finalPrice: sub.price,
      consumables: defaultConsumables,
    }));
  }

  function handleAddConsumableToCard(cardUid: string, productId: string) {
    if (!productId || productId === "NONE") return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const firstBatch = prod.batches[0];
    updateCard(cardUid, (c) => ({
      ...c,
      selectedNewProductId: "NONE",
      consumables: [
        ...c.consumables,
        {
          uid: crypto.randomUUID(),
          clinicProductId: prod.id,
          productName: prod.name,
          unit: prod.unit,
          preferredBatchId: "AUTO",
          quantity: 1,
          sellingPrice: firstBatch?.sellingPrice || 0,
          isDefault: false,
        },
      ],
    }));
  }

  function handleGoToStep2() {
    for (let i = 0; i < serviceCards.length; i++) {
      const card = serviceCards[i];
      if (card.serviceId === "NONE" || card.subServiceId === "NONE") {
        toast.error(`لطفاً خدمت و زیرسرویس کارت شماره ${i + 1} را انتخاب کنید.`);
        return;
      }
      if (!card.performedDate) {
        toast.error(`لطفاً تاریخ انجام سرویس کارت شماره ${i + 1} را مشخص کنید.`);
        return;
      }
    }

    setPayments((prev) => {
      if (prev.length === 1 && prev[0].amount === 0) {
        return [{ ...prev[0], amount: financialSummary.finalTotal }];
      }
      return prev;
    });

    setWizardStep(2);
  }

  function handleSplitInstallmentsEqually(count: number) {
    const safeCount = Math.max(1, Math.min(24, count));
    const rem = financialSummary.remaining;
    if (rem <= 0) {
      setInstallments([]);
      return;
    }
    const baseAmount = Math.floor(rem / safeCount);
    const remainder = rem - baseAmount * safeCount;

    const rows: DraftInstallmentRow[] = Array.from({ length: safeCount }).map(
      (_, idx) => {
        const due = new Date();
        due.setMonth(due.getMonth() + idx + 1);
        return {
          uid: crypto.randomUUID(),
          amount: idx === 0 ? baseAmount + remainder : baseAmount,
          dueDate: due,
          isCheck: false,
          checkNumber: "",
        };
      }
    );
    setInstallments(rows);
  }

  function handleFinalSubmit() {
    if (financialSummary.paidSum > financialSummary.finalTotal) {
      toast.error("مجموع مبالغ پرداختی از مبلغ کل فاکتور بیشتر است.");
      return;
    }

    const mappedServices: ServiceCartItemInput[] = serviceCards.map((card) => {
      const dateObj = card.performedDate ? new Date(card.performedDate) : new Date();
      const [hh, mm] = (card.performedTime || "12:00").split(":").map(Number);
      if (!Number.isNaN(hh)) dateObj.setHours(hh, Number.isNaN(mm) ? 0 : mm, 0, 0);

      return {
        serviceId: card.serviceId,
        subServiceId: card.subServiceId,
        performedAt: dateObj.toISOString(),
        finalPrice: Number(card.finalPrice) || 0,
        therapistId: card.therapistId === "NONE" ? null : card.therapistId,
        assistantIds: card.assistantId === "NONE" ? [] : [card.assistantId],
        referrerType: card.referrerId === "NONE" ? "NONE" : card.referrerType,
        referrerId: card.referrerId === "NONE" ? null : card.referrerId,
        description: card.description,
        consumables: card.consumables.map((cons) => ({
          clinicProductId: cons.clinicProductId,
          preferredBatchId:
            cons.preferredBatchId === "AUTO" ? null : cons.preferredBatchId,
          quantity: Number(cons.quantity) || 0,
          sellingPrice: Number(cons.sellingPrice) || 0,
        })),
      };
    });

    const mappedPayments: InvoicePaymentItemInput[] = payments
      .filter((p) => p.amount > 0)
      .map((p) => {
        let resolvedCreditProvider: string | null = null;
        if (p.paymentMethod === "CREDIT") {
          if (p.creditProvider === "OTHER") {
            resolvedCreditProvider =
              p.customCreditProvider.trim() || "سرویس اعتباری";
          } else {
            const found = CREDIT_PROVIDER_OPTIONS.find(
              (opt) => opt.value === p.creditProvider
            );
            resolvedCreditProvider = found?.label || p.creditProvider;
          }
        }

        return {
          paymentMethod: p.paymentMethod,
          amount: Number(p.amount),
          terminalId:
            p.paymentMethod === "POS" && p.terminalId !== "NONE"
              ? p.terminalId
              : null,
          creditProvider: resolvedCreditProvider,
          trackingCode: p.trackingCode,
        };
      });

    const mappedInstallments: InvoiceInstallmentItemInput[] =
      financialSummary.remaining > 0 && remainingMode === "INSTALLMENT"
        ? installments.map((ins) => ({
            amount: Number(ins.amount) || 0,
            dueDate: (ins.dueDate || new Date()).toISOString(),
            isCheck: ins.isCheck,
            checkNumber: ins.checkNumber,
          }))
        : [];

    startTransition(async () => {
      const res = await createMultiServiceInvoiceAction({
        clientId: client.id,
        services: mappedServices,
        discountAmount: Number(discountAmount) || 0,
        discountReason,
        extraChargeAmount: Number(extraChargeAmount) || 0,
        extraChargeReason,
        payments: mappedPayments,
        remainingMode:
          financialSummary.remaining === 0 ? "PAID" : remainingMode,
        installments: mappedInstallments,
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ثبت سرویس و صدور فاکتور");
        return;
      }

      toast.success("سرویس‌ها ثبت و فاکتور با موفقیت صادر شد.");
      setCreatedInvoiceResult({
        invoiceId: res.invoiceId!,
        invoiceNumber: res.invoiceNumber ?? null,
        totalAmount: financialSummary.finalTotal,
        paidAmount: financialSummary.paidSum,
      });
      setWizardStep(3);
      router.refresh();
    });
  }

  // ==========================================
  // عملیات باز کردن مودال ویرایش و ذخیره ویرایش
  // ==========================================
  function openEditServiceModal(srv: ProvidedServiceItem) {
    const dt = new Date(srv.performedAt);
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");

    let refType: "NONE" | "STAFF" | "CLIENT" = "NONE";
    let refId = "NONE";
    if (srv.referrerStaffId) {
      refType = "STAFF";
      refId = srv.referrerStaffId;
    } else if (srv.referrerClientId) {
      refType = "CLIENT";
      refId = srv.referrerClientId;
    }

    setEditingServiceId(srv.id);
    setEditDraft({
      uid: srv.id,
      serviceId: srv.serviceId,
      subServiceId: srv.subServiceId,
      performedDate: dt,
      performedTime: `${hh}:${mm}`,
      finalPrice: srv.finalPrice,
      therapistId: srv.therapistId || "NONE",
      assistantId: srv.assistantIds[0] || "NONE",
      referrerType: refType,
      referrerId: refId,
      description: srv.description || "",
      selectedNewProductId: "NONE",
      consumables: srv.usedConsumables.map((uc) => ({
        uid: uc.id,
        clinicProductId: uc.clinicProductId,
        productName: uc.productName,
        unit: uc.unit,
        preferredBatchId: uc.productBatchId || "AUTO",
        quantity: uc.quantity,
        sellingPrice: uc.sellingPrice || 0,
        isDefault: false,
      })),
    });
  }

  function handleSaveEditedService(e: React.FormEvent) {
    e.preventDefault();
    if (!editingServiceId || !editDraft) return;

    if (editDraft.serviceId === "NONE" || editDraft.subServiceId === "NONE") {
      toast.error("لطفاً خدمت و زیرسرویس را انتخاب کنید.");
      return;
    }

    const dateObj = editDraft.performedDate
      ? new Date(editDraft.performedDate)
      : new Date();
    const [hh, mm] = (editDraft.performedTime || "12:00").split(":").map(Number);
    if (!Number.isNaN(hh)) dateObj.setHours(hh, Number.isNaN(mm) ? 0 : mm, 0, 0);

    startTransition(async () => {
      const res = await updateProvidedServiceAction({
        clientId: client.id,
        providedServiceId: editingServiceId,
        serviceId: editDraft.serviceId,
        subServiceId: editDraft.subServiceId,
        performedAt: dateObj.toISOString(),
        finalPrice: Number(editDraft.finalPrice) || 0,
        therapistId:
          editDraft.therapistId === "NONE" ? null : editDraft.therapistId,
        assistantIds:
          editDraft.assistantId === "NONE" ? [] : [editDraft.assistantId],
        referrerType:
          editDraft.referrerId === "NONE" ? "NONE" : editDraft.referrerType,
        referrerId:
          editDraft.referrerId === "NONE" ? null : editDraft.referrerId,
        description: editDraft.description,
        consumables: editDraft.consumables.map((c) => ({
          clinicProductId: c.clinicProductId,
          preferredBatchId:
            c.preferredBatchId === "AUTO" ? null : c.preferredBatchId,
          quantity: Number(c.quantity) || 0,
          sellingPrice: Number(c.sellingPrice) || 0,
        })),
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ویرایش سرویس");
        return;
      }

      toast.success("سرویس و اطلاعات مالی با موفقیت ویرایش شد.");
      setEditingServiceId(null);
      setEditDraft(null);
      router.refresh();
    });
  }

  function handleDeleteSingleService(srv: ProvidedServiceItem) {
    const confirmed = window.confirm(
      `آیا از حذف سرویس «${srv.serviceTitle} - ${srv.subServiceTitle}» مطمئن هستید؟ موجودی کالاهای مصرفی به انبار بازگردانده می‌شود.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteSingleProvidedServiceAction(client.id, srv.id);
      if (!res.success) {
        toast.error(res.error || "خطا در حذف سرویس");
        return;
      }
      toast.success("سرویس حذف شد و موجودی انبار اصلاح گردید.");
      router.refresh();
    });
  }

  function handleDeleteFullInvoice(invoiceId: string, invoiceNumber: number | null) {
    const confirmed = window.confirm(
      `آیا از حذف کامل فاکتور #${invoiceNumber ?? ""} و تمام سرویس‌های زیرمجموعه آن مطمئن هستید؟ موجودی انبار و پرداختی‌های کیف پول بازگردانده می‌شوند.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const res = await deleteInvoiceWithServicesAction(client.id, invoiceId);
      if (!res.success) {
        toast.error(res.error || "خطا در حذف فاکتور");
        return;
      }
      toast.success("فاکتور و تمام سرویس‌های آن حذف شدند.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      {/* نوار ابزار فیلتر و تغییر نمای سوابق سرویس */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <Select
              value={selectedCategoryFilter}
              items={categoryFilterItems}
              onValueChange={(val) => setSelectedCategoryFilter(val || "ALL")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="فیلتر بخش" />
              </SelectTrigger>
              <SelectContent>
                {categoryFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-xs text-muted-foreground">
            مجموع خدمات ثبت‌شده:{" "}
            <strong className="text-foreground">
              {filteredServices.length.toLocaleString("fa-IR")}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border bg-background p-1">
          <Button
            type="button"
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="size-3.5" />
            کارتی
          </Button>
          <Button
            type="button"
            variant={viewMode === "timeline" ? "default" : "ghost"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setViewMode("timeline")}
          >
            <List className="size-3.5" />
            تایم‌لاین
          </Button>
        </div>
      </div>

      {/* لیست سرویس‌های انجام‌شده */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <Sparkles className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-base font-medium">هنوز سرویسی برای این پرونده ثبت نشده است</p>
          <p className="mt-1 text-xs text-muted-foreground">
            با زدن دکمه + پایین صفحه می‌توانید یک یا چند سرویس را همزمان ثبت و فاکتور صادر کنید.
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "card"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
              : "space-y-4"
          }
        >
          {filteredServices.map((srv) => {
            const isPaid = srv.invoice?.status === "PAID";
            return (
              <div
                key={srv.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {srv.serviceTitle}
                      </h3>
                      <p className="text-xs text-primary">
                        {srv.subServiceTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={
                          isPaid
                            ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20"
                            : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/20"
                        }
                      >
                        {isPaid
                          ? "پرداخت شده"
                          : srv.invoice?.status === "INSTALLMENT"
                          ? "قسطی"
                          : "بدهکار"}
                      </Badge>

                      {(canEditService || canDeleteService) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <MoreVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditService && (
                              <DropdownMenuItem
                                onClick={() => openEditServiceModal(srv)}
                              >
                                <Pencil className="ml-2 size-4" />
                                ویرایش سرویس
                              </DropdownMenuItem>
                            )}

                            {canDeleteService && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteSingleService(srv)}
                                >
                                  <Trash2 className="ml-2 size-4" />
                                  حذف این سرویس
                                </DropdownMenuItem>

                                {srv.invoice && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      handleDeleteFullInvoice(
                                        srv.invoice!.id,
                                        srv.invoice!.invoiceNumber
                                      )
                                    }
                                  >
                                    <FileX2 className="ml-2 size-4" />
                                    حذف کل فاکتور #{srv.invoice.invoiceNumber}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t pt-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">درمانگر:</span>
                      <span className="font-medium">{srv.therapistName}</span>
                    </div>
                    {srv.assistantNames.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">دستیار:</span>
                        <span>{srv.assistantNames.join("، ")}</span>
                      </div>
                    )}
                    {srv.referrerName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">معرف:</span>
                        <span>{srv.referrerName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاریخ انجام:</span>
                      <span>
                        {formatJalali(new Date(srv.performedAt))} -{" "}
                        {new Date(srv.performedAt).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {srv.usedConsumables.length > 0 && (
                      <div className="pt-1">
                        <span className="text-muted-foreground">اقلام مصرفی:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {srv.usedConsumables.map((uc) => (
                            <Badge
                              key={uc.id}
                              variant="outline"
                              className="text-[11px]"
                            >
                              {uc.productName} ({uc.quantity} {uc.unit})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {srv.description && (
                      <p className="rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
                        {srv.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white">
                  <span>
                    {srv.invoice?.invoiceNumber
                      ? `فاکتور #${srv.invoice.invoiceNumber}`
                      : "مبلغ سرویس"}
                  </span>
                  <span className="flex items-center gap-1">
                    {srv.finalPrice.toLocaleString("fa-IR")}
                    <TomanIcon className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* دکمه شناور + پایین سمت چپ برای ثبت سرویس و صدور فاکتور */}
      {canCreateService && (
        <Button
          type="button"
          onClick={openNewWizard}
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
          title="افزودن سرویس و صدور فاکتور"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* ========================================== */}
      {/* مودال ویرایش یک سرویس موجود */}
      {/* ========================================== */}
      <ResponsiveDialog
        open={Boolean(editingServiceId && editDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingServiceId(null);
            setEditDraft(null);
          }
        }}
      >
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>ویرایش سرویس انجام‌شده</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              با ذخیره تغییرات، موجودی انبار و مبلغ فاکتور به صورت خودکار به‌روزرسانی می‌شوند.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {editDraft && (
            <form onSubmit={handleSaveEditedService} className="space-y-4 pt-2">
              {(() => {
                const selectedService = catalogServices.find(
                  (s) => s.id === editDraft.serviceId
                );
                const subServiceOptions: SelectOption[] = [
                  { value: "NONE", label: "انتخاب زیرسرویس..." },
                  ...(selectedService?.subServices.map((ss) => ({
                    value: ss.id,
                    label: `${ss.title} — ${ss.price.toLocaleString("fa-IR")} تومان`,
                  })) || []),
                ];
                const therapistOptions: SelectOption[] = [
                  { value: "NONE", label: "انتخاب درمانگر" },
                  ...therapists,
                ];
                const assistantOptions: SelectOption[] = [
                  { value: "NONE", label: "بدون دستیار" },
                  ...assistants,
                ];
                const referrerOptions: SelectOption[] = [
                  { value: "NONE", label: "بدون معرف" },
                  ...(editDraft.referrerType === "STAFF"
                    ? staffReferrers
                    : editDraft.referrerType === "CLIENT"
                    ? clientReferrers
                    : []),
                ];

                return (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>خدمت اصلی *</Label>
                        <Select
                          value={editDraft.serviceId}
                          items={serviceSelectItems}
                          onValueChange={(val) =>
                            setEditDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    serviceId: val || "NONE",
                                    subServiceId: "NONE",
                                  }
                                : null
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceSelectItems.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>زیرسرویس *</Label>
                        <Select
                          value={editDraft.subServiceId}
                          items={subServiceOptions}
                          onValueChange={(val) => {
                            const sub = selectedService?.subServices.find(
                              (ss) => ss.id === val
                            );
                            setEditDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    subServiceId: val || "NONE",
                                    finalPrice: sub ? sub.price : prev.finalPrice,
                                  }
                                : null
                            );
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subServiceOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>مبلغ سرویس (تومان) *</Label>
                        <PriceInput
                          value={editDraft.finalPrice}
                          onValueChange={(val) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, finalPrice: val || 0 } : null
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>تاریخ مراجعه</Label>
                        <DatePicker
                          calendarType="shamsi"
                          value={editDraft.performedDate}
                          onValueChange={(d) =>
                            setEditDraft((prev) =>
                              prev ? { ...prev, performedDate: d } : null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>ساعت مراجعه</Label>
                        <Input
                          type="time"
                          dir="ltr"
                          value={editDraft.performedTime}
                          onChange={(e) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, performedTime: e.target.value }
                                : null
                            )
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>درمانگر</Label>
                        <Select
                          value={editDraft.therapistId}
                          items={therapistOptions}
                          onValueChange={(val) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, therapistId: val || "NONE" }
                                : null
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {therapistOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>دستیار درمان</Label>
                        <Select
                          value={editDraft.assistantId}
                          items={assistantOptions}
                          onValueChange={(val) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, assistantId: val || "NONE" }
                                : null
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assistantOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* معرف سرویس */}
                    <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">نوع معرف</Label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-background p-1">
                          {[
                            { key: "NONE", label: "بدون معرف" },
                            { key: "STAFF", label: "همکاران" },
                            { key: "CLIENT", label: "مراجعین" },
                          ].map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        referrerType:
                                          t.key as "NONE" | "STAFF" | "CLIENT",
                                        referrerId: "NONE",
                                      }
                                    : null
                                )
                              }
                              className={`rounded-md py-1 text-xs font-medium ${
                                editDraft.referrerType === t.key
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">انتخاب معرف</Label>
                        <Select
                          value={editDraft.referrerId}
                          items={referrerOptions}
                          disabled={editDraft.referrerType === "NONE"}
                          onValueChange={(val) =>
                            setEditDraft((prev) =>
                              prev
                                ? { ...prev, referrerId: val || "NONE" }
                                : null
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {referrerOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* کالاهای مصرفی */}
                    <div className="space-y-3 rounded-xl border bg-muted/25 p-3.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-xs font-bold">
                          کالاهای مصرفی این سرویس
                        </Label>
                        <div className="sm:w-72">
                          <Select
                            value={editDraft.selectedNewProductId}
                            items={productSelectItems}
                            onValueChange={(val) => {
                              if (!val || val === "NONE") return;
                              const prod = products.find((p) => p.id === val);
                              if (!prod) return;
                              setEditDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      selectedNewProductId: "NONE",
                                      consumables: [
                                        ...prev.consumables,
                                        {
                                          uid: crypto.randomUUID(),
                                          clinicProductId: prod.id,
                                          productName: prod.name,
                                          unit: prod.unit,
                                          preferredBatchId: "AUTO",
                                          quantity: 1,
                                          sellingPrice:
                                            prod.batches[0]?.sellingPrice || 0,
                                          isDefault: false,
                                        },
                                      ],
                                    }
                                  : null
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="+ افزودن کالای مصرفی..." />
                            </SelectTrigger>
                            <SelectContent>
                              {productSelectItems.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {editDraft.consumables.map((cons) => (
                        <div
                          key={cons.uid}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-2 text-xs"
                        >
                          <span className="font-medium">{cons.productName}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              className="h-8 w-20 text-center text-xs"
                              value={cons.quantity}
                              onChange={(e) => {
                                const q = parseFloat(e.target.value) || 0;
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        consumables: prev.consumables.map((item) =>
                                          item.uid === cons.uid
                                            ? { ...item, quantity: q }
                                            : item
                                        ),
                                      }
                                    : null
                                );
                              }}
                            />
                            <span>{cons.unit}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() =>
                                setEditDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        consumables: prev.consumables.filter(
                                          (item) => item.uid !== cons.uid
                                        ),
                                      }
                                    : null
                                )
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">توضیحات</Label>
                      <Textarea
                        rows={2}
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((prev) =>
                            prev ? { ...prev, description: e.target.value } : null
                          )
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingServiceId(null);
                          setEditDraft(null);
                        }}
                      >
                        انصراف
                      </Button>
                      <Button type="submit" disabled={isPending}>
                        {isPending ? "در حال ذخیره..." : "ذخیره تغییرات سرویس"}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </form>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ========================================== */}
      {/* ویزارد ۳ مرحله‌ای ثبت همزمان چند سرویس و صدور فاکتور */}
      {/* ========================================== */}
      <ResponsiveDialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <ResponsiveDialogTrigger
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <ResponsiveDialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              ثبت سرویس و صدور فاکتور — {client.fullName}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              می‌توانید همزمان یک یا چند سرویس مختلف را با مصرفی‌های دیفالت یا جدید انتخاب و یک فاکتور واحد صادر کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/50 p-2 text-xs">
            {[
              { step: 1, title: "۱. تعریف سرویس‌ها و مصرفی" },
              { step: 2, title: "۲. پرداختی و اقساط فاکتور" },
              { step: 3, title: "۳. تایید نهایی و رسید" },
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-center justify-center rounded-lg py-2 font-semibold transition-colors ${
                  wizardStep === s.step
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : wizardStep > s.step
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "text-muted-foreground"
                }`}
              >
                {s.title}
              </div>
            ))}
          </div>

          {wizardStep === 1 && (
            <div className="space-y-5 pt-2">
              {serviceCards.map((card, cardIndex) => {
                const selectedService = catalogServices.find(
                  (s) => s.id === card.serviceId
                );
                const subServiceOptions: SelectOption[] = [
                  { value: "NONE", label: "انتخاب زیرسرویس..." },
                  ...(selectedService?.subServices.map((ss) => ({
                    value: ss.id,
                    label: `${ss.title} — ${ss.price.toLocaleString("fa-IR")} تومان`,
                  })) || []),
                ];

                const therapistOptions: SelectOption[] = [
                  { value: "NONE", label: "انتخاب درمانگر" },
                  ...therapists,
                ];

                const assistantOptions: SelectOption[] = [
                  { value: "NONE", label: "بدون دستیار" },
                  ...assistants,
                ];

                const referrerOptions: SelectOption[] = [
                  { value: "NONE", label: "بدون معرف" },
                  ...(card.referrerType === "STAFF"
                    ? staffReferrers
                    : card.referrerType === "CLIENT"
                    ? clientReferrers
                    : []),
                ];

                return (
                  <div
                    key={card.uid}
                    className="space-y-4 rounded-xl border-2 border-primary/20 bg-card p-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">
                          سرویس {cardIndex + 1}
                        </Badge>
                        {selectedService && (
                          <span className="text-sm font-semibold">
                            {selectedService.title}
                          </span>
                        )}
                      </div>

                      {serviceCards.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            setServiceCards((prev) =>
                              prev.filter((c) => c.uid !== card.uid)
                            )
                          }
                        >
                          <Trash2 className="ml-1 size-4" />
                          حذف این سرویس
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>خدمت اصلی *</Label>
                        <Select
                          value={card.serviceId}
                          items={serviceSelectItems}
                          onValueChange={(val) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              serviceId: val || "NONE",
                              subServiceId: "NONE",
                              finalPrice: 0,
                              consumables: [],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceSelectItems.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>زیرسرویس (تعرفه) *</Label>
                        <Select
                          value={card.subServiceId}
                          items={subServiceOptions}
                          disabled={card.serviceId === "NONE"}
                          onValueChange={(val) =>
                            handleSubServiceSelect(
                              card.uid,
                              card.serviceId,
                              val || "NONE"
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subServiceOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>مبلغ سرویس (تومان) *</Label>
                        <PriceInput
                          value={card.finalPrice}
                          onValueChange={(val) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              finalPrice: val || 0,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>تاریخ مراجعه</Label>
                        <DatePicker
                          calendarType="shamsi"
                          value={card.performedDate}
                          onValueChange={(d) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              performedDate: d,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>ساعت مراجعه</Label>
                        <Input
                          type="time"
                          dir="ltr"
                          value={card.performedTime}
                          onChange={(e) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              performedTime: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>درمانگر</Label>
                        <Select
                          value={card.therapistId}
                          items={therapistOptions}
                          onValueChange={(val) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              therapistId: val || "NONE",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {therapistOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>دستیار درمان</Label>
                        <Select
                          value={card.assistantId}
                          items={assistantOptions}
                          onValueChange={(val) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              assistantId: val || "NONE",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assistantOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <UserCheck className="size-3.5 text-primary" />
                          نوع معرف این سرویس
                        </Label>
                        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-background p-1">
                          {[
                            { key: "NONE", label: "بدون معرف" },
                            { key: "STAFF", label: "همکاران" },
                            { key: "CLIENT", label: "مراجعین" },
                          ].map((t) => (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() =>
                                updateCard(card.uid, (c) => ({
                                  ...c,
                                  referrerType: t.key as "NONE" | "STAFF" | "CLIENT",
                                  referrerId: "NONE",
                                }))
                              }
                              className={`rounded-md py-1 text-xs font-medium transition-colors ${
                                card.referrerType === t.key
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">انتخاب معرف</Label>
                        <Select
                          value={card.referrerId}
                          items={referrerOptions}
                          disabled={card.referrerType === "NONE"}
                          onValueChange={(val) =>
                            updateCard(card.uid, (c) => ({
                              ...c,
                              referrerId: val || "NONE",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب معرف..." />
                          </SelectTrigger>
                          <SelectContent>
                            {referrerOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-xl border bg-muted/25 p-3.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="flex items-center gap-1.5 text-xs font-bold">
                          <PackagePlus className="size-4 text-primary" />
                          کالاهای مصرفی این سرویس (کسر خودکار از انبار)
                        </Label>

                        <div className="flex items-center gap-2 sm:w-80">
                          <Select
                            value={card.selectedNewProductId}
                            items={productSelectItems}
                            onValueChange={(val) => {
                              if (val && val !== "NONE") {
                                handleAddConsumableToCard(card.uid, val);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="+ افزودن کالای مصرفی جدید..." />
                            </SelectTrigger>
                            <SelectContent>
                              {productSelectItems.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {card.consumables.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          کالای مصرفی برای این سرویس ثبت نشده است.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {card.consumables.map((cons) => {
                            const prod = products.find(
                              (p) => p.id === cons.clinicProductId
                            );
                            const batchOptions: SelectOption[] = [
                              {
                                value: "AUTO",
                                label: "انتخاب هوشمند (اولویت انقضا / اختصاصی)",
                              },
                              ...(prod?.batches.map((b) => ({
                                value: b.id,
                                label: `موجودی: ${b.quantity} ${cons.unit}${
                                  b.expirationDate
                                    ? ` | انقضا: ${formatJalali(
                                        new Date(b.expirationDate)
                                      )}`
                                    : ""
                                }`,
                              })) || []),
                            ];

                            const isLowStock =
                              (prod?.totalStock ?? 0) < cons.quantity;

                            return (
                              <div
                                key={cons.uid}
                                className="grid grid-cols-1 items-center gap-2 rounded-lg border bg-background p-2.5 text-xs md:grid-cols-12"
                              >
                                <div className="md:col-span-4">
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <span>{cons.productName}</span>
                                    {cons.isDefault && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        دیفالت
                                      </Badge>
                                    )}
                                  </div>
                                  {isLowStock && (
                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                                      <AlertTriangle className="size-3" />
                                      موجودی فعلی انبار:{" "}
                                      {(prod?.totalStock ?? 0).toLocaleString("fa-IR")}{" "}
                                      {cons.unit}
                                    </span>
                                  )}
                                </div>

                                <div className="md:col-span-4">
                                  <Select
                                    value={cons.preferredBatchId}
                                    items={batchOptions}
                                    onValueChange={(val) =>
                                      updateCard(card.uid, (c) => ({
                                        ...c,
                                        consumables: c.consumables.map((item) =>
                                          item.uid === cons.uid
                                            ? {
                                                ...item,
                                                preferredBatchId: val || "AUTO",
                                              }
                                            : item
                                        ),
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-[11px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {batchOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center gap-1.5 md:col-span-2">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    className="h-8 text-center text-xs"
                                    value={cons.quantity}
                                    onChange={(e) => {
                                      const q = parseFloat(e.target.value) || 0;
                                      updateCard(card.uid, (c) => ({
                                        ...c,
                                        consumables: c.consumables.map((item) =>
                                          item.uid === cons.uid
                                            ? { ...item, quantity: q }
                                            : item
                                        ),
                                      }));
                                    }}
                                  />
                                  <span className="shrink-0 text-muted-foreground">
                                    {cons.unit}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-1 md:col-span-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="قیمت فروش"
                                    title="قیمت فروش به مراجع (۰ = مصرف رایگان)"
                                    className="h-8 text-xs"
                                    value={cons.sellingPrice}
                                    onChange={(e) => {
                                      const sp = parseInt(e.target.value, 10) || 0;
                                      updateCard(card.uid, (c) => ({
                                        ...c,
                                        consumables: c.consumables.map((item) =>
                                          item.uid === cons.uid
                                            ? { ...item, sellingPrice: sp }
                                            : item
                                        ),
                                      }));
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 shrink-0 text-destructive"
                                    onClick={() =>
                                      updateCard(card.uid, (c) => ({
                                        ...c,
                                        consumables: c.consumables.filter(
                                          (item) => item.uid !== cons.uid
                                        ),
                                      }))
                                    }
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">توضیحات سرویس</Label>
                      <Textarea
                        rows={2}
                        value={card.description}
                        onChange={(e) =>
                          updateCard(card.uid, (c) => ({
                            ...c,
                            description: e.target.value,
                          }))
                        }
                        placeholder="یادداشت یا توضیحات این سرویس..."
                      />
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed py-5 text-primary hover:bg-primary/5"
                onClick={() =>
                  setServiceCards((prev) => [...prev, createEmptyServiceCard()])
                }
              >
                <Plus className="ml-2 size-4" />
                افزودن سرویس دیگر به این فاکتور (مثلاً ترکیب چند خدمت در یک مراجعه)
              </Button>

              <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-muted p-4 sm:flex-row">
                <div className="text-sm">
                  جمع کل {serviceCards.length.toLocaleString("fa-IR")} سرویس انتخاب‌شده:{" "}
                  <strong className="text-lg font-bold text-primary">
                    {financialSummary.subTotal.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>

                <Button type="button" onClick={handleGoToStep2} className="gap-2">
                  مرحله بعد: پرداختی و صدور فاکتور
                  <ArrowLeft className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-primary p-4 text-primary-foreground sm:grid-cols-3">
                <div>
                  <span className="text-xs opacity-80">جمع خدمات و مصرفی فروشی</span>
                  <p className="mt-1 text-lg font-bold">
                    {financialSummary.subTotal.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <div>
                  <span className="text-xs opacity-80">مبلغ قابل پرداخت نهایی</span>
                  <p className="mt-1 text-xl font-extrabold">
                    {financialSummary.finalTotal.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
                <div>
                  <span className="text-xs opacity-80">مانده حساب</span>
                  <p className="mt-1 text-lg font-bold text-amber-200">
                    {financialSummary.remaining.toLocaleString("fa-IR")} تومان
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>مبلغ تخفیف (تومان)</Label>
                  <PriceInput
                    disabled={!canApplyDiscount}
                    value={discountAmount}
                    onValueChange={(v) => setDiscountAmount(v || 0)}
                  />
                  {discountAmount > 0 && (
                    <Input
                      placeholder="دلیل تخفیف (اختیاری)"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>اضافه پرداخت / هزینه جانبی (تومان)</Label>
                  <PriceInput
                    value={extraChargeAmount}
                    onValueChange={(v) => setExtraChargeAmount(v || 0)}
                  />
                  {extraChargeAmount > 0 && (
                    <Input
                      placeholder="بابت چه موردی؟ (اختیاری)"
                      value={extraChargeReason}
                      onChange={(e) => setExtraChargeReason(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="flex items-center gap-2 text-sm font-bold">
                    <CreditCard className="size-4 text-primary" />
                    روش‌های پرداخت
                  </Label>
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <Wallet className="size-3.5 text-emerald-600" />
                    موجودی کیف پول مراجع:{" "}
                    {client.walletBalance.toLocaleString("fa-IR")} تومان
                  </Badge>
                </div>

                <div className="space-y-3">
                  {payments.map((pay, idx) => (
                    <div
                      key={pay.uid}
                      className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-12"
                    >
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs">روش پرداخت #{idx + 1}</Label>
                        <Select
                          value={pay.paymentMethod}
                          items={PAYMENT_METHOD_OPTIONS}
                          onValueChange={(val) =>
                            setPayments((prev) =>
                              prev.map((row) =>
                                row.uid === pay.uid
                                  ? {
                                      ...row,
                                      paymentMethod:
                                        (val as DraftPaymentRow["paymentMethod"]) ||
                                        "POS",
                                    }
                                  : row
                              )
                            )
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHOD_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs">مبلغ پرداختی (تومان)</Label>
                        <PriceInput
                          value={pay.amount}
                          onValueChange={(v) =>
                            setPayments((prev) =>
                              prev.map((row) =>
                                row.uid === pay.uid
                                  ? { ...row, amount: v || 0 }
                                  : row
                              )
                            )
                          }
                        />
                      </div>

                      {pay.paymentMethod === "POS" && (
                        <div className="space-y-1 md:col-span-3">
                          <Label className="text-xs">دستگاه کارت‌خوان</Label>
                          <Select
                            value={pay.terminalId}
                            items={[
                              { value: "NONE", label: "انتخاب کنید" },
                              ...terminals,
                            ]}
                            onValueChange={(val) =>
                              setPayments((prev) =>
                                prev.map((row) =>
                                  row.uid === pay.uid
                                    ? { ...row, terminalId: val || "NONE" }
                                    : row
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">انتخاب کنید</SelectItem>
                              {terminals.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {pay.paymentMethod === "CREDIT" && (
                        <div className="space-y-1.5 md:col-span-3">
                          <Label className="text-xs">سرویس اعتباری *</Label>
                          <Select
                            value={pay.creditProvider}
                            items={CREDIT_PROVIDER_OPTIONS}
                            onValueChange={(val) =>
                              setPayments((prev) =>
                                prev.map((row) =>
                                  row.uid === pay.uid
                                    ? {
                                        ...row,
                                        creditProvider: val || "SNAPP_PAY",
                                      }
                                    : row
                                )
                              )
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CREDIT_PROVIDER_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {pay.creditProvider === "OTHER" && (
                            <Input
                              className="h-8 text-xs"
                              placeholder="نام سرویس اعتباری را بنویسید..."
                              value={pay.customCreditProvider}
                              onChange={(e) =>
                                setPayments((prev) =>
                                  prev.map((row) =>
                                    row.uid === pay.uid
                                      ? {
                                          ...row,
                                          customCreditProvider: e.target.value,
                                        }
                                      : row
                                  )
                                )
                              }
                            />
                          )}
                        </div>
                      )}

                      <div
                        className={`flex items-end gap-2 ${
                          pay.paymentMethod === "POS" ||
                          pay.paymentMethod === "CREDIT"
                            ? "md:col-span-3"
                            : "md:col-span-6"
                        }`}
                      >
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">
                            {pay.paymentMethod === "CREDIT"
                              ? "شماره قرارداد / رهگیری"
                              : "شماره رهگیری"}
                          </Label>
                          <Input
                            dir="ltr"
                            className="h-9"
                            placeholder="اختیاری"
                            value={pay.trackingCode}
                            onChange={(e) =>
                              setPayments((prev) =>
                                prev.map((row) =>
                                  row.uid === pay.uid
                                    ? { ...row, trackingCode: e.target.value }
                                    : row
                                )
                              )
                            }
                          />
                        </div>

                        {payments.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 text-destructive"
                            onClick={() =>
                              setPayments((prev) =>
                                prev.filter((row) => row.uid !== pay.uid)
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPayments((prev) => [
                      ...prev,
                      {
                        uid: crypto.randomUUID(),
                        paymentMethod: "CASH",
                        amount: financialSummary.remaining,
                        terminalId: terminals[0]?.value || "NONE",
                        creditProvider: "SNAPP_PAY",
                        customCreditProvider: "",
                        trackingCode: "",
                      },
                    ])
                  }
                >
                  <Plus className="ml-1.5 size-3.5" />
                  افزودن روش پرداخت دیگر
                </Button>
              </div>

              {financialSummary.remaining > 0 && (
                <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      مبلغ مانده: {financialSummary.remaining.toLocaleString("fa-IR")} تومان — انتخاب نحوه تسویه مانده:
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRemainingMode("DEBT")}
                      className={`rounded-xl border p-3 text-right transition-all ${
                        remainingMode === "DEBT"
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      <div className="font-bold">بدهکار</div>
                      <div className="text-xs opacity-80">
                        ثبت در حساب بدهکاری مراجع برای پرداخت در آینده
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRemainingMode("INSTALLMENT");
                        if (installments.length === 0) {
                          handleSplitInstallmentsEqually(2);
                        }
                      }}
                      className={`rounded-xl border p-3 text-right transition-all ${
                        remainingMode === "INSTALLMENT"
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      <div className="font-bold">اقساط / چک</div>
                      <div className="text-xs opacity-80">
                        تقسیم مانده حساب به چند قسط یا چک با سررسید مشخص
                      </div>
                    </button>
                  </div>

                  {remainingMode === "INSTALLMENT" && (
                    <div className="space-y-3 rounded-xl border bg-background p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold">
                          <CalendarIcon className="size-4 text-primary" />
                          جدول زمان‌بندی اقساط ({installments.length} قسط)
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleSplitInstallmentsEqually(installments.length || 2)
                            }
                          >
                            تقسیم مساوی
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleSplitInstallmentsEqually(installments.length + 1)
                            }
                          >
                            + افزودن قسط
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {installments.map((ins, idx) => (
                          <div
                            key={ins.uid}
                            className="grid grid-cols-1 items-center gap-3 rounded-lg border p-2.5 sm:grid-cols-12"
                          >
                            <div className="text-xs font-bold sm:col-span-2">
                              قسط {idx + 1}
                            </div>

                            <div className="sm:col-span-4">
                              <PriceInput
                                value={ins.amount}
                                onValueChange={(v) =>
                                  setInstallments((prev) =>
                                    prev.map((row) =>
                                      row.uid === ins.uid
                                        ? { ...row, amount: v || 0 }
                                        : row
                                    )
                                  )
                                }
                              />
                            </div>

                            <div className="sm:col-span-4">
                              <DatePicker
                                calendarType="shamsi"
                                value={ins.dueDate}
                                onValueChange={(d) =>
                                  setInstallments((prev) =>
                                    prev.map((row) =>
                                      row.uid === ins.uid
                                        ? { ...row, dueDate: d }
                                        : row
                                    )
                                  )
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between sm:col-span-2">
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`chk-${ins.uid}`}
                                  checked={ins.isCheck}
                                  onCheckedChange={(checked) =>
                                    setInstallments((prev) =>
                                      prev.map((row) =>
                                        row.uid === ins.uid
                                          ? { ...row, isCheck: Boolean(checked) }
                                          : row
                                      )
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`chk-${ins.uid}`}
                                  className="cursor-pointer text-xs"
                                >
                                  چک
                                </Label>
                              </div>

                              {installments.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive"
                                  onClick={() =>
                                    setInstallments((prev) =>
                                      prev.filter((row) => row.uid !== ins.uid)
                                    )
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWizardStep(1)}
                  disabled={isPending}
                >
                  <ArrowRight className="ml-1.5 size-4" />
                  بازگشت به سبد خدمات
                </Button>

                <Button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isPending}
                  className="min-w-44"
                >
                  {isPending ? "در حال ثبت و کسر انبار..." : "ثبت فاکتور نهایی"}
                </Button>
              </div>
            </div>
          )}

          {wizardStep === 3 && createdInvoiceResult && (
            <div className="space-y-5 py-6 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="size-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold">
                  فاکتور شماره #{createdInvoiceResult.invoiceNumber} با موفقیت صادر شد
                </h3>
                <p className="text-xs text-muted-foreground">
                  تمامی سرویس‌ها در پرونده ثبت و اقلام مصرفی به صورت خودکار از بچ‌های انبار کسر شدند.
                </p>
              </div>

              <div className="mx-auto max-w-md space-y-2 rounded-xl border bg-muted/40 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ کل فاکتور:</span>
                  <strong className="text-foreground">
                    {createdInvoiceResult.totalAmount.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ پرداخت‌شده:</span>
                  <strong className="text-emerald-600">
                    {createdInvoiceResult.paidAmount.toLocaleString("fa-IR")} تومان
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مانده حساب:</span>
                  <strong className="text-amber-600">
                    {Math.max(
                      0,
                      createdInvoiceResult.totalAmount -
                        createdInvoiceResult.paidAmount
                    ).toLocaleString("fa-IR")}{" "}
                    تومان
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Receipt className="size-4" />
                  چاپ رسید
                </Button>
                <Button type="button" onClick={() => setIsWizardOpen(false)}>
                  بازگشت به پرونده مراجع
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}