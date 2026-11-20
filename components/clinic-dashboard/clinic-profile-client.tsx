// components/clinic-dashboard/clinic-profile-client.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Upload,
  Trash2,
  Save,
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Globe,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  CitySelector,
  type CitySelectorValue,
} from "@/components/ui/city-selector";
import { persianProvinces } from "@/lib/persian-provinces";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";
import { isValidNationalId } from "@/lib/national-id";
import { updateClinicProfileAction } from "@/app/clinic-dashboard/(dashboard)/settings/clinic-profile/actions";

interface ClinicProfileClientProps {
  clinic: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    landlinePhone: string | null;
    secondaryPhone: string | null;
    ownerNationalId: string | null;
    medicalCouncilCode: string | null;
    website: string | null;
    instagram: string | null;
  };
  ownerFullName: string;
  ownerPhone: string;
  isWelcomeOnboarding?: boolean;
}

export function ClinicProfileClient({
  clinic,
  ownerFullName,
  ownerPhone,
  isWelcomeOnboarding = false,
}: ClinicProfileClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [name, setName] = useState(clinic.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(clinic.logoUrl);
  const [location, setLocation] = useState<CitySelectorValue>(() => {
    const matchedProvince =
      persianProvinces.find(
        (p) => p.name === clinic.province || String(p.id) === clinic.province
      ) ?? null;

    const matchedCity =
      matchedProvince?.cities.find(
        (c) => c.name === clinic.city || String(c.id) === clinic.city
      ) ?? null;

    return {
      province: matchedProvince,
      city: matchedCity,
    };
  });
  const [address, setAddress] = useState(clinic.address || "");
  const [postalCode, setPostalCode] = useState(clinic.postalCode || "");
  const [landlinePhone, setLandlinePhone] = useState(
    clinic.landlinePhone || ""
  );
  const [secondaryPhone, setSecondaryPhone] = useState(
    clinic.secondaryPhone || ""
  );
  const [ownerNationalId, setOwnerNationalId] = useState(
    clinic.ownerNationalId || ""
  );
  const [medicalCouncilCode, setMedicalCouncilCode] = useState(
    clinic.medicalCouncilCode || ""
  );
  const [website, setWebsite] = useState(clinic.website || "");
  const [instagram, setInstagram] = useState(clinic.instagram || "");

  const normalizedOwnerNationalId = normalizePersianDigits(
    ownerNationalId
  ).trim();
  const isNationalIdInvalid =
    normalizedOwnerNationalId !== "" &&
    !isValidNationalId(normalizedOwnerNationalId);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/clinic-dashboard/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "خطا در آپلود لوگو");
        return;
      }

      setLogoUrl(data.url);
      toast.success("تصویر لوگو بارگذاری شد. برای ثبت نهایی دکمه ذخیره را بزنید.");
    } catch {
      toast.error("خطا در ارتباط با سرور هنگام آپلود لوگو.");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isNationalIdInvalid) {
      toast.error("کد ملی صاحب کلینیک معتبر نیست.");
      return;
    }

    startTransition(async () => {
      const res = await updateClinicProfileAction({
        name,
        logoUrl,
        province: location.province?.name || "",
        city: location.city?.name || "",
        address,
        postalCode,
        landlinePhone,
        secondaryPhone,
        ownerNationalId: normalizedOwnerNationalId,
        medicalCouncilCode,
        website,
        instagram,
      });

      if (!res.success) {
        toast.error(res.error || "خطا در ذخیره اطلاعات مرکز");
        return;
      }

      toast.success("اطلاعات مرکز با موفقیت ذخیره شد.");
      if (isWelcomeOnboarding) {
        router.push("/clinic-dashboard");
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-16 md:p-0">
      {/* بنر خوش‌آمدگویی در صورت ورود مستقیم از صفحه ثبت‌نام */}
      {isWelcomeOnboarding && (
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Sparkles className="size-4" />
              به پنل مدیریت کلینیک خوش آمدید!
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              تکمیل این اطلاعات اختیاری است و در سربرگ فاکتورها و گزارش‌های چاپی
              استفاده می‌شود. هر زمان مایل بودید می‌توانید صرف‌نظر کنید.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => {
              router.push("/clinic-dashboard");
              router.refresh();
            }}
          >
            صرف‌نظر و ورود به داشبورد
            <ArrowLeft className="size-4" />
          </Button>
        </div>
      )}

      {/* هدر صفحه */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          مشخصات و اطلاعات تکمیلی کلینیک
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          مدیریت لوگو، مجوزهای پزشکی، موقعیت مکانی و راه‌های ارتباطی مرکز درمانی یا زیبایی
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* کارت ۱: لوگو و هویت مرکز */}
        <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b pb-3">
            <Building2 className="size-5 text-primary" />
            <h2 className="text-sm font-bold">هویت، لوگو و مجوزهای مرکز</h2>
          </div>

          {/* بخش آپلود لوگو */}
          <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed bg-muted/30 p-4 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-background shadow-2xs">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={name}
                  className="size-full object-contain p-1.5"
                />
              ) : (
                <Building2 className="size-8 text-muted-foreground/50" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <h3 className="text-xs font-bold text-foreground">
                  لوگوی کلینیک یا مرکز
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  فرمت‌های مجاز: PNG، JPG، WebP یا SVG (حداکثر ۲ مگابایت) — در
                  سربرگ رسید و فاکتور نمایش داده می‌شود.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isUploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {logoUrl ? "تغییر لوگو" : "انتخاب و آپلود لوگو"}
                </Button>

                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoUrl(null)}
                    className="gap-1 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    حذف لوگو
                  </Button>
                )}
              </div>
            </div>
          </div>

          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="clinic-name">
                  نام کلینیک یا مرکز *
                </FieldLabel>
                <Input
                  id="clinic-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="owner-name">
                  نام و نام خانوادگی مالک / مدیر
                </FieldLabel>
                <Input
                  id="owner-name"
                  value={`${ownerFullName} (${ownerPhone})`}
                  disabled
                  className="bg-muted/50"
                />
                <FieldDescription className="text-[11px]">
                  اطلاعات مالک از حساب کاربری ثبت‌نام‌شده خوانده می‌شود.
                </FieldDescription>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={isNationalIdInvalid || undefined}>
                <FieldLabel htmlFor="owner-national-id">
                  کد ملی صاحب کلینیک
                </FieldLabel>
                <Input
                  id="owner-national-id"
                  dir="ltr"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="۱۰ رقم کد ملی"
                  aria-invalid={isNationalIdInvalid}
                  value={ownerNationalId}
                  onChange={(e) =>
                    setOwnerNationalId(normalizePersianDigits(e.target.value))
                  }
                />
                {isNationalIdInvalid && (
                  <FieldError>کد ملی وارد شده معتبر نیست.</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="medical-code"
                  className="flex items-center gap-1.5"
                >
                  <ShieldCheck className="size-3.5 text-primary" />
                  شماره نظام پزشکی / کد پروانه مرکز
                </FieldLabel>
                <Input
                  id="medical-code"
                  dir="ltr"
                  placeholder="مثلاً: 123456"
                  value={medicalCouncilCode}
                  onChange={(e) =>
                    setMedicalCouncilCode(
                      normalizePersianDigits(e.target.value)
                    )
                  }
                />
              </Field>
            </div>
          </FieldGroup>
        </div>

        {/* کارت ۲: محل و شماره‌های تماس */}
        <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b pb-3">
            <MapPin className="size-5 text-primary" />
            <h2 className="text-sm font-bold">موقعیت مکانی و شماره‌های تماس</h2>
          </div>

          <FieldGroup>
            <CitySelector
              value={location}
              onValueChange={setLocation}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel
                  htmlFor="landline-phone"
                  className="flex items-center gap-1.5"
                >
                  <Phone className="size-3.5 text-muted-foreground" />
                  تلفن ثابت مرکز
                </FieldLabel>
                <Input
                  id="landline-phone"
                  dir="ltr"
                  type="tel"
                  placeholder="02188000000"
                  value={landlinePhone}
                  onChange={(e) =>
                    setLandlinePhone(normalizePersianDigits(e.target.value))
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="secondary-phone">
                  شماره تماس دوم / پذیرش
                </FieldLabel>
                <Input
                  id="secondary-phone"
                  dir="ltr"
                  type="tel"
                  placeholder="09120000000"
                  value={secondaryPhone}
                  onChange={(e) =>
                    setSecondaryPhone(normalizePersianDigits(e.target.value))
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="postal-code">کد پستی</FieldLabel>
                <Input
                  id="postal-code"
                  dir="ltr"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="1234567890"
                  value={postalCode}
                  onChange={(e) =>
                    setPostalCode(normalizePersianDigits(e.target.value))
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="clinic-address">آدرس دقیق مرکز</FieldLabel>
              <Textarea
                id="clinic-address"
                rows={3}
                placeholder="خیابان، کوچه، پلاک، طبقه، واحد..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </div>

        {/* کارت ۳: شبکه‌های اجتماعی و وب‌سایت */}
        <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b pb-3">
            <Globe className="size-5 text-primary" />
            <h2 className="text-sm font-bold">وب‌سایت و شبکه‌های اجتماعی</h2>
          </div>

          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="clinic-website">وب‌سایت</FieldLabel>
                <Input
                  id="clinic-website"
                  dir="ltr"
                  placeholder="https://example.ir"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="clinic-instagram">
                  آیدی اینستاگرام
                </FieldLabel>
                <Input
                  id="clinic-instagram"
                  dir="ltr"
                  placeholder="@clinic_name"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>

        {/* دکمه‌های پایین صفحه */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {isWelcomeOnboarding && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                router.push("/clinic-dashboard");
                router.refresh();
              }}
            >
              فعلاً صرف‌نظر می‌کنم
            </Button>
          )}

          <Button
            type="submit"
            disabled={isPending || isUploadingLogo || isNationalIdInvalid}
            className="gap-2 px-6"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isPending ? "در حال ذخیره..." : "ذخیره اطلاعات مرکز"}
          </Button>
        </div>
      </form>
    </div>
  );
}