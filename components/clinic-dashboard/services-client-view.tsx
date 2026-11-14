// components/clinic-dashboard/services-client-view.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Stethoscope,
  Pencil,
  Trash2,
  Users,
  Package,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TomanIcon } from "@/components/ui/toman-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServiceFormDialog } from "./service-form-dialog";
import { SubServiceFormDialog } from "./sub-service-form-dialog";
import {
  deleteServiceAction,
  deleteSubServiceAction,
  ServiceAttributeItem,
} from "@/app/clinic-dashboard/(dashboard)/services/actions";
import { toast } from "sonner";

export type ServiceWithDetails = {
  id: string;
  title: string;
  assignedStaff: {
    id: string;
    user: { id: string; fullName: string | null; phone: string };
    role: { name: string };
  }[];
  subServices: {
    id: string;
    title: string;
    price: number;
    attributes: unknown;
    defaultProducts: {
      id: string;
      quantity: number;
      clinicProduct: { id: string; name: string; unit: string };
    }[];
  }[];
};

interface ServicesClientViewProps {
  initialServices: ServiceWithDetails[];
  activeStaff: {
    id: string;
    hasAllServicesAccess?: boolean;
    user: { id: string; fullName: string | null; phone: string };
    role: { name: string };
  }[];
  clinicProducts: { id: string; name: string; unit: string }[];
  permissions?: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export function ServicesClientView({
  initialServices,
  activeStaff,
  clinicProducts,
  permissions = { canCreate: true, canEdit: true, canDelete: true },
}: ServicesClientViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // استیت مودال خدمت اصلی
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] =
    useState<ServiceWithDetails | null>(null);
  const [openItems, setOpenItems] = useState<string[]>(() =>
    initialServices.map((s) => s.id)
  );

