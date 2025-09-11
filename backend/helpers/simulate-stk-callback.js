/**
 * DEV ONLY
 * This script simulates an STK Push callback to update user balances in development.
 * Safe for testing — does NOT involve real MPESA payments.
 * Usage: node helpers/simulate-stk-callback.js <PHONE_NUMBER> <AMOUNT>
 */

const axios = require("axios");

// ---------- CONFIG ----------
const BACKEND_URL = "http://localhost:5000/api/stk-callback"; // change if your backend runs elsewhere

// ---------- READ CLI ARGUMENTS ----------
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node simulate-stk-callback.js <PHONE_NUMBER> <AMOUNT>");
  process.exit(1);
}

const TEST_PHONE = args[0]; // e.g., 254712345678 or 0712345678
const AMOUNT = parseFloat(args[1]);

if (isNaN(AMOUNT) || AMOUNT <= 0) {
  console.error("Amount must be a positive number");
  process.exit(1);
}

// Normalize phone to 2547XXXXXXXX format
let formattedPhone = TEST_PHONE.startsWith("07")
  ? "254" + TEST_PHONE.slice(1)
  : TEST_PHONE.startsWith("+254")
  ? TEST_PHONE.slice(1)
  : TEST_PHONE;

// ---------- FAKE CALLBACK PAYLOAD ----------
const fakeCallbackPayload = {
  Body: {
    stkCallback: {
      MerchantRequestID: "DEV12345",
      CheckoutRequestID: "DEV_CO_" + Date.now(),
      ResultCode: 0, // 0 = success
      ResultDesc: "Simulated payment successful",
      CallbackMetadata: {
        Item: [
          { Name: "Amount", Value: AMOUNT },
          { Name: "MpesaReceiptNumber", Value: "DEV123456" },
          { Name: "TransactionDate", Value: Number(Date.now()) },
          { Name: "PhoneNumber", Value: formattedPhone },
        ],
      },
    },
  },
};

// ---------- SIMULATE CALLBACK ----------
async function simulateCallback() {
  try {
    const res = await axios.post(BACKEND_URL, fakeCallbackPayload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(
      `Callback simulated successfully: ${AMOUNT} added to ${TEST_PHONE}`
    );
    console.log(res.data);
  } catch (err) {
    console.error("Error simulating callback:", err.response?.data || err.message);
  }
}

simulateCallback();
