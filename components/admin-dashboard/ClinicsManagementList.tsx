"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  Phone,
  User,
  Building2,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  SlidersHorizontal,
  Settings,
  Calendar,
  ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type PlanType = "clinic" | "office" | "free";

export interface ClinicUser {
  id: string;
  fullName: string;
  centerName: string;
  phoneNumber: string;
  plan: PlanType;
  daysRemaining: number; // 0 or negative means expired
  city: string;
}

export const sampleClinics: ClinicUser[] = [
  { id: "CLN-101", fullName: "دکتر سارا احمدی", centerName: "کلینیک تخصصی پوست آراسته", phoneNumber: "09121112233", plan: "clinic", daysRemaining: 145, city: "تهران" },
  { id: "CLN-102", fullName: "دکتر مهران علوی", centerName: "مطب زیبایی دکتر علوی", phoneNumber: "09122223344", plan: "office", daysRemaining: 18, city: "مشهد" },
  { id: "CLN-103", fullName: "دکتر پرستو راد", centerName: "کلینیک لیزر و جوانسازی نگین", phoneNumber: "09133334455", plan: "clinic", daysRemaining: 0, city: "اصفهان" },
  { id: "CLN-104", fullName: "دکتر کامران فیاض", centerName: "مطب جراحی زیبایی فیاض", phoneNumber: "09174445566", plan: "free", daysRemaining: 3, city: "شیراز" },
  { id: "CLN-105", fullName: "دکتر نیلوفر امانی", centerName: "کلینیک جامع تخصصی هیراد", phoneNumber: "09145556677", plan: "clinic", daysRemaining: 84, city: "تبریز" },
  { id: "CLN-106", fullName: "دکتر حمید کاظمی", centerName: "مطب پوست و مو کاظمی", phoneNumber: "09166667788", plan: "office", daysRemaining: 0, city: "اهواز" },
  { id: "CLN-107", fullName: "دکتر زهرا پورمند", centerName: "کلینیک زیبایی پرشین لند", phoneNumber: "09217778899", plan: "clinic", daysRemaining: 210, city: "تهران" },
  { id: "CLN-108", fullName: "دکتر آرش کیانی", centerName: "مطب تخصصی دکتر کیانی", phoneNumber: "09358889900", plan: "free", daysRemaining: 0, city: "کرج" },
  { id: "CLN-109", fullName: "دکتر مژگان صبوری", centerName: "کلینیک تخصصی لیزر یاس", phoneNumber: "09119990011", plan: "clinic", daysRemaining: 62, city: "رشت" },
  { id: "CLN-110", fullName: "دکتر وحید بهرامی", centerName: "مطب پوست و مو بهرامی", phoneNumber: "09181122334", plan: "office", daysRemaining: 125, city: "کرمانشاه" },
  { id: "CLN-111", fullName: "دکتر المیرا خسروی", centerName: "کلینیک تخصصی رویان مدیکال", phoneNumber: "09123344556", plan: "clinic", daysRemaining: 310, city: "تهران" },
  { id: "CLN-112", fullName: "دکتر رضا شمس", centerName: "مطب زیبایی دکتر شمس", phoneNumber: "09134455667", plan: "free", daysRemaining: 7, city: "یزد" },
  { id: "CLN-113", fullName: "دکتر بیتا جعفری", centerName: "مرکز لیزر سپهر", phoneNumber: "09155566778", plan: "office", daysRemaining: 0, city: "مشهد" },
  { id: "CLN-114", fullName: "دکتر فرزاد نوری", centerName: "کلینیک فوق تخصصی آرتمیس", phoneNumber: "09176677889", plan: "clinic", daysRemaining: 45, city: "بوشهر" },
  { id: "CLN-115", fullName: "دکتر تینا افشار", centerName: "مطب زیبایی و تناسب اندام", phoneNumber: "09127788990", plan: "office", daysRemaining: 92, city: "تهران" },
  { id: "CLN-116", fullName: "دکتر مسعود دهقان", centerName: "کلینیک مهراد سلامت", phoneNumber: "09368899001", plan: "clinic", daysRemaining: 176, city: "قم" },
  { id: "CLN-117", fullName: "دکتر شیوا مرادی", centerName: "مطب تخصصی دکتر مرادی", phoneNumber: "09149900112", plan: "free", daysRemaining: 0, city: "ارومیه" },
  { id: "CLN-118", fullName: "دکتر هومن صدر", centerName: "کلینیک پوست و مو پرستیژ", phoneNumber: "09120011223", plan: "clinic", daysRemaining: 23, city: "تهران" },
  { id: "CLN-119", fullName: "دکتر لیدا زمانی", centerName: "مطب زیبایی لیدا", phoneNumber: "09131122335", plan: "office", daysRemaining: 154, city: "اصفهان" },
  { id: "CLN-120", fullName: "دکتر کیوان بهبودی", centerName: "کلینیک هیر پیوند بهبودی", phoneNumber: "09112233446", plan: "clinic", daysRemaining: 0, city: "ساری" },
  { id: "CLN-121", fullName: "دکتر نگار عباسی", centerName: "مطب تخصصی تزریقات ژل و بوتاکس", phoneNumber: "09123344557", plan: "office", daysRemaining: 4, city: "تهران" },
  { id: "CLN-122", fullName: "دکتر احسان فلاح", centerName: "کلینیک پوست و لیزر سپید", phoneNumber: "09174455668", plan: "free", daysRemaining: 11, city: "شیراز" },
  { id: "CLN-123", fullName: "دکتر غزل سلیمانی", centerName: "مطب زیبایی پارس", phoneNumber: "09185566779", plan: "office", daysRemaining: 88, city: "همدان" },
  { id: "CLN-124", fullName: "دکتر سینا داوودی", centerName: "کلینیک جراحی محدود داوودی", phoneNumber: "09126677880", plan: "clinic", daysRemaining: 190, city: "تهران" },
  { id: "CLN-125", fullName: "دکتر هدیه محمودی", centerName: "مطب مراقبت‌های پوستی هدیه", phoneNumber: "09157788991", plan: "office", daysRemaining: 0, city: "مشهد" },
  { id: "CLN-126", fullName: "دکتر بابک فکور", centerName: "مرکز لیزر باران", phoneNumber: "09378899002", plan: "free", daysRemaining: 1, city: "قزوین" },
  { id: "CLN-127", fullName: "دکتر سپیده هدایتی", centerName: "کلینیک تخصصی پوست تندیس", phoneNumber: "09129900113", plan: "clinic", daysRemaining: 74, city: "تهران" },
  { id: "CLN-128", fullName: "دکتر نوید صالحی", centerName: "مطب زیبایی و جوانسازی نوید", phoneNumber: "09130011224", plan: "office", daysRemaining: 215, city: "کاشان" },
  { id: "CLN-129", fullName: "دکتر رویا کریمی", centerName: "کلینیک سلامت و پوست ونوس", phoneNumber: "09111122336", plan: "clinic", daysRemaining: 0, city: "گرگان" },
  { id: "CLN-130", fullName: "دکتر ایمان پناهی", centerName: "مطب دکتر پناهی", phoneNumber: "09122233448", plan: "office", daysRemaining: 39, city: "سمنان" },
];

