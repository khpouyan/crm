"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus, Trash2, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { formatJalali } from "@/lib/jalali";
import {
  addClientAttachmentAction,
  deleteClientAttachmentAction,
} from "@/app/clinic-dashboard/(dashboard)/clients/actions";

interface AttachmentItem {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

const FILE_TYPES = [
  { value: "IMAGE", label: "تصویر (قبل و بعد / مدارک)" },
  { value: "PDF", label: "فایل PDF / آزمایش" },
  { value: "OTHER", label: "سایر فایل‌ها" },
];

export function ClientAttachmentsClient({
  clientId,
  attachments,
  canEdit,
}: {
  clientId: string;
  attachments: AttachmentItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("IMAGE");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("حداکثر حجم فایل ۴ مگابایت است.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileUrl(reader.result);
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await addClientAttachmentAction({
        clientId,
        title,
        fileUrl,
        fileType,
      });
      if (!res.success) {
        toast.error(res.error || "خطا در افزودن ضمیمه");
        return;
      }
      toast.success("ضمیمه با موفقیت ثبت شد.");
      setIsOpen(false);
      setTitle("");
      setFileUrl("");
      router.refresh();
    });
  }

  function handleDelete(attachmentId: string) {
    startTransition(async () => {
      const res = await deleteClientAttachmentAction(clientId, attachmentId);
      if (res.success) {
        toast.success("ضمیمه حذف شد.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      {attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <Paperclip className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-base font-medium">هیچ ضمیمه‌ای موجود نیست</p>
          <p className="mt-1 text-xs text-muted-foreground">
            فایل‌ها و تصاویر آپلودشده در اینجا نمایش داده می‌شوند.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    {att.fileType === "IMAGE" ? (
                      <ImageIcon className="size-4 text-primary" />
                    ) : (
                      <FileText className="size-4 text-primary" />
                    )}
                    <span>{att.title}</span>
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={() => handleDelete(att.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>

                {att.fileType === "IMAGE" && att.fileUrl.startsWith("data:image") && (
                  <img
                    src={att.fileUrl}
                    alt={att.title}
                    className="h-36 w-full rounded-lg object-cover"
                  />
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{formatJalali(new Date(att.createdAt))}</span>
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={att.title}
                  className="flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  مشاهده / دانلود
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
          title="افزودن ضمیمه جدید"
        >
          <Plus className="size-6" />
        </Button>
      )}

      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
       <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true"/>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>افزودن ضمیمه جدید</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              تصاویر قبل و بعد یا مدارک پزشکی مراجع را بارگذاری کنید.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>عنوان ضمیمه *</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: تصویر قبل از تزریق"
              />
            </div>

            <div className="space-y-1.5">
              <Label>نوع فایل</Label>
              <Select
                value={fileType}
                items={FILE_TYPES}
                onValueChange={(v) => setFileType(v || "IMAGE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>انتخاب فایل *</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending || !fileUrl}>
              {isPending ? "در حال ثبت..." : "افزودن ضمیمه"}
            </Button>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}