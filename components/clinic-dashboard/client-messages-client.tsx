"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, RotateCcw, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { formatJalali } from "@/lib/jalali";
import { sendClientQuickSmsAction } from "@/app/clinic-dashboard/(dashboard)/clients/actions";

interface SmsLogItem {
  id: string;
  title: string;
  messageBody: string;
  status: string;
  sentAt: string;
}

export function ClientMessagesClient({
  client,
  smsLogs,
  canSendSms,
}: {
  client: { id: string; fullName: string; phone: string | null };
  smsLogs: SmsLogItem[];
  canSendSms: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const charCount = messageBody.length;
  const partsCount = Math.max(1, Math.ceil(charCount / 70));

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendClientQuickSmsAction({
        clientId: client.id,
        title,
        messageBody,
      });
      if (!res.success) {
        toast.error(res.error || "خطا در ارسال پیامک");
        return;
      }
      toast.success("پیامک با موفقیت ارسال و ثبت شد.");
      setIsOpen(false);
      setTitle("");
      setMessageBody("");
      router.refresh();
    });
  }

  function handleResend(log: SmsLogItem) {
    setTitle(log.title);
    setMessageBody(log.messageBody);
    setIsOpen(true);
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      {smsLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <MessageSquare className="mb-3 size-12 text-muted-foreground/50" />
          <p className="text-base font-medium">هنوز پیامکی برای این مراجع ارسال نشده است</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">عنوان</TableHead>
                <TableHead className="text-right">تاریخ</TableHead>
                <TableHead className="text-right">ساعت</TableHead>
                <TableHead className="text-right">متن پیام</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smsLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.title}</TableCell>
                  <TableCell>{formatJalali(new Date(log.sentAt))}</TableCell>
                  <TableCell>
                    {new Date(log.sentAt).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-pre-wrap text-xs">
                    {log.messageBody}
                  </TableCell>
                  <TableCell className="text-left">
                    {canSendSms && client.phone && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs"
                        onClick={() => handleResend(log)}
                      >
                        <RotateCcw className="size-3.5" />
                        ارسال مجدد
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canSendSms && client.phone && (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-40 size-13 rounded-full shadow-lg"
          title="ارسال پیامک فوری"
        >
          <Send className="size-5" />
        </Button>
      )}

      <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
        <ResponsiveDialogTrigger className="sr-only" tabIndex={-1} aria-hidden="true"/>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              ارسال پیامک فوری به {client.fullName}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              متن پیامک بلافاصله به شماره موبایل مراجع ارسال می‌شود.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <form onSubmit={handleSend} className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="size-3.5" />
                شماره موبایل مراجعه‌کننده:
              </span>
              <strong dir="ltr" className="font-mono">
                {client.phone}
              </strong>
            </div>

            <div className="space-y-1.5">
              <Label>عنوان *</Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: یادآوری جلسه ترمیم"
              />
            </div>

            <div className="space-y-1.5">
              <Label>متن پیام *</Label>
              <Textarea
                required
                rows={4}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="متن پیامک را وارد کنید..."
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{charCount.toLocaleString("fa-IR")} کاراکتر</span>
                <span>{partsCount.toLocaleString("fa-IR")} پیامک</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "در حال ارسال..." : "ارسال پیامک"}
            </Button>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}