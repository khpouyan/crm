export interface SendOTPParams {
  receptor: string;
  token: string;
  template?: string; // overrides KAVENEGAR_VERIFY_TEMPLATE env var
  token2?: string;
  token3?: string;
  token10?: string;
  token20?: string;
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
export async function sendOTPWithKavenegar(
  params: SendOTPParams
): Promise<KavenegarResponse> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const defaultTemplate = process.env.KAVENEGAR_VERIFY_TEMPLATE;
  if (!apiKey) throw new Error("KAVENEGAR_API_KEY is not set");
  if (!defaultTemplate) throw new Error("KAVENEGAR_VERIFY_TEMPLATE is not set");
  const baseUrl = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;
  const searchParams = new URLSearchParams({
    receptor: params.receptor.replace(/\s/g, ""),
    token: params.token,
    template: params.template ?? defaultTemplate,
  });
  if (params.token2) searchParams.set("token2", params.token2);
  if (params.token3) searchParams.set("token3", params.token3);
  if (params.token10) searchParams.set("token10", params.token10);
  if (params.token20) searchParams.set("token20", params.token20);
  if (params.type) searchParams.set("type", params.type);
  if (params.tag) searchParams.set("tag", params.tag);
  const response = await fetch(`${baseUrl}?${searchParams.toString()}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(
      `Kavenegar HTTP error: ${response.status} ${response.statusText}`
    );
  }
  const data: KavenegarResponse = await response.json();
  if (data.return?.status !== 200) {
    throw new Error(
      `Kavenegar rejected request: ${data.return?.message ?? "Unknown error"}`
    );
  }
  return data;
}
/** Normalises a phone number to the format Kavenegar expects. */
export function toKavenegarReceptor(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  // Iranian mobile: 989xxxxxxxxx → 09xxxxxxxxx
  if (cleaned.startsWith("98") && cleaned.length === 12) {
    return `0${cleaned.slice(2)}`;
  }
  // Already local Iranian format
  if (cleaned.startsWith("09") && cleaned.length === 11) {
    return cleaned;
  }
  // International: ensure 00 prefix
  if (cleaned.startsWith("00")) return cleaned;
  return `00${cleaned}`;
}

