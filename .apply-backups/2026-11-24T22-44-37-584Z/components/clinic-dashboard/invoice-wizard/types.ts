// components/clinic-dashboard/invoice-wizard/types.ts

export interface AttributeEntry {
  key: string;
  value: string;
}

export interface WizardCatalogSubService {
  id: string;
  title: string;
  price: number;
  attributes: AttributeEntry[];
  defaultProducts: {
    clinicProductId: string;
    productName: string;
    unit: string;
    quantity: number;
  }[];
}

export interface WizardCatalogService {
  id: string;
  title: string;
  defaultServiceProducts: {
    clinicProductId: string;
    productName: string;
    unit: string;
    quantity: number;
  }[];
  subServices: WizardCatalogSubService[];
}

export interface WizardTherapistOption {
  id: string;
  label: string;
  hasAllServicesAccess: boolean;
  assignedServiceIds: string[];
}

export interface WizardProductBatch {
  id: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number | null;
  expirationDate: string | null;
  exclusiveSubServiceId: string | null;
  exclusiveTherapistId: string | null;
}

export interface WizardProduct {
  id: string;
  name: string;
  unit: string;
  totalStock: number;
  batches: WizardProductBatch[];
}

export interface WizardCreditProvider {
  id: string;
  title: string;
  commissionPercent: number;
  clientFeePercent: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

// ساختار هر آیتم زیرسرویس انتخاب‌شده داخل یک آکاردیون خدمت
export interface DraftSubServiceSelection {
  subServiceId: string;
  subServiceTitle: string;
  finalPrice: number;
  attributes: AttributeEntry[];
}

export interface DraftConsumable {
  uid: string;
  clinicProductId: string;
  productName: string;
  unit: string;
  preferredBatchId: string;
  quantity: number;
  sellingPrice: number;
  isDefault: boolean;
}

// هر آکاردیون خدمت اصلی در مرحله ۱
export interface DraftServiceAccordionBlock {
  uid: string;
  serviceId: string;
  allowMultiSubServices: boolean; // حالت پیش‌فرض رادیو باتن است و با زدن گزینه «انتخاب چندتایی» چک‌باکسی می‌شود
  selectedSubServices: DraftSubServiceSelection[];
  expandedSubServiceId: string;
  consumables: DraftConsumable[];
  selectedNewProductId: string;
  selectedBatchForNewProduct: string;
  description: string;
}

export interface DraftPaymentRow {
  uid: string;
  paymentMethod: "POS" | "CASH" | "CARD_TO_CARD" | "WALLET" | "CREDIT";
  amount: number;
  terminalId: string;
  creditProviderId: string;
  customCreditProvider: string;
  trackingCode: string;
}

export interface DraftInstallmentRow {
  uid: string;
  amount: number;
  dueDate: Date | null;
  isCheck: boolean;
  checkNumber: string;
}

export interface PrintSectionFlags {
  clientInfo: boolean;
  nationalId: boolean;
  therapistName: boolean;
  serviceInfo: boolean;
  subServices: boolean;
  consumables: boolean;
  financialSummary: boolean;
  discounts: boolean;
  extraCharges: boolean;
  payments: boolean;
  installments: boolean;
  description: boolean;
}