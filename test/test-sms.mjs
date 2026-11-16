// test-sms.mjs
const API_KEY = "6344505467776F7462686931646276792F4D4C436A5358425777676257574D527764466F7964466D4650633D";
const TEMPLATE = "1559746";
const RECEPTOR = "09120085105"; // شماره تست خودتان
const TOKEN = "1234";

const url = `https://api.kavenegar.com/v1/${API_KEY}/verify/lookup.json?receptor=${RECEPTOR}&token=${TOKEN}&template=${TEMPLATE}`;

fetch(url)
  .then((res) => res.json())
  .then((json) => console.log("نتیجه کاوه‌نگار:", json))
  .catch((err) => console.error("خطای شبکه:", err));