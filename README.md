# GuardianPay AI 🛡️

GuardianPay AI is a financial security and oversight platform designed to protect elderly users from online scams, predatory subscriptions, and unauthorized high-value charges. It acts as an intelligent intermediary between a senior's payment gateway (such as PayPal) and real-world transactions, leveraging AI fraud analysis and automated guardian notifications.

---

## Key Features

- **Passwordless Mobile Login:** Secure authentication flow for family members (guardians) via simulated SMS OTP verification.
- **Dual Checkout & Simulation Mode:** 
  - Integrated official **PayPal & Debit/Credit Card SDK** for live sandbox testing.
  - A custom transaction simulator to test arbitrary merchants, amounts, and phone numbers.
- **AI Fraud Analysis Engine:** Uses OpenAI to evaluate merchant intent and transaction context in real-time, instantly categorizing risk levels (Low vs. High).
- **Automated Guardian Alerts:** Dispatches simulated SMS emergency warnings directly to the adult child or caregiver's phone when suspicious activity is detected.
- **Interactive Scam Prevention:** Allows guardians to instantly trigger block/freeze agreements via PayPal.
- **Real-Time Audit Trail:** Live table tracking all evaluated transactions with timestamps, risk levels, and status logs.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **APIs & SDKs:** PayPal REST API (Sandbox), OpenAI API (`gpt-4o-mini`)
- **Frontend:** HTML5, Vanilla JavaScript, Responsive CSS (Fintech SaaS UI)
- **Environment Management:** `dotenv`

---

## Project Structure

```text
guardianpay-backend/
├── public/
│   └── index.html      # Frontend dashboard & UI
├── .env                # Environment variables (API keys)
├── package.json        # Project dependencies
└── server.js           # Express server, PayPal & OpenAI routes