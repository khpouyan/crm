// lib/kavenegar/kavenegar.ts
import { normalizeIranPhone } from "@/lib/iranian-mobile";

export interface SendOTPParams {
  receptor: string;
  token: string;
  template?: string;
  token2?: string;
  token3?: string;
  type?: "sms" | "call";
  tag?: string;
}

export interface KavenegarResponse {
  return: {
    status: number;
    message: string;
  };
  entries?: Array<{
    messageid: number;
    message: string;
    status: number;
    statustext: string;
    sender: string;
    receptor: string;
    date: number;
    cost: number;
  }>;
}

/**
 * تبدیل اعداد فارسی و عربی به انگلیسی (مناسب برای کد OTP، کد ملی، قیمت و...)
 */
export function toEnglishDigits(input: string): string {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];

  let normalized = input.trim();
  for (let i = 0; i < 10; i++) {
    normalized = normalized
      .replace(persianDigits[i], i.toString())
      .replace(arabicDigits[i], i.toString());
  }
  return normalized;
}

export async function sendOTPWithKavenegar(
  params: SendOTPParams
): Promise<KavenegarResponse> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const defaultTemplate = params.template ?? process.env.KAVENEGAR_VERIFY_TEMPLATE;

  if (!apiKey) throw new Error("KAVENEGAR_API_KEY در فایل env تنظیم نشده است.");
  if (!defaultTemplate) {
    throw new Error("KAVENEGAR_VERIFY_TEMPLATE در فایل env تنظیم نشده است.");
  }

  const baseUrl = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;
  const searchParams = new URLSearchParams({
    receptor: normalizeIranPhone(params.receptor),
    token: toEnglishDigits(params.token),
    template: defaultTemplate,
  });

  if (params.token2) searchParams.set("token2", params.token2);
  if (params.token3) searchParams.set("token3", params.token3);
  if (params.type) searchParams.set("type", params.type);
  if (params.tag) searchParams.set("tag", params.tag);

  const response = await fetch(`${baseUrl}?${searchParams.toString()}`, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  const data: KavenegarResponse | null = await response.json().catch(() => null);

  if (!response.ok || data?.return?.status !== 200) {
    const kavenegarMsg = data?.return?.message;
    throw new Error(
      kavenegarMsg
        ? `خطای سرویس پیامک: ${kavenegarMsg}`
        : `خطای ارتباط با کاوه‌نگار (${response.status})`
    );
  }

  return data;
}