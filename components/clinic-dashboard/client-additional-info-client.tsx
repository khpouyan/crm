// components/clinic-dashboard/client-additional-info-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, UserCog } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { formatJalali } from "@/lib/jalali";
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
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(client.fullName);
  const [phone, setPhone] = useState(client.phone);
  const [nationalId, setNationalId] = useState(client.nationalId);
  const [gender, setGender] = useState(client.gender);
  const [birthDate, setBirthDate] = useState<Date | null>(
    client.birthDate ? new Date(client.birthDate) : null
  );
  const [tag, setTag] = useState(client.tag);

  const [fatherName, setFatherName] = useState(client.additionalInfo.fatherName);
  const [secondaryPhone, setSecondaryPhone] = useState(
    client.additionalInfo.secondaryPhone
  );
  const [maritalStatus, setMaritalStatus] = useState(
    client.additionalInfo.maritalStatus
  );
  const [marriageDate, setMarriageDate] = useState<Date | null>(
    client.additionalInfo.marriageDate
      ? new Date(client.additionalInfo.marriageDate)
      : null
  );
  const [educationLevel, setEducationLevel] = useState(
    client.additionalInfo.educationLevel
  );
  const [fieldOfStudy, setFieldOfStudy] = useState(
    client.additionalInfo.fieldOfStudy
  );
  const [insurance, setInsurance] = useState(client.additionalInfo.insurance);
  const [occupation, setOccupation] = useState(client.additionalInfo.occupation);
  const [postalCode, setPostalCode] = useState(client.additionalInfo.postalCode);
  const [address, setAddress] = useState(client.additionalInfo.address);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateClientAdditionalInfoAction({
        clientId: client.id,
        fullName,
        phone,
        nationalId,
        gender,
        birthDate: birthDate ? birthDate.toISOString() : null,
        tag,
        additionalInfo: {
          fatherName: fatherName.trim(),
          secondaryPhone: secondaryPhone.trim(),
          maritalStatus: maritalStatus === "NONE" ? "" : maritalStatus,
          marriageDate: marriageDate ? marriageDate.toISOString() : null,
          educationLevel: educationLevel === "NONE" ? "" : educationLevel,
          fieldOfStudy: fieldOfStudy.trim(),
          insurance: insurance === "NONE" ? "" : insurance,
          occupation: occupation.trim(),
          postalCode: postalCode.trim(),
          address: address.trim(),
        },
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره اطلاعات");
        return;
      }

      toast.success("اطلاعات تکمیلی پرونده با موفقیت ذخیره شد.");
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

        {/* ردیف اول: اطلاعات پایه */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>نام و نام خانوادگی *</Label>
            <Input
              required
              disabled={!canEdit}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>شماره موبایل</Label>
            <Input
              dir="ltr"
              disabled={!canEdit}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
            />
          </div>

          <div className="space-y-1.5">
            <Label>کد ملی</Label>
            <Input
              dir="ltr"
              maxLength={10}
              disabled={!canEdit}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="۱۰ رقم کد ملی"
            />
          </div>

          <div className="space-y-1.5">
            <Label>جنسیت</Label>
            <Select
              value={gender}
              items={GENDER_OPTIONS}
              disabled={!canEdit}
              onValueChange={(v) => setGender(v || "FEMALE")}
            >
              <SelectTrigger>
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
          </div>
        </div>

        {/* ردیف دوم: اطلاعات تکمیلی خانوادگی */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>نام پدر</Label>
            <Input
              disabled={!canEdit}
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>شماره تلفن دوم</Label>
            <Input
              dir="ltr"
              disabled={!canEdit}
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              placeholder="تلفن ثابت یا همراه دوم"
            />
          </div>

          <div className="space-y-1.5">
            <Label>تاریخ تولد</Label>
            <DatePicker
              calendarType="shamsi"
              value={birthDate}
              onValueChange={setBirthDate}
              calendarProps={{
                captionLayout: "dropdown",
                startMonth: new Date(1940, 0),
                endMonth: new Date(),
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>وضعیت تأهل</Label>
            <Select
              value={maritalStatus}
              items={MARITAL_OPTIONS}
              disabled={!canEdit}
              onValueChange={(v) => setMaritalStatus(v || "NONE")}
            >
              <SelectTrigger>
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
          </div>
        </div>

        {/* ردیف سوم: تحصیلات، ازدواج و شغل */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>تاریخ ازدواج</Label>
            <DatePicker
              calendarType="shamsi"
              value={marriageDate}
              onValueChange={setMarriageDate}
              calendarProps={{
                captionLayout: "dropdown",
                startMonth: new Date(1960, 0),
                endMonth: new Date(),
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>مقطع تحصیلی</Label>
            <Select
              value={educationLevel}
              items={EDUCATION_OPTIONS}
              disabled={!canEdit}
              onValueChange={(v) => setEducationLevel(v || "NONE")}
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-1.5">
            <Label>رشته تحصیلی</Label>
            <Input
              disabled={!canEdit}
              value={fieldOfStudy}
              onChange={(e) => setFieldOfStudy(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>شغل</Label>
            <Input
              disabled={!canEdit}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
            />
          </div>
        </div>

        {/* ردیف چهارم: بیمه، کد پستی و برچسب */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>بیمه</Label>
            <Select
              value={insurance}
              items={INSURANCE_OPTIONS}
              disabled={!canEdit}
              onValueChange={(v) => setInsurance(v || "NONE")}
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-1.5">
            <Label>کد پستی</Label>
            <Input
              dir="ltr"
              maxLength={10}
              disabled={!canEdit}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="1234567890"
            />
          </div>

          <div className="space-y-1.5">
            <Label>برچسب پرونده</Label>
            <Select
              value={tag}
              items={CLIENT_TAGS}
              disabled={!canEdit}
              onValueChange={(v) => setTag(v || "NONE")}
            >
              <SelectTrigger>
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
          </div>
        </div>

        {/* آدرس */}
        <div className="space-y-1.5">
          <Label>آدرس کامل</Label>
          <Textarea
            rows={3}
            disabled={!canEdit}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="آدرس کامل محل سکونت یا کار را وارد کنید..."
          />
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} className="gap-2">
              <Save className="size-4" />
              {isPending ? "در حال ذخیره..." : "ثبت اطلاعات"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}