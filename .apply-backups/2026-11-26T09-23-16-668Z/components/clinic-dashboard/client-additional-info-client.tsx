// components/clinic-dashboard/client-additional-info-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, UserCog, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { formatJalali } from "@/lib/jalali";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { isValidNationalId } from "@/lib/national-id";
import { normalizeIranPhone, isValidIranPhone } from "@/lib/iranian-mobile";
import { updateClientAdditionalInfoAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";

interface ClientAdditionalInfoClientProps {
  client: {
    id: string;
    fileNumber: number | null;
    fullName: string;
    phone: string;
    nationalId: string;
    gender: string;
    birthDate: string | null;
    referralSource: string | null;
    referrerName: string | null;
    tag: string;
    servicesCount: number;
    lastVisitAt: string | null;
    additionalInfo: {
      fatherName: string;
      secondaryPhone: string;
      maritalStatus: string;
      marriageDate: string | null;
      educationLevel: string;
      fieldOfStudy: string;
      insurance: string;
      occupation: string;
      postalCode: string;
      address: string;
    };
  };
  canEdit: boolean;
}

const GENDER_OPTIONS = [
  { value: "FEMALE", label: "خانم" },
  { value: "MALE", label: "آقا" },
];

const MARITAL_OPTIONS = [
  { value: "NONE", label: "انتخاب کنید" },
  { value: "SINGLE", label: "مجرد" },
  { value: "MARRIED", label: "متأهل" },
];

const EDUCATION_OPTIONS = [
  { value: "NONE", label: "انتخاب کنید" },
  { value: "UNDER_DIPLOMA", label: "زیر دیپلم" },
  { value: "DIPLOMA", label: "دیپلم" },
  { value: "ASSOCIATE", label: "کاردانی" },
  { value: "BACHELOR", label: "کارشناسی" },
  { value: "MASTER", label: "کارشناسی ارشد" },
  { value: "PHD", label: "دکتری و بالاتر" },
];

const INSURANCE_OPTIONS = [
  { value: "NONE", label: "انتخاب کنید" },
  { value: "TAMIN", label: "تأمین اجتماعی" },
  { value: "SALAMAT", label: "بیمه سلامت" },
  { value: "NIROO_MOSALLAH", label: "نیروهای مسلح" },
  { value: "TAKMILI", label: "بیمه تکمیلی" },
  { value: "NO_INSURANCE", label: "فاقد بیمه" },
];

const CLIENT_TAGS = [
  { value: "NONE", label: "بدون برچسب" },
  { value: "VIP", label: "VIP / ویژه" },
  { value: "REGULAR", label: "مراجع ثابت" },
  { value: "SENSITIVE", label: "نیازمند پیگیری خاص" },
  { value: "NEW", label: "مراجع جدید" },
];

export function ClientAdditionalInfoClient({
  client,
  canEdit,
}: ClientAdditionalInfoClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(client.fullName);
  const [phone, setPhone] = useState(client.phone);
  const [nationalId, setNationalId] = useState(client.nationalId);
  const [gender, setGender] = useState(client.gender);
  const [birthDate, setBirthDate] = useState<Date | null>(
    client.birthDate ? new Date(client.birthDate) : null
  );
  const [tag, setTag] = useState(client.tag || "NONE");

  const [fatherName, setFatherName] = useState(client.additionalInfo.fatherName);
  const [secondaryPhone, setSecondaryPhone] = useState(
    client.additionalInfo.secondaryPhone
  );
  const [maritalStatus, setMaritalStatus] = useState(
    client.additionalInfo.maritalStatus || "NONE"
  );
  const [marriageDate, setMarriageDate] = useState<Date | null>(
    client.additionalInfo.marriageDate
      ? new Date(client.additionalInfo.marriageDate)
      : null
  );
  const [educationLevel, setEducationLevel] = useState(
    client.additionalInfo.educationLevel || "NONE"
  );
  const [fieldOfStudy, setFieldOfStudy] = useState(
    client.additionalInfo.fieldOfStudy
  );
  const [insurance, setInsurance] = useState(
    client.additionalInfo.insurance || "NONE"
  );
  const [occupation, setOccupation] = useState(client.additionalInfo.occupation);
  const [postalCode, setPostalCode] = useState(client.additionalInfo.postalCode);
  const [address, setAddress] = useState(client.additionalInfo.address);

  const normalizedPhone = normalizePersianDigits(phone).trim();
  const normalizedNationalId = normalizePersianDigits(nationalId).trim();
  const normalizedSecondaryPhone = normalizePersianDigits(secondaryPhone).trim();
  const normalizedPostalCode = normalizePersianDigits(postalCode).trim();

  const isPhoneInvalid =
    normalizedPhone !== "" && !isValidIranPhone(normalizedPhone);

  const isNationalIdInvalid =
    normalizedNationalId !== "" && !isValidNationalId(normalizedNationalId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isPhoneInvalid) {
      toast({
        title: "خطا در اعتبارسنجی",
        description: "شماره موبایل وارد شده معتبر نیست. ذخیره انجام نشد.",
        variant: "destructive",
      });
      return;
    }

    if (isNationalIdInvalid) {
      toast({
        title: "خطا در اعتبارسنجی",
        description: "کد ملی وارد شده معتبر نیست. ذخیره انجام نشد.",
        variant: "destructive",
      });
      return;
    }

    const finalPhone = normalizedPhone ? normalizeIranPhone(normalizedPhone) : "";
    if (finalPhone) {
      setPhone(finalPhone);
    }

    startTransition(async () => {
      const res = await updateClientAdditionalInfoAction({
        clientId: client.id,
        fullName: fullName.trim(),
        phone: finalPhone,
        nationalId: normalizedNationalId,
        gender,
        birthDate: birthDate ? birthDate.toISOString() : null,
        tag,
        additionalInfo: {
          fatherName: fatherName.trim(),
          secondaryPhone: normalizedSecondaryPhone,
          maritalStatus: maritalStatus === "NONE" ? "" : maritalStatus,
          marriageDate: marriageDate ? marriageDate.toISOString() : null,
          educationLevel: educationLevel === "NONE" ? "" : educationLevel,
          fieldOfStudy: fieldOfStudy.trim(),
          insurance: insurance === "NONE" ? "" : insurance,
          occupation: occupation.trim(),
          postalCode: normalizedPostalCode,
          address: address.trim(),
        },
      });

      if (!res.success) {
        toast({
          title: "خطا در ذخیره‌سازی",
          description: res.error || "خطا در ذخیره اطلاعات پرونده",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "ذخیره انجام شد",
        description: "اطلاعات تکمیلی پرونده با موفقیت ذخیره شد.",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* کارت وضعیت آماری پرونده */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
            <span>
              شماره پرونده: <strong>{client.fileNumber ?? "—"}</strong>
            </span>
            <span>
              تاریخ تولد:{" "}
              <strong>
                {birthDate ? formatJalali(birthDate) : "ثبت نشده"}
              </strong>
            </span>
            <span>
              معرف: <strong>{client.referrerName || "—"}</strong>
            </span>
            <span>
              تعداد کل سرویس‌ها:{" "}
              <strong>{client.servicesCount.toLocaleString("fa-IR")}</strong>
            </span>
            <span>
              آخرین مراجعه:{" "}
              <strong>
                {client.lastVisitAt
                  ? formatJalali(new Date(client.lastVisitAt))
                  : "—"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* فرم اطلاعات هویتی و تکمیلی */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-card p-5 shadow-2xs"
      >
        <div className="flex items-center gap-2 border-b pb-3">
          <UserCog className="size-5 text-primary" />
          <h2 className="text-base font-bold">اطلاعات هویتی و تکمیلی مراجعه‌کننده</h2>
        </div>

        <FieldGroup>
          {/* ردیف اول: اطلاعات پایه */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="fullName">نام و نام خانوادگی *</FieldLabel>
              <Input
                id="fullName"
                required
                disabled={!canEdit}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>

            <Field data-invalid={isPhoneInvalid || undefined}>
              <FieldLabel htmlFor="phone">شماره موبایل</FieldLabel>
              <Input
                id="phone"
                dir="ltr"
                type="tel"
                disabled={!canEdit}
                aria-invalid={isPhoneInvalid}
                value={phone}
                onChange={(e) =>
                  setPhone(normalizePersianDigits(e.target.value))
                }
                onBlur={() => {
                  const cleaned = normalizePersianDigits(phone).trim();
                  if (cleaned) {
                    setPhone(normalizeIranPhone(cleaned));
                  }
                }}
                placeholder="09123456789"
              />
              {isPhoneInvalid && (
                <FieldError>شماره موبایل وارد شده معتبر نیست.</FieldError>
              )}
            </Field>

            <Field data-invalid={isNationalIdInvalid || undefined}>
              <FieldLabel htmlFor="nationalId">کد ملی</FieldLabel>
              <Input
                id="nationalId"
                dir="ltr"
                maxLength={10}
                disabled={!canEdit}
                aria-invalid={isNationalIdInvalid}
                value={nationalId}
                onChange={(e) =>
                  setNationalId(normalizePersianDigits(e.target.value))
                }
                placeholder="۱۰ رقم کد ملی"
              />
              {isNationalIdInvalid && (
                <FieldError>کد ملی وارد شده معتبر نیست.</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="gender">جنسیت</FieldLabel>
              <Select
                value={gender}
                items={GENDER_OPTIONS}
                disabled={!canEdit}
                onValueChange={(v) => setGender(v || "FEMALE")}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* ردیف دوم: اطلاعات تکمیلی خانوادگی */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="fatherName">نام پدر</FieldLabel>
              <Input
                id="fatherName"
                disabled={!canEdit}
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="secondaryPhone">شماره تلفن دوم</FieldLabel>
              <Input
                id="secondaryPhone"
                dir="ltr"
                type="tel"
                disabled={!canEdit}
                value={secondaryPhone}
                onChange={(e) =>
                  setSecondaryPhone(normalizePersianDigits(e.target.value))
                }
                placeholder="تلفن ثابت یا همراه دوم"
              />
            </Field>

            <Field>
              <FieldLabel>تاریخ تولد</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DatePicker
                    calendarType="shamsi"
                    value={birthDate}
                    onValueChange={setBirthDate}
                    placeholder="انتخاب تاریخ تولد"
                    className="w-full"
                    calendarProps={{
                      captionLayout: "dropdown",
                      startMonth: new Date(1940, 0),
                      endMonth: new Date(),
                    }}
                  />
                </div>
                {canEdit && birthDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setBirthDate(null)}
                    title="پاک کردن تاریخ تولد"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="maritalStatus">وضعیت تأهل</FieldLabel>
              <Select
                value={maritalStatus}
                items={MARITAL_OPTIONS}
                disabled={!canEdit}
                onValueChange={(v) => setMaritalStatus(v || "NONE")}
              >
                <SelectTrigger id="maritalStatus" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* ردیف سوم: تحصیلات، ازدواج و شغل */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel>تاریخ ازدواج</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DatePicker
                    calendarType="shamsi"
                    value={marriageDate}
                    onValueChange={setMarriageDate}
                    placeholder="انتخاب تاریخ ازدواج"
                    className="w-full"
                    calendarProps={{
                      captionLayout: "dropdown",
                      startMonth: new Date(1960, 0),
                      endMonth: new Date(),
                    }}
                  />
                </div>
                {canEdit && marriageDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setMarriageDate(null)}
                    title="پاک کردن تاریخ ازدواج"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="educationLevel">مقطع تحصیلی</FieldLabel>
              <Select
                value={educationLevel}
                items={EDUCATION_OPTIONS}
                disabled={!canEdit}
                onValueChange={(v) => setEducationLevel(v || "NONE")}
              >
                <SelectTrigger id="educationLevel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_OPTIONS.map((ed) => (
                    <SelectItem key={ed.value} value={ed.value}>
                      {ed.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="fieldOfStudy">رشته تحصیلی</FieldLabel>
              <Input
                id="fieldOfStudy"
                disabled={!canEdit}
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="occupation">شغل</FieldLabel>
              <Input
                id="occupation"
                disabled={!canEdit}
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </Field>
          </div>

          {/* ردیف چهارم: بیمه، کد پستی و برچسب */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="insurance">بیمه</FieldLabel>
              <Select
                value={insurance}
                items={INSURANCE_OPTIONS}
                disabled={!canEdit}
                onValueChange={(v) => setInsurance(v || "NONE")}
              >
                <SelectTrigger id="insurance" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_OPTIONS.map((ins) => (
                    <SelectItem key={ins.value} value={ins.value}>
                      {ins.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="postalCode">کد پستی</FieldLabel>
              <Input
                id="postalCode"
                dir="ltr"
                maxLength={10}
                disabled={!canEdit}
                value={postalCode}
                onChange={(e) =>
                  setPostalCode(normalizePersianDigits(e.target.value))
                }
                placeholder="1234567890"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="tag">برچسب پرونده</FieldLabel>
              <Select
                value={tag}
                items={CLIENT_TAGS}
                disabled={!canEdit}
                onValueChange={(v) => setTag(v || "NONE")}
              >
                <SelectTrigger id="tag" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TAGS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* آدرس */}
          <Field>
            <FieldLabel htmlFor="address">آدرس کامل</FieldLabel>
            <Textarea
              id="address"
              rows={3}
              disabled={!canEdit}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس کامل محل سکونت یا کار را وارد کنید..."
            />
          </Field>
        </FieldGroup>

        {canEdit && (
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending || isPhoneInvalid || isNationalIdInvalid}
              className="gap-2"
            >
              <Save className="size-4" />
              {isPending ? "در حال ذخیره..." : "ثبت اطلاعات"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