  // استیت مودال زیرسرویس
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [targetService, setTargetService] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editingSubService, setEditingSubService] = useState<
    ServiceWithDetails["subServices"][number] | null
  >(null);

  // استیت دیالوگ تایید حذف
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "service" | "subService";
    id: string;
    title: string;
  } | null>(null);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialServices;

    return initialServices
      .map((service) => {
        const serviceMatches = service.title.toLowerCase().includes(q);
        const matchingSubs = service.subServices.filter((sub) =>
          sub.title.toLowerCase().includes(q)
        );

        if (serviceMatches) return service;
        if (matchingSubs.length > 0) {
          return { ...service, subServices: matchingSubs };
        }
        return null;
      })
      .filter((item): item is ServiceWithDetails => item !== null);
  }, [initialServices, searchQuery]);

  const handleOpenNewService = () => {
    if (!permissions.canCreate) return;
    setEditingService(null);
    setServiceDialogOpen(true);
  };

  const handleEditService = (service: ServiceWithDetails) => {
    if (!permissions.canEdit) return;
    setEditingService(service);
    setServiceDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.type === "service") {
      const res = await deleteServiceAction(target.id);
      if (res.success) {
        toast.success("خدمت حذف شد");
      } else {
        toast.error(res.error);
      }
    } else {
      const res = await deleteSubServiceAction(target.id);
      if (res.success) {
        toast.success("زیرسرویس حذف شد");
      } else {
        toast.error(res.error);
      }
    }
  };

  const handleOpenNewSubService = (service: ServiceWithDetails) => {
    if (!permissions.canCreate) return;
    setTargetService({ id: service.id, title: service.title });
    setEditingSubService(null);
    setSubDialogOpen(true);
  };

  const handleEditSubService = (
    service: ServiceWithDetails,
    sub: ServiceWithDetails["subServices"][number]
  ) => {
    if (!permissions.canEdit) return;
    setTargetService({ id: service.id, title: service.title });
    setEditingSubService(sub);
    setSubDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            خدمات و تعرفه‌های کلینیک
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            دسته‌بندی خدمات اصلی، زیرسرویس‌ها، قیمت‌گذاری و اقلام مصرفی پیش‌فرض
            را مدیریت کنید.
          </p>
        </div>

        {permissions.canCreate && (
          <Button onClick={handleOpenNewService} className="shrink-0 gap-2">
            <Plus className="size-4" />
            افزودن خدمت جدید
          </Button>
        )}
      </div>

      {/* نوار جستجو و آمار */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجو در نام خدمت یا زیرسرویس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
          <span>
            تعداد خدمات اصلی:{" "}
            <strong className="font-semibold text-foreground">
              {initialServices.length.toLocaleString("fa-IR")}
            </strong>
          </span>
          <span>•</span>
          <span>
            مجموع زیرسرویس‌ها:{" "}
            <strong className="font-semibold text-foreground">
              {initialServices
                .reduce((acc, s) => acc + s.subServices.length, 0)
                .toLocaleString("fa-IR")}
            </strong>
          </span>
        </div>
      </div>

      {/* لیست آکاردئونی خدمات */}
      {filteredServices.length === 0 ? (
        <Empty className="border bg-card py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Stethoscope className="size-5" />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery
                ? "خدمتی با این مشخصات پیدا نشد"
                : "هنوز خدمتی ثبت نشده است"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "عبارت جستجو را تغییر دهید یا خدمت جدیدی ایجاد کنید."
                : "برای شروع، اولین دسته‌بندی خدمت (مثلاً لیزر موهای زائد یا تزریق ژل) را ایجاد کنید."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {!searchQuery && permissions.canCreate && (
              <Button onClick={handleOpenNewService} className="gap-2">
                <Plus className="size-4" />
                ایجاد اولین خدمت
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <Accordion
          value={openItems}
          onValueChange={setOpenItems}
          className="space-y-4"
        >
          {filteredServices.map((service) => (
            <AccordionItem
              key={service.id}
              value={service.id}
              className="rounded-xl border bg-card px-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <AccordionTrigger className="flex-1 py-4 hover:no-underline">
                  <div className="flex flex-wrap items-center gap-3 text-right">
                    <span className="text-base font-bold">{service.title}</span>
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Layers className="size-3" />
                      {service.subServices.length.toLocaleString("fa-IR")}{" "}
                      زیرسرویس
                    </Badge>
                    {service.assignedStaff.length > 0 && (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Users className="size-3" />
                        {service.assignedStaff
                          .map((st) => st.user.fullName || st.user.phone)
                          .join("، ")}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>

                <div className="flex shrink-0 items-center gap-1">
                  {permissions.canCreate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNewSubService(service)}
                      className="h-8 gap-1 text-xs"
                    >
                      <Plus className="size-3.5" />
                      زیرسرویس
                    </Button>
                  )}
                  {permissions.canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditService(service)}
                      className="size-8"
                      title="ویرایش خدمت"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  {permissions.canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDeleteTarget({
                          type: "service",
                          id: service.id,
                          title: service.title,
                        })
                      }
                      className="size-8 text-destructive hover:text-destructive"
                      title="حذف خدمت"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <AccordionContent className="pt-1 pb-4">
                {service.subServices.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    هنوز زیرسرویسی برای این خدمت تعریف نشده است.{" "}
                    {permissions.canCreate && (
                      <button
                        type="button"
                        onClick={() => handleOpenNewSubService(service)}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        افزودن اولین زیرسرویس
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-right">
                            عنوان زیرسرویس
                          </TableHead>
                          <TableHead className="text-right">
                            تعرفه (مبنای فاکتور)
                          </TableHead>
                          <TableHead className="text-right">مشخصه‌ها</TableHead>
                          <TableHead className="text-right">
                            مصرفی دیفالت
                          </TableHead>
                          {(permissions.canEdit || permissions.canDelete) && (
                            <TableHead className="w-24 text-left">
                              عملیات
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {service.subServices.map((sub) => {
                          const attrs = Array.isArray(sub.attributes)
                            ? (sub.attributes as ServiceAttributeItem[])
                            : [];

                          return (
                            <TableRow key={sub.id}>
                              <TableCell className="font-medium">
                                {sub.title}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 font-semibold tabular-nums">
                                  {sub.price.toLocaleString("fa-IR")}
                                  <TomanIcon className="size-3.5 text-muted-foreground" />
                                </div>
                              </TableCell>
                              <TableCell>
                                {attrs.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {attrs.map((a, i) => (
                                      <Badge
                                        key={i}
                                        variant="secondary"
                                        className="text-xs font-normal"
                                      >
                                        {a.key}: {a.value}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {sub.defaultProducts.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {sub.defaultProducts.map((dp) => (
                                      <Badge
                                        key={dp.id}
                                        variant="outline"
                                        className="gap-1 text-xs font-normal"
                                      >
                                        <Package className="size-3 text-muted-foreground" />
                                        {dp.clinicProduct.name} (
                                        {dp.quantity.toLocaleString("fa-IR")}{" "}
                                        {dp.clinicProduct.unit})
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              {(permissions.canEdit ||
                                permissions.canDelete) && (
                                <TableCell className="text-left">
                                  <div className="flex items-center justify-end gap-1">
                                    {permissions.canEdit && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleEditSubService(service, sub)
                                        }
                                        className="size-8"
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                    )}
                                    {permissions.canDelete && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: "subService",
                                            id: sub.id,
                                            title: sub.title,
                                          })
                                        }
                                        className="size-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* مودال ایجاد / ویرایش خدمت اصلی */}
      <ServiceFormDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        editingService={editingService}
        activeStaff={activeStaff}
      />

      {/* مودال ایجاد / ویرایش زیرسرویس */}
      {targetService && (
        <SubServiceFormDialog
          open={subDialogOpen}
          onOpenChange={setSubDialogOpen}
          serviceId={targetService.id}
          serviceTitle={targetService.title}
          editingSubService={editingSubService}
          clinicProducts={clinicProducts}
        />
      )}

      {/* دیالوگ تایید حذف خدمت یا زیرسرویس */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "service"
                ? "حذف خدمت اصلی"
                : "حذف زیرسرویس"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف <strong>«{deleteTarget?.title}»</strong>{" "}
              {deleteTarget?.type === "service" &&
                "و تمام زیرسرویس‌های زیرمجموعه آن "}
              مطمئن هستید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              تایید و حذف
            </AlertDialogAction>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}