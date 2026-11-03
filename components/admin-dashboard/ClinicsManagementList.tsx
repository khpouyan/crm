"use client";

import { useRouter } from "next/navigation"
import React, { useState, useMemo } from "react";
import {
  Search,
  Phone,
  Building2,
  Stethoscope,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Settings,
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
  daysRemaining: number;
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
];

export interface ClinicListProps {
  initialClinics?: ClinicUser[];
  onManageClinic?: (clinic: ClinicUser) => void;
}

export function ClinicsManagementList({
  initialClinics = sampleClinics,
  onManageClinic,
}: ClinicListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  const handleRowManage = (clinic: ClinicUser) => {
    if (onManageClinic) {
      onManageClinic(clinic);
    } else {
      router.push(`/admin-dashboard/clinics/${clinic.id}`);
    }
  };

  const getPlanBadge = (plan: PlanType) => {
    switch (plan) {
      case "clinic":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0 gap-1.5 px-2.5 py-0.5 text-xs"><Building2 className="w-3.5 h-3.5" />پلن کلینیک</Badge>;
      case "office":
        return <Badge className="bg-blue-500/10 text-blue-600 border-0 gap-1.5 px-2.5 py-0.5 text-xs"><Stethoscope className="w-3.5 h-3.5" />پلن مطب</Badge>;
      case "free":
        return <Badge className="bg-slate-500/10 text-slate-600 border-0 gap-1.5 px-2.5 py-0.5 text-xs"><Sparkles className="w-3.5 h-3.5" />رایگان</Badge>;
    }
  };

  return (
    <Card className="border-border/60 shadow-sm" dir="rtl">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-primary" />
              مدیریت و لیست مراکز و کلینیک‌ها
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              مشاهده وضعیت اشتراک، مشخصات مدیران مراکز و تمدید لایسنس
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs px-2.5">
            {filteredClinics.length.toLocaleString("fa-IR")} مرکز
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="جستجو با نام پزشک، نام کلینیک، شماره موبایل یا شهر..."
              className="h-10 pr-10 pl-4 text-xs sm:text-sm bg-muted/40 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={selectedPlan}
              onChange={(e) => { setSelectedPlan(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 text-xs bg-muted/40 border border-border/70 rounded-xl"
            >
              <option value="all">همه پلن‌ها</option>
              <option value="clinic">فقط کلینیک</option>
              <option value="office">فقط مطب</option>
              <option value="free">فقط رایگان</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="h-10 px-3 text-xs bg-muted/40 border border-border/70 rounded-xl"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="warning">زیر ۱۰ روز</option>
              <option value="expired">منقضی شده</option>
            </select>
          </div>
        </div>
      </CardHeader>

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
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-muted-foreground">{item.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{item.fullName} <span className="text-muted-foreground text-xs font-normal">({item.city})</span></div>
                      <div className="text-xs text-muted-foreground">{item.centerName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs dir-ltr justify-end text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{item.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">{getPlanBadge(item.plan)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {isExpired ? (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-0 gap-1 px-2.5 py-0.5 text-xs">
                          <ShieldAlert className="w-3 h-3 inline" />
                          منقضی شده
                        </Badge>
                      ) : (
                        <span className="font-semibold text-xs text-foreground">{item.daysRemaining.toLocaleString("fa-IR")} روز</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRowManage(item)}
                        className="h-8 px-3 text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground rounded-lg"
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
                <td colSpan={6} className="py-12 text-center text-muted-foreground">هیچ مرکزی با شرایط وارد شده پیدا نشد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>

      <CardFooter className="p-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          صفحه {currentPage.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(1)} disabled={currentPage === 1}><ChevronsRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}><ChevronsLeft className="w-4 h-4" /></Button>
        </div>
      </CardFooter>
    </Card>
  );
}