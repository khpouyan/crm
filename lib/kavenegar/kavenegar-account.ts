export interface KavenegarAccountResponse {
  return: {
    status: number;
    message: string;
  };
  entries: {
    remaincredit: number;
    expiredate: number;
    type: 'master' | 'child';
  };
}
export async function getAccountInfo(): Promise<KavenegarAccountResponse> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  if (!apiKey) throw new Error("KAVENEGAR_API_KEY is not set");

  const url = `https://api.kavenegar.com/v1/${apiKey}/account/info.json`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: KavenegarAccountResponse = await response.json();

  if (data.return.status !== 200) {
    throw new Error(`Kavenegar Error: ${data.return.message}`);
  }

  return data;
}

