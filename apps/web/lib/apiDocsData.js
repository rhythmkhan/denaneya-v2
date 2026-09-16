"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ENDPOINTS = void 0;
exports.API_ENDPOINTS = [
    {
        id: 'create-invoice',
        method: 'POST',
        path: '/api/invoices',
        title: '1. Create Dynamic Payment Invoice',
        description: 'Generates a new invoice with a 15-minute TTL and returns a hosted checkout URL for the customer.',
        requiresAuth: true,
        headers: [
            { key: 'Content-Type', value: 'application/json', description: 'Standard JSON content type' },
            { key: 'Authorization', value: 'Bearer <merchant_jwt_token>', description: 'Merchant authentication JWT or API key' },
            { key: 'x-brand-id', value: 'd8f22d88-0353-457a-bed1-ff1e5cda7f11', description: 'Target merchant brand UUID' }
        ],
        requestBodySchema: [
            { field: 'amount', type: 'number', required: true, description: 'Payable amount in BDT (must be greater than 0)' },
            { field: 'customer_name', type: 'string', required: true, description: 'Full name of the paying customer' },
            { field: 'customer_phone', type: 'string', required: false, description: 'Customer phone number (e.g. 01712345678)' },
            { field: 'customer_email', type: 'string', required: false, description: 'Customer email address for receipts' },
            { field: 'redirect_url', type: 'string', required: false, description: 'URL to redirect customer after successful verification' },
            { field: 'metadata', type: 'object', required: false, description: 'Custom metadata passed back in webhook payload' }
        ],
        requestBodyExample: {
            amount: 1250,
            customer_name: 'Rafiqul Islam',
            customer_phone: '01712345678',
            customer_email: 'rafiq@example.com',
            redirect_url: 'https://myshop.com.bd/orders/1089/success',
            metadata: {
                order_id: 'ORD-1089',
                package: 'Full Stack Course'
            }
        },
        snippets: {
            curl: `curl -X POST https://api.denaneya.com/api/invoices \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <MERCHANT_TOKEN>" \\
  -H "x-brand-id: d8f22d88-0353-457a-bed1-ff1e5cda7f11" \\
  -d '{
    "amount": 1250,
    "customer_name": "Rafiqul Islam",
    "customer_phone": "01712345678",
    "customer_email": "rafiq@example.com",
    "redirect_url": "https://myshop.com.bd/orders/1089/success",
    "metadata": { "order_id": "ORD-1089" }
  }'`,
            nodejs: `const axios = require('axios');

async function createPaymentInvoice() {
  const response = await axios.post('https://api.denaneya.com/api/invoices', {
    amount: 1250,
    customer_name: 'Rafiqul Islam',
    customer_phone: '01712345678',
    customer_email: 'rafiq@example.com',
    redirect_url: 'https://myshop.com.bd/orders/1089/success',
    metadata: { order_id: 'ORD-1089' }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_MERCHANT_TOKEN',
      'x-brand-id': 'YOUR_BRAND_ID'
    }
  });

  console.log('Checkout URL:', response.data.payment_url);
  return response.data;
}`,
            python: `import requests

url = "https://api.denaneya.com/api/invoices"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_MERCHANT_TOKEN",
    "x-brand-id": "YOUR_BRAND_ID"
}
payload = {
    "amount": 1250,
    "customer_name": "Rafiqul Islam",
    "customer_phone": "01712345678",
    "customer_email": "rafiq@example.com",
    "redirect_url": "https://myshop.com.bd/orders/1089/success",
    "metadata": {"order_id": "ORD-1089"}
}

response = requests.post(url, json=payload, headers=headers)
print("Response:", response.json())`,
            php: `<?php
$ch = curl_init('https://api.denaneya.com/api/invoices');
$payload = json_encode([
    'amount' => 1250,
    'customer_name' => 'Rafiqul Islam',
    'customer_phone' => '01712345678',
    'customer_email' => 'rafiq@example.com',
    'redirect_url' => 'https://myshop.com.bd/orders/1089/success',
    'metadata' => ['order_id' => 'ORD-1089']
]);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer YOUR_MERCHANT_TOKEN',
        'x-brand-id: YOUR_BRAND_ID'
    ]
]);

$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
echo "Payment URL: " . $data['payment_url'];
?>`
        },
        responses: [
            {
                status: 201,
                title: '201 Created',
                body: {
                    success: true,
                    invoice_id: 'inv_8f93bc42-9a10-410c-99bc-19b02a901f4c',
                    invoice_number: 'INV-2026-0042',
                    amount: 1250,
                    currency: 'BDT',
                    status: 'PENDING',
                    payment_url: 'https://checkout.denaneya.com/pay/inv_8f93bc42-9a10-410c-99bc-19b02a901f4c',
                    expires_at: '2026-09-16T08:25:00.000Z'
                }
            },
            {
                status: 400,
                title: '400 Bad Request',
                body: {
                    success: false,
                    code: 'VALIDATION_ERROR',
                    message: 'Amount must be greater than 0'
                }
            }
        ]
    },
    {
        id: 's2s-verify-trx',
        method: 'POST',
        path: '/v1/trx/verify',
        title: '2. S2S Step 1: Verify & Reserve Transaction',
        description: 'Direct server-to-server verification endpoint. Verifies that an authentic UNUSED transaction exists matching the exact amount and deducts 1 merchant credit.',
        requiresAuth: true,
        headers: [
            { key: 'Content-Type', value: 'application/json', description: 'Standard JSON content type' },
            { key: 'X-API-KEY', value: 'dn_live_9b4e82...', description: 'Brand API Key' },
            { key: 'X-API-SECRET', value: 'dn_sec_31a7c0...', description: 'Brand API Secret' }
        ],
        requestBodySchema: [
            { field: 'trx_id', type: 'string', required: true, description: 'MFS Transaction ID provided by customer (e.g. 75TD2K9J)' },
            { field: 'amount', type: 'number', required: true, description: 'Expected amount in BDT for validation' }
        ],
        requestBodyExample: {
            trx_id: '75TD2K9J',
            amount: 1250
        },
        snippets: {
            curl: `curl -X POST https://api.denaneya.com/v1/trx/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "X-API-SECRET: YOUR_API_SECRET" \\
  -d '{
    "trx_id": "75TD2K9J",
    "amount": 1250
  }'`,
            nodejs: `const axios = require('axios');

async function verifyCustomerTransaction(trxId, expectedAmount) {
  const response = await axios.post('https://api.denaneya.com/v1/trx/verify', {
    trx_id: trxId,
    amount: expectedAmount
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.DENANEYA_API_KEY,
      'X-API-SECRET': process.env.DENANEYA_API_SECRET
    }
  });

  return response.data;
}`,
            python: `import requests

url = "https://api.denaneya.com/v1/trx/verify"
headers = {
    "Content-Type": "application/json",
    "X-API-KEY": "YOUR_API_KEY",
    "X-API-SECRET": "YOUR_API_SECRET"
}
payload = {
    "trx_id": "75TD2K9J",
    "amount": 1250
}

response = requests.post(url, json=payload, headers=headers)
print("Verification:", response.json())`,
            php: `<?php
$ch = curl_init('https://api.denaneya.com/v1/trx/verify');
$payload = json_encode([
    'trx_id' => '75TD2K9J',
    'amount' => 1250
]);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-KEY: YOUR_API_KEY',
        'X-API-SECRET: YOUR_API_SECRET'
    ]
]);

$response = curl_exec($ch);
curl_close($ch);
$res = json_decode($response, true);
?>`
        },
        responses: [
            {
                status: 200,
                title: '200 OK (Transaction Found & Verified)',
                body: {
                    success: true,
                    code: 'TRANSACTION_VERIFIED',
                    message: 'Transaction verified successfully.',
                    transaction: {
                        trx_id: '75TD2K9J',
                        amount: 1250,
                        channel: 'bkash',
                        sender: 'bKash',
                        status: 'UNUSED',
                        received_at: '2026-09-16T08:14:22.000Z'
                    },
                    credits_remaining: 499
                }
            },
            {
                status: 400,
                title: '400 Bad Request (Amount Oracle Protected)',
                body: {
                    success: false,
                    code: 'TRANSACTION_INVALID',
                    message: 'Transaction verification failed. Please check your TrxID and try again.'
                }
            },
            {
                status: 402,
                title: '402 Payment Required (Credits Depleted)',
                body: {
                    success: false,
                    code: 'INSUFFICIENT_CREDITS',
                    message: 'Merchant credit balance is depleted. Please recharge credits.'
                }
            }
        ]
    },
    {
        id: 's2s-confirm-trx',
        method: 'POST',
        path: '/v1/trx/confirm',
        title: '3. S2S Step 2: Confirm Transaction Consumption',
        description: 'Atomically marks the verified transaction as USED in stored_data, permanently binding it to your order or invoice.',
        requiresAuth: true,
        headers: [
            { key: 'Content-Type', value: 'application/json', description: 'Standard JSON content type' },
            { key: 'X-API-KEY', value: 'dn_live_9b4e82...', description: 'Brand API Key' },
            { key: 'X-API-SECRET', value: 'dn_sec_31a7c0...', description: 'Brand API Secret' }
        ],
        requestBodySchema: [
            { field: 'trx_id', type: 'string', required: true, description: 'Transaction ID confirmed in Step 1' }
        ],
        requestBodyExample: {
            trx_id: '75TD2K9J'
        },
        snippets: {
            curl: `curl -X POST https://api.denaneya.com/v1/trx/confirm \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "X-API-SECRET: YOUR_API_SECRET" \\
  -d '{ "trx_id": "75TD2K9J" }'`,
            nodejs: `const axios = require('axios');

async function confirmPaymentConsumption(trxId) {
  const response = await axios.post('https://api.denaneya.com/v1/trx/confirm', {
    trx_id: trxId
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.DENANEYA_API_KEY,
      'X-API-SECRET': process.env.DENANEYA_API_SECRET
    }
  });

  return response.data;
}`,
            python: `import requests

url = "https://api.denaneya.com/v1/trx/confirm"
headers = {
    "Content-Type": "application/json",
    "X-API-KEY": "YOUR_API_KEY",
    "X-API-SECRET": "YOUR_API_SECRET"
}
payload = {"trx_id": "75TD2K9J"}

response = requests.post(url, json=payload, headers=headers)
print("Confirmation:", response.json())`,
            php: `<?php
$ch = curl_init('https://api.denaneya.com/v1/trx/confirm');
$payload = json_encode(['trx_id' => '75TD2K9J']);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-KEY: YOUR_API_KEY',
        'X-API-SECRET: YOUR_API_SECRET'
    ]
]);

$response = curl_exec($ch);
curl_close($ch);
?>`
        },
        responses: [
            {
                status: 200,
                title: '200 OK (Consumed Atomically)',
                body: {
                    success: true,
                    code: 'TRANSACTION_CONFIRMED',
                    message: 'Transaction confirmed and marked as USED.',
                    trx_id: '75TD2K9J',
                    status: 'USED',
                    used_at: '2026-09-16T08:14:40.000Z'
                }
            }
        ]
    },
    {
        id: 'webhook-verification',
        method: 'POST',
        path: '<your_registered_webhook_url>',
        title: '4. Outbound Webhook & HMAC Verification',
        description: 'Whenever an invoice or payment is reconciled, DenaNeya sends an HTTP POST event to your webhook URL signed with HMAC-SHA256.',
        requiresAuth: false,
        headers: [
            { key: 'Content-Type', value: 'application/json', description: 'JSON event body' },
            { key: 'X-DenaNeya-Signature', value: 't=1726474462,v1=9f8a3b2c1d...', description: 'Replay-proof timestamp and HMAC-SHA256 signature' }
        ],
        requestBodyExample: {
            event: 'invoice.completed',
            brand_id: 'd8f22d88-0353-457a-bed1-ff1e5cda7f11',
            invoice_id: 'inv_8f93bc42-9a10-410c-99bc-19b02a901f4c',
            invoice_number: 'INV-2026-0042',
            amount: 1250,
            amount_paisa: 125000,
            currency: 'BDT',
            trx_id: '75TD2K9J',
            payment_method: 'bkash',
            customer_name: 'Rafiqul Islam',
            customer_phone: '01712345678',
            metadata: { order_id: 'ORD-1089' },
            timestamp: 1726474462
        },
        snippets: {
            curl: `# Test your webhook handler locally using curl:
curl -X POST https://yourdomain.com/webhooks/denaneya \\
  -H "Content-Type: application/json" \\
  -H "X-DenaNeya-Signature: t=1726474462,v1=9f8a3b2c1d..." \\
  -d '{ "event": "invoice.completed", "trx_id": "75TD2K9J", "amount": 1250 }'`,
            nodejs: `const crypto = require('crypto');

function verifyDenaNeyaWebhook(rawBody, signatureHeader, webhookSecret) {
  // Signature format: t=1726474462,v1=hash
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => p.split('='))
  );
  const timestamp = parts.t;
  const receivedSig = parts.v1;

  // Prevent replay attacks (reject payloads older than 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    throw new Error('WEBHOOK_TIMESTAMP_EXPIRED');
  }

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(receivedSig, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );

  return isValid;
}`,
            python: `import hmac
import hashlib
import time

def verify_webhook(raw_body_bytes, signature_header, secret):
    parts = dict(p.split("=") for p in signature_header.split(","))
    timestamp = parts.get("t")
    received_sig = parts.get("v1")

    # 5-minute replay mitigation
    if abs(time.time() - int(timestamp)) > 300:
        return False

    to_sign = f"{timestamp}.".encode("utf-8") + raw_body_bytes
    expected_sig = hmac.new(secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()

    return hmac.compare_digest(received_sig, expected_sig)`,
            php: `<?php
function verifyWebhook($rawBody, $signatureHeader, $secret) {
    parse_str(str_replace(',', '&', $signatureHeader), $parts);
    $timestamp = $parts['t'];
    $receivedSig = $parts['v1'];

    // 5-minute replay tolerance
    if (abs(time() - (int)$timestamp) > 300) {
        return false;
    }

    $toSign = $timestamp . '.' . $rawBody;
    $expectedSig = hash_hmac('sha256', $toSign, $secret);

    return hash_equals($receivedSig, $expectedSig);
}
?>`
        },
        responses: [
            {
                status: 200,
                title: '200 OK (Webhook Acknowledged)',
                body: { received: true }
            }
        ]
    }
];
//# sourceMappingURL=apiDocsData.js.map