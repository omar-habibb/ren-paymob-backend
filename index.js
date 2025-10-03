require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

function isSafeInput(value) {
  if (typeof value !== 'string') return true;
  const v = value.trim();
  if (/^[=+\-@]/.test(v)) return false;   // starts with =, +, -, @
  if (/<\s*script/i.test(v)) return false; // contains <script>
  return true;
}


const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// Show this message if someone visits the backend in a browser
app.get('/', (req, res) => {
  res.send('Backend is alive 🧠');
});

app.post('/start-renewal', async (req, res) => {
  try {
    const { id,amount} = req.body;

    if (!isSafeInput(id)) {
  console.warn(`⚠️ Blocked suspicious ID input: ${id}`);
  return res.status(200).json({ success: true, message: "ok" });
}

    
    const sheetResp = await axios.get(`${GOOGLE_SCRIPT_URL}?id=${encodeURIComponent(id)}`, {
      headers: { "Accept": "application/json" }
    });
    
    const sheetData = sheetResp.data || {};
    if (sheetData.error) return res.status(404).json({ error: "ID doesn't exist. Please check Your Id and try again. " });
    const phone ="+20"+sheetData.phone;
    const email = sheetData.email;
    const billing_data = {
    "apartment": "NA",
    "email": email,
    "floor": "NA",
    "first_name": id,
    "street": "NA",
    "building": "NA",
    "phone_number": phone,
    "shipping_method": "NA",
    "postal_code": "NA",
    "city": "Cairo",
    "country": "EG",
    "last_name": "Renewal",
    "state": "NA"}

  const intentionPayload = {
  amount,
  currency: "EGP",
  payment_methods: ["card",parseInt(process.env.PAYMOB_INTEGRATION_ID)],
  billing_data,
  items: [],
  redirection_url: "https://omar-habibb.github.io/optimum-auto/renthankyou.html",
  notification_url: "https://omar-habibb.github.io/optimum-auto/reasnt.html"
  }


    const response = await axios.post(
      "https://accept.paymob.com/v1/intention/",
      intentionPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYMOB_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const { client_secret } = response.data;

    if (client_secret) {
      const checkout_url = `https://accept.paymob.com/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY}&clientSecret=${client_secret}`;
      res.json({ checkout_url });
    } else {
      res.status(400).json({ error: "Missing client_secret in response." });
    }
} catch (error) {
  console.error("❌ Paymob Error ❌");

  let errorDetails;

  if (error.response) {
    console.error("Status:", error.response.status);
    console.error("Data:", error.response.data);
    errorDetails = error.response.data;
  } else {
    console.error("Error:", error.message);
    errorDetails = error.message;
  }

  // Only send a response if one hasn’t been sent yet
  if (!res.headersSent) {
    res.status(500).json({ error: errorDetails });
  }
}


});

// This line is very important for Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running`);
});

