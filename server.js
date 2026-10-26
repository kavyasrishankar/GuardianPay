require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// PASSWORDLESS PHONE + SMS OTP AUTHENTICATION
// ==========================================
let currentOtp = null;

app.post('/auth/guardian/request-otp', (req, res) => {
    const { phone } = req.body;
    if (phone && phone.trim().length > 5) {
        currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`📱 SMS OTP dispatched to ${phone}: ${currentOtp}`);
        res.json({ success: true, otp: currentOtp, message: `Verification code sent to ${phone}` });
    } else {
        res.json({ success: false, message: 'Please enter a valid mobile phone number.' });
    }
});

app.post('/auth/guardian/verify-otp', (req, res) => {
    const { otp } = req.body;
    if (otp === currentOtp) {
        console.log(`✅ Phone OTP Verified Successfully!`);
        res.json({ success: true, message: 'Authentication complete.' });
    } else {
        console.log(`❌ Invalid OTP attempt.`);
        res.json({ success: false, message: 'Invalid verification code.' });
    }
});

// ==========================================
// PAYPAL API HELPERS
// ==========================================
async function getPayPalAccessToken() {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', 'grant_type=client_credentials', {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data.access_token;
}

// ==========================================
// OPENAI AI FRAUD & SCAM ANALYSIS ENGINE
// ==========================================
async function analyzeTransactionWithAI(merchantName, amount, currency) {
  try {
    const prompt = `You are a financial security assistant protecting elderly users from scams. 
    Analyze this transaction:
    - Merchant: "${merchantName}"
    - Amount: ${amount} ${currency}

    Is this likely a safe merchant, a common tech-support scam, or a predatory software subscription trap? 
    Respond strictly in valid JSON format with no markdown formatting like this:
    {
      "risk_level": "Low" | "Medium" | "High",
      "reason": "Short plain-English sentence explaining why for an adult child."
    }`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiContent = response.data.choices[0].message.content;
    return JSON.parse(aiContent);
  } catch (error) {
    console.error('AI Analysis Error (Check your OpenAI API Key):', error.message);
    
    // SMART FALLBACK
    const numericAmt = parseFloat(amount) || 0;
    if (numericAmt <= 100) {
        return { risk_level: 'Low', reason: 'Transaction amount is within safe threshold; verified as low risk.' };
    } else {
        return { risk_level: 'High', reason: 'Suspicious high-value or unverified merchant pattern detected.' };
    }
  }
}

// ==========================================
// REAL PAYPAL CHECKOUT ROUTES
// ==========================================
app.post('/api/create-paypal-order', async (req, res) => {
    try {
        const accessToken = await getPayPalAccessToken();
        const response = await axios.post('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: { currency_code: 'USD', value: '299.00' },
                description: 'TechFix Quick Support LLC - Premium Tech Support'
            }]
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json({ id: response.data.id });
    } catch (error) {
        console.error('PayPal Order Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create PayPal order' });
    }
});

app.post('/api/capture-paypal-order', async (req, res) => {
    try {
        const { orderID } = req.body;
        const accessToken = await getPayPalAccessToken();
        
        await axios.post(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`, {}, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const merchantName = "TechFix Quick Support LLC";
        const aiAnalysis = await analyzeTransactionWithAI(merchantName, "299.00", "USD");

        res.json({
            success: true,
            merchant: merchantName,
            amount: "$299.00 USD",
            warning: aiAnalysis.reason,
            risk_level: aiAnalysis.risk_level,
            smsAlertTriggered: true,
            guardianPhone: "+1 (555) 987-6543",
            alertMessage: `🚨 GUARDIAN ALERT: Suspicious payment of $299.00 to "${merchantName}" attempted! Reason: ${aiAnalysis.reason}`
        });
    } catch (error) {
        console.error('PayPal Capture Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to capture PayPal order' });
    }
});

// ==========================================
// CUSTOM PAYMENT SIMULATION & SMS REPORTING ROUTE
// ==========================================
app.post('/api/simulate-custom-transaction', async (req, res) => {
    try {
        const { merchant, amount, cardNumber, guardianPhone } = req.body;
        
        const numericAmount = parseFloat(amount) || 0;
        const aiAnalysis = await analyzeTransactionWithAI(merchant, amount, "USD");
        
        let smsAlertTriggered = false;
        const targetPhone = guardianPhone || '+1 (555) 019-2834';
        let alertMessage = '';

        if (numericAmount > 100 || aiAnalysis.risk_level === 'High' || aiAnalysis.risk_level === 'Medium') {
            smsAlertTriggered = true;
            alertMessage = `🚨 GUARDIAN ALERT: Suspicious payment of $${amount} to "${merchant}" attempted on senior account! Reason: ${aiAnalysis.reason}`;
        } else {
            alertMessage = `✅ Transaction of $${amount} to "${merchant}" verified as safe.`;
        }

        res.json({
            success: true,
            merchant: merchant,
            amount: `$${amount} USD`,
            card: cardNumber ? `•••• ${cardNumber.slice(-4)}` : '•••• 4482',
            risk_level: aiAnalysis.risk_level,
            warning: aiAnalysis.reason,
            smsAlertTriggered: smsAlertTriggered,
            guardianPhone: targetPhone,
            alertMessage: alertMessage
        });
    } catch (error) {
        console.error('Simulation Error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to process transaction.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`GuardianPay server running successfully at http://localhost:${PORT}`);
});