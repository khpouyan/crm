const apiKey = '6344505467776F7462686931646276792F4D4C436A5358425777676257574D527764466F7964466D4650633D';
const url = `https://api.kavenegar.com/v1/${apiKey}/account/info.json`;

async function getAccountInfo() {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.return.status === 200) {
      const { remaincredit, expiredate, type } = data.entries;
      console.log(`اعتبار باقی‌مانده: ${remaincredit.toLocaleString()} ریال (${(remaincredit / 10).toLocaleString()} تومان)`);
      console.log(`نوع حساب: ${type}`);
      console.log(`تاریخ انقضا (Timestamp): ${expiredate}`);
    } else {
      console.error('خطای کاوه‌نگار:', data.return.message);
    }
  } catch (error) {
    console.error('خطا در ارتباط با سرور:', error);
  }
}

getAccountInfo();