export interface ClinicListProps {
  initialClinics?: ClinicUser[];
  onManageClinic?: (clinic: ClinicUser) => void;
}

export function ClinicsManagementList({
  initialClinics = sampleClinics,
  onManageClinic,
}: ClinicListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // فیلتر کردن هوشمند
  const filteredClinics = useMemo(() => {
    return initialClinics.filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        item.fullName.toLowerCase().includes(query) ||
        item.centerName.toLowerCase().includes(query) ||
        item.phoneNumber.includes(query) ||
        item.city.toLowerCase().includes(query);

      const matchesPlan = selectedPlan === "all" || item.plan === selectedPlan;

      let matchesStatus = true;
      if (selectedStatus === "expired") {
        matchesStatus = item.daysRemaining <= 0;
      } else if (selectedStatus === "active") {
        matchesStatus = item.daysRemaining > 0;
      } else if (selectedStatus === "warning") {
        matchesStatus = item.daysRemaining > 0 && item.daysRemaining <= 10;
      }

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [initialClinics, searchQuery, selectedPlan, selectedStatus]);

  // ریست کردن به صفحه اول در زمان سرچ
  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClinics.slice(start, start + itemsPerPage);
  }, [filteredClinics, currentPage, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getPlanBadge = (plan: PlanType) => {
    switch (plan) {
      case "clinic":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 gap-1.5 px-2.5 py-0.5 text-xs font-medium">
            <Building2 className="w-3.5 h-3.5" />
            پلن کلینیک
          </Badge>
        );
      case "office":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-0 gap-1.5 px-2.5 py-0.5 text-xs font-medium">
            <Stethoscope className="w-3.5 h-3.5" />
            پلن مطب
          </Badge>
        );
      case "free":
        return (
          <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 border-0 gap-1.5 px-2.5 py-0.5 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            رایگان (آزمایشی)
          </Badge>
        );
    }
  };

  return (
    <Card className="border-border/60 shadow-sm" dir="rtl">
      {/* هدر و باکس جستجوی مدرن */}
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" />
              مدیریت و لیست مراکز و کلینیک‌ها
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              مشاهده وضعیت اشتراک، مشخصات مدیران مراکز، دسترسی به پنل و تمدید لایسنس
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">تعداد کل یافت شده:</span>
            <Badge variant="secondary" className="font-mono font-semibold text-xs px-2.5">
              {filteredClinics.length.toLocaleString("fa-IR")} مرکز
            </Badge>
          </div>
        </div>

        {/* نوار جستجوی پیشرفته با فیلتر سریع */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* باکس اینپوت سرچ خوشگل با سایه ظریف و افکت فوکوس */}
          <div className="relative flex-1 group">
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو با نام پزشک، نام کلینیک، شماره موبایل یا شهر..."
              className="h-10 pr-10 pl-4 text-xs sm:text-sm bg-muted/40 hover:bg-muted/60 focus:bg-background border-border/70 rounded-xl transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs px-1.5 py-0.5 rounded-md hover:bg-muted"
              >
                پاک کردن
              </button>
            )}
          </div>

          {/* فیلتر نوع پلن */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 text-xs bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
            >
              <option value="all">همه پلن‌ها</option>
              <option value="clinic">فقط پلن کلینیک</option>
              <option value="office">فقط پلن مطب</option>
              <option value="free">فقط پلن رایگان</option>
            </select>

            {/* فیلتر وضعیت انقضا */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 px-3 text-xs bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">اشتراک فعال</option>
              <option value="warning">نزدیک به انقضا (زیر ۱۰ روز)</option>
              <option value="expired">منقضی شده</option>
            </select>
          </div>
        </div>
      </CardHeader>

      {/* جدول نمایش لیست */}
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground text-xs font-semibold">
              <th className="py-3 px-4 w-14 text-center">شناسه</th>
              <th className="py-3 px-4">نام و نام خانوادگی / مرکز</th>
              <th className="py-3 px-4">شماره تماس</th>
              <th className="py-3 px-4 text-center">نوع پلن</th>
              <th className="py-3 px-4 text-center">وضعیت انقضا</th>
              <th className="py-3 px-4 text-center w-28">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {currentItems.length > 0 ? (
              currentItems.map((item) => {
                const isExpired = item.daysRemaining <= 0;
                const isUrgent = item.daysRemaining > 0 && item.daysRemaining <= 7;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* شناسه */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">
                      {item.id}
                    </td>

                    {/* نام پزشک و کلینیک */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {item.fullName.split(" ")[1]?.charAt(0) || "پ"}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                            <span>{item.fullName}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              ({item.city})
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.centerName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* شماره تماس */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-xs dir-ltr justify-end">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{item.phoneNumber}</span>
                      </div>
                    </td>

                    {/* نوع پلن */}
                    <td className="py-3.5 px-4 text-center">
                      {getPlanBadge(item.plan)}
                    </td>

                    {/* تعداد روز انقضا یا منقضی شده */}
                    <td className="py-3.5 px-4 text-center">
                      {isExpired ? (
                        <Badge
                          variant="destructive"
                          className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0 gap-1 px-2.5 py-0.5 text-xs font-semibold"
                        >
                          <ShieldAlert className="w-3 h-3 inline" />
                          منقضی شده
                        </Badge>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-semibold text-xs ${
                              isUrgent
                                ? "text-amber-600 dark:text-amber-400 font-bold"
                                : "text-foreground"
                            }`}
                          >
                            {item.daysRemaining.toLocaleString("fa-IR")} روز
                          </span>
                          <span className="text-[10px] text-muted-foreground">باقیمانده</span>
                        </div>
                      )}
                    </td>

                    {/* دکمه مدیریت */}
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onManageClinic?.(item)}
                        className="h-8 px-3 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground border-border/80 transition-all shadow-xs rounded-lg"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>مدیریت</span>
                      </Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <Search className="w-8 h-8 stroke-[1.5]" />
                    <p className="text-sm font-medium">هیچ مرکزی با شرایط وارد شده پیدا نشد</p>
                    <p className="text-xs">لطفاً عبارت جستجو یا فیلترهای انتخابی را تغییر دهید.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>

      {/* صفحه‌بندی (Pagination) */}
      <CardFooter className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          نمایش{" "}
          <span className="font-semibold text-foreground">
            {filteredClinics.length > 0
              ? ((currentPage - 1) * itemsPerPage + 1).toLocaleString("fa-IR")
              : 0}
          </span>{" "}
          تا{" "}
          <span className="font-semibold text-foreground">
            {Math.min(currentPage * itemsPerPage, filteredClinics.length).toLocaleString("fa-IR")}
          </span>{" "}
          از{" "}
          <span className="font-semibold text-foreground">
            {filteredClinics.length.toLocaleString("fa-IR")}
          </span>{" "}
          مرکز
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            title="صفحه اول"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="صفحه قبل"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1 px-2 font-mono text-xs">
            <span className="font-bold text-foreground">
              {currentPage.toLocaleString("fa-IR")}
            </span>
            <span>/</span>
            <span>{totalPages.toLocaleString("fa-IR")}</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="صفحه بعد"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="صفحه آخر"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
