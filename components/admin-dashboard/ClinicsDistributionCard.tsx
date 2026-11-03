"use client";

import React, { useState } from "react";
import { MapPin, Search, Building2, Stethoscope, ArrowUpDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface CityCoverage {
  city: string;
  province: string;
  clinics: number;
  offices: number;
  status: "active" | "growing" | "stable";
}

const defaultCities: CityCoverage[] = [
  { city: "تهران", province: "تهران", clinics: 48, offices: 215, status: "growing" },
  { city: "مشهد", province: "خراسان رضوی", clinics: 22, offices: 94, status: "growing" },
  { city: "اصفهان", province: "اصفهان", clinics: 18, offices: 72, status: "active" },
  { city: "شیراز", province: "فارس", clinics: 16, offices: 65, status: "active" },
  { city: "تبریز", province: "آذربایجان شرقی", clinics: 12, offices: 44, status: "stable" },
  { city: "اهواز", province: "خوزستان", clinics: 9, offices: 31, status: "stable" },
  { city: "کرج", province: "البرز", clinics: 11, offices: 38, status: "growing" },
  { city: "رشت", province: "گیلان", clinics: 6, offices: 30, status: "stable" },
];

export function ClinicsDistributionCard({ cities = defaultCities }: { cities?: CityCoverage[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = cities.filter(
    (c) => c.city.includes(searchTerm) || c.province.includes(searchTerm)
  );

  return (
    <Card className="border-border/60 shadow-sm flex flex-col h-full" dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              پراکندگی کلینیک‌ها و مطب‌ها به تفکیک شهر
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              آمار استقرار مراکز درمانی تحت پوشش سامانه در استان‌های مختلف
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="جستجوی شهر یا استان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pr-8 text-xs bg-muted/40"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        <div className="rounded-md border border-border/60 overflow-hidden">
          <table className="w-full text-xs text-right">
            <thead className="bg-muted/60 text-muted-foreground font-medium border-b border-border/60">
              <tr>
                <th className="py-2.5 px-3">شهر / استان</th>
                <th className="py-2.5 px-3 text-center">کلینیک‌های فعال</th>
                <th className="py-2.5 px-3 text-center">مطب‌های فعال</th>
                <th className="py-2.5 px-3 text-center">مجموع مراکز</th>
                <th className="py-2.5 px-3 text-center">وضعیت توسعه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((item) => {
                const total = item.clinics + item.offices;
                return (
                  <tr key={item.city} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{item.city}</span>
                        <span className="text-[11px] text-muted-foreground">({item.province})</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Building2 className="h-3 w-3" />
                        {item.clinics.toLocaleString("fa-IR")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                        <Stethoscope className="h-3 w-3" />
                        {item.offices.toLocaleString("fa-IR")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-foreground">
                      {total.toLocaleString("fa-IR")}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0 border-0 ${
                          item.status === "growing"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : item.status === "active"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.status === "growing" ? "رو به رشد" : item.status === "active" ? "فعال" : "پایدار"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    هیچ شهری با این عنوان یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
