// app/api/clinic-dashboard/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  generateExportPayload,
  ExportEntityType,
  ExportFormat,
} from "@/lib/export/data-export";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") as ExportEntityType | null;
    const format = (searchParams.get("format") || "XLSX").toUpperCase() as ExportFormat;

    if (!entity) {
      return NextResponse.json(
        { error: "نوع خروجی مشخص نشده است." },
        { status: 400 }
      );
    }

    const { rows, fileNamePrefix } = await generateExportPayload(
      entity,
      format,
      {
        from: searchParams.get("from") || undefined,
        to: searchParams.get("to") || undefined,
        serviceId: searchParams.get("serviceId") || undefined,
        staffId: searchParams.get("staffId") || undefined,
      }
    );

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "JSON") {
      const jsonContent = JSON.stringify(rows, null, 2);
      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileNamePrefix}-${timestamp}.json"`,
        },
      });
    }

    // ساخت فایل اکسل (XLSX) با راست‌به‌چپ کردن شیت
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!views"] = [{ rightToLeft: true }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileNamePrefix}-${timestamp}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "خطا در تولید فایل خروجی" },
      { status: 403 }
    );
  }
}
