/**
 * DenaNeya v2.0 - Complete 52+ Payment Gateway Catalog Definition
 * Auto-generated & verified from live ZiNiPay system audit.
 * 
 * Total Gateways: 52
 * Categories:
 *  - Mobile (33 channels: MFS Personal/Payment/Agent, Aggregators, Sub-channels, QR)
 *  - International (8 channels: Stripe, Crypto, Remittance, P2P Wallets)
 *  - Bank (11 channels: Direct Commercial Bank Deposits with NPSB/BEFTN)
 *  - All (Aggregates all 52 channels)
 */

'use strict';

const GATEWAY_CATALOG = [
  {
    "id": "bkash",
    "name": "Bkash",
    "displayName": "Bkash",
    "tab": "Mobile",
    "logoUrl": "/payments/bkash.png",
    "ussdCode": "*247#",
    "smsSenders": [
      "bKash"
    ],
    "trxIdRegex": "^[A-Z0-9]{10}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "merchant",
      "personal",
      "agent",
      "payment"
    ],
    "forms": {
      "merchant": {
        "sections": [
          "Bkash Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bkash_username",
          "Bkash_password",
          "Bkash_api_key",
          "Bkash_secret_key",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bkash_username",
            "type": "text",
            "placeholder": "Enter bkash_username...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "bkash_password",
            "type": "text",
            "placeholder": "Enter bkash_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "bkash_api_key",
            "type": "text",
            "placeholder": "Enter bkash_api_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "bkash_secret_key",
            "type": "text",
            "placeholder": "Enter bkash_secret_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "personal": {
        "sections": [
          "Bkash Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "agent": {
        "sections": [
          "Bkash Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "payment": {
        "sections": [
          "Bkash Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "nagad",
    "name": "Nagad",
    "displayName": "Nagad",
    "tab": "Mobile",
    "logoUrl": "/payments/nagad.png",
    "ussdCode": "*167#",
    "smsSenders": [
      "Nagad",
      "16167"
    ],
    "trxIdRegex": "^[A-Z0-9]{8}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "personal",
      "agent",
      "payment"
    ],
    "forms": {
      "personal": {
        "sections": [
          "Nagad Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "agent": {
        "sections": [
          "Nagad Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "payment": {
        "sections": [
          "Nagad Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "upay",
    "name": "Upay",
    "displayName": "Upay",
    "tab": "Mobile",
    "logoUrl": "/payments/upay.png",
    "ussdCode": "*268#",
    "smsSenders": [
      "Upay",
      "16268"
    ],
    "trxIdRegex": "^[A-Z0-9]{10}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "merchant",
      "personal",
      "agent"
    ],
    "forms": {
      "merchant": {
        "sections": [
          "Upay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Merchant_id",
          "Merchant_key",
          "Merchant_code",
          "Merchant_name",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "merchant_id",
            "type": "text",
            "placeholder": "Enter merchant_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "merchant_key",
            "type": "text",
            "placeholder": "Enter merchant_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "merchant_code",
            "type": "text",
            "placeholder": "Enter merchant_code...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "merchant_name",
            "type": "text",
            "placeholder": "Enter merchant_name...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "personal": {
        "sections": [
          "Upay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "agent": {
        "sections": [
          "Upay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "rocket",
    "name": "Rocket",
    "displayName": "Rocket",
    "tab": "Mobile",
    "logoUrl": "/payments/16216.png",
    "ussdCode": "*322#",
    "smsSenders": [
      "16216"
    ],
    "trxIdRegex": "^[0-9]{10}$|^[A-Z0-9]{10}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "personal",
      "agent",
      "payment"
    ],
    "forms": {
      "personal": {
        "sections": [
          "Rocket Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "agent": {
        "sections": [
          "Rocket Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "payment": {
        "sections": [
          "Rocket Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "pathaopay",
    "name": "PathaoPay",
    "displayName": "PathaoPay",
    "tab": "Mobile",
    "logoUrl": "/payments/pathaopay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{8,14}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "PathaoPay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "mcash",
    "name": "mCash",
    "displayName": "mCash",
    "tab": "Mobile",
    "logoUrl": "/payments/16259.png",
    "ussdCode": "*259#",
    "smsSenders": [
      "16259"
    ],
    "trxIdRegex": "^[A-Z0-9]{10}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "mCash Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "ok_wallet",
    "name": "OK Wallet",
    "displayName": "OK Wallet",
    "tab": "Mobile",
    "logoUrl": "/payments/01847-348685.png",
    "ussdCode": "*269#",
    "smsSenders": [
      "01847-348685",
      "OK Wallet"
    ],
    "trxIdRegex": "^[A-Z0-9]{10,12}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "OK Wallet Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "cellfin",
    "name": "CellFin",
    "displayName": "CellFin",
    "tab": "Mobile",
    "logoUrl": "/payments/ibbl.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{10,16}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "CellFin Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "tap",
    "name": "Tap",
    "displayName": "Tap",
    "tab": "Mobile",
    "logoUrl": "/payments/tap.png",
    "ussdCode": "*201#",
    "smsSenders": [
      "Tap"
    ],
    "trxIdRegex": "^[A-Z0-9]{10}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Tap Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "aamarpay",
    "name": "aamarPay",
    "displayName": "aamarPay",
    "tab": "Mobile",
    "logoUrl": "/payments/aamarpay.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "aamarPay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Signature_key",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "signature_key",
            "type": "text",
            "placeholder": "Enter signature_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_4",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "eps",
    "name": "EPS",
    "displayName": "EPS",
    "tab": "Mobile",
    "logoUrl": "/payments/eps.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "EPS Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Merchant_id",
          "Store_id",
          "Username",
          "Password",
          "Hashkey",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "merchant_id",
            "type": "text",
            "placeholder": "Enter merchant_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "username",
            "type": "text",
            "placeholder": "Enter username...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "password",
            "type": "text",
            "placeholder": "Enter password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "hashkey",
            "type": "text",
            "placeholder": "Enter hashkey...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_7",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "sslcommerz",
    "name": "SSLCommerz",
    "displayName": "SSLCommerz",
    "tab": "Mobile",
    "logoUrl": "/payments/sslcommerz.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "SSLCommerz Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "bkash_sslcommerz",
    "name": "bKash (SSLCommerz)",
    "displayName": "bKash (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/bkash.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "bKash (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "cellfin_sslcommerz",
    "name": "Cellfin (SSLCommerz)",
    "displayName": "Cellfin (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/16259.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Cellfin (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "ipay_sslcommerz",
    "name": "Ipay (SSLCommerz)",
    "displayName": "Ipay (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/ipay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Ipay (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "nagad_sslcommerz",
    "name": "Nagad (SSLCommerz)",
    "displayName": "Nagad (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/nagad.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Nagad (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "ok_wallet_sslcommerz",
    "name": "OK Wallet (SSLCommerz)",
    "displayName": "OK Wallet (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/okwallet.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "OK Wallet (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "rocket_sslcommerz",
    "name": "Rocket (SSLCommerz)",
    "displayName": "Rocket (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/16216.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Rocket (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "tap_sslcommerz",
    "name": "Tap (SSLCommerz)",
    "displayName": "Tap (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/tap.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Tap (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "upay_sslcommerz",
    "name": "Upay (SSLCommerz)",
    "displayName": "Upay (SSLCommerz)",
    "tab": "Mobile",
    "logoUrl": "/payments/upay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Upay (SSLCommerz) Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Store_id",
          "Store_password",
          "Product_category",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "store_id",
            "type": "text",
            "placeholder": "Enter store_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "store_password",
            "type": "text",
            "placeholder": "Enter store_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "product_category",
            "type": "text",
            "placeholder": "Enter product_category...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "field_5",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "shurjopay",
    "name": "shurjoPay",
    "displayName": "shurjoPay",
    "tab": "Mobile",
    "logoUrl": "/payments/shurjopay.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "shurjoPay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Username",
          "Password",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "username",
            "type": "text",
            "placeholder": "Enter username...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "password",
            "type": "text",
            "placeholder": "Enter password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_4",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "paystation",
    "name": "PayStation",
    "displayName": "PayStation",
    "tab": "Mobile",
    "logoUrl": "/payments/paystation.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "PayStation Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Merchant_id",
          "Merchant_password",
          "Checkout_items",
          "Pay_with_charge",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "merchant_id",
            "type": "text",
            "placeholder": "Enter merchant_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "password",
            "type": "text",
            "placeholder": "Enter merchant_password...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "checkout_items",
            "type": "text",
            "placeholder": "Enter checkout_items...",
            "defaultValue": "Payment",
            "options": null
          },
          {
            "key": "pay_with_charge",
            "type": "text",
            "placeholder": "Enter pay_with_charge...",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "field_6",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "pathaopay_merchant_api",
    "name": "PathaoPay Merchant API",
    "displayName": "PathaoPay Merchant API",
    "tab": "Mobile",
    "logoUrl": "/payments/pathaopay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "PathaoPay Merchant API Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Api_key",
          "Secret_key",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "api_key",
            "type": "text",
            "placeholder": "Enter api_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "secret_key",
            "type": "text",
            "placeholder": "Enter secret_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_4",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "nagad_merchant_api",
    "name": "Nagad Merchant API",
    "displayName": "Nagad Merchant API",
    "tab": "Mobile",
    "logoUrl": "/payments/nagad-merchant-api.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Nagad Merchant API Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "App_account",
          "Merchant_id",
          "Private_key",
          "Public_key",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "app_account",
            "type": "text",
            "placeholder": "Enter app_account...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "merchant_id",
            "type": "text",
            "placeholder": "Enter merchant_id...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "private_key",
            "type": "text",
            "placeholder": "Enter private_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "public_key",
            "type": "text",
            "placeholder": "Enter public_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_6",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "ipay_merchant",
    "name": "iPay Merchant",
    "displayName": "iPay Merchant",
    "tab": "Mobile",
    "logoUrl": "/payments/ipay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "iPay Merchant Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "ipay_personal",
    "name": "iPay Personal",
    "displayName": "iPay Personal",
    "tab": "Mobile",
    "logoUrl": "/payments/ipay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "iPay Personal Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "telecash_agent",
    "name": "Telecash Agent",
    "displayName": "Telecash Agent",
    "tab": "Mobile",
    "logoUrl": "/payments/telecash.jpg",
    "ussdCode": "*0#",
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Telecash Agent Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "field_2",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "telecash_merchant",
    "name": "Telecash Merchant",
    "displayName": "Telecash Merchant",
    "tab": "Mobile",
    "logoUrl": "/payments/telecash.jpg",
    "ussdCode": "*0#",
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Telecash Merchant Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "field_2",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "telecash_personal",
    "name": "Telecash Personal",
    "displayName": "Telecash Personal",
    "tab": "Mobile",
    "logoUrl": "/payments/telecash.jpg",
    "ussdCode": "*0#",
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Telecash Personal Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "field_2",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "bangla_qr",
    "name": "Bangla QR",
    "displayName": "Bangla QR",
    "tab": "Mobile",
    "logoUrl": "/payments/bangla_qr.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Bangla QR Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Required)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "bangla_qr_v2",
    "name": "Bangla QR V2",
    "displayName": "Bangla QR V2",
    "tab": "Mobile",
    "logoUrl": "/payments/bangla_qr.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Bangla QR V2 Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank",
          "QR Code (Required)",
          "QR Verification Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_select",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "pubali",
            "options": [
              "bkash",
              "pathaopay",
              "pubali",
              "tallypay"
            ]
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "qr_verification_mode",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "amount",
            "options": [
              "amount",
              "account_last4"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "pubali_bank",
    "name": "PUBALI BANK",
    "displayName": "PUBALI BANK",
    "tab": "Mobile",
    "logoUrl": "/payments/bank/pubali-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "PUBALI BANK Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Payment Instructions",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "payment_instructions",
            "type": "textarea",
            "placeholder": "Add one instruction per line. You can use {amount}, {currency}, and {amount_with_currency}.",
            "defaultValue": "Send the exact amount shown on this payment page.\nUse the account, QR, wallet, or payment details provided above.\nAfter payment, enter your Transaction ID / Reference and verify.",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "tally_pay",
    "name": "Tally Pay",
    "displayName": "Tally Pay",
    "tab": "Mobile",
    "logoUrl": "/payments/tallypay.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Tally Pay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Payment Instructions",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "payment_instructions",
            "type": "textarea",
            "placeholder": "Add one instruction per line. You can use {amount}, {currency}, and {amount_with_currency}.",
            "defaultValue": "Send the exact amount shown on this payment page.\nUse the account, QR, wallet, or payment details provided above.\nAfter payment, enter your Transaction ID / Reference and verify.",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "stripe",
    "name": "Stripe",
    "displayName": "Stripe",
    "tab": "International",
    "logoUrl": "/payments/international/stripe.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^(ch_|pi_)[A-Za-z0-9]+$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "merchant",
      "agent"
    ],
    "forms": {
      "merchant": {
        "sections": [
          "Stripe Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Stripe_publisher_key",
          "Stripe_secret_key",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "stripe_publisher_key",
            "type": "text",
            "placeholder": "Enter stripe_publisher_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "secret_key",
            "type": "text",
            "placeholder": "Enter stripe_secret_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      },
      "agent": {
        "sections": [
          "Stripe Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Select Account Type:",
          "Credentials (agent)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Account_number",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter account_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_3",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "binance",
    "name": "Binance",
    "displayName": "Binance",
    "tab": "International",
    "logoUrl": "/payments/international/binance.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[0-9]{9,12}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Binance Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (personal)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Binance_uid",
          "Api_key",
          "Secret_key",
          "QR Code (Optional)",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "binance_uid",
            "type": "text",
            "placeholder": "Enter binance_uid...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "api_key",
            "type": "text",
            "placeholder": "Enter api_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "secret_key",
            "type": "text",
            "placeholder": "Enter secret_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "field_5",
            "type": "file",
            "placeholder": "",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "field_9",
            "type": "number",
            "placeholder": "",
            "defaultValue": "130",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "oxapay",
    "name": "OxaPay",
    "displayName": "OxaPay",
    "tab": "International",
    "logoUrl": "/payments/international/oxapay.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[a-f0-9]{64}$|^[A-Za-z0-9_-]{10,40}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "OxaPay Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (merchant)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Api_key",
          "Fee_paid_by_payer",
          "Under_paid_coverage",
          "Mixed_payment",
          "Mode",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "api_key",
            "type": "text",
            "placeholder": "Enter api_key...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "fee_paid_by_payer",
            "type": "text",
            "placeholder": "Enter fee_paid_by_payer...",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "under_paid_coverage",
            "type": "text",
            "placeholder": "Enter under_paid_coverage...",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "mixed_payment",
            "type": "text",
            "placeholder": "Enter mixed_payment...",
            "defaultValue": "disallow",
            "options": null
          },
          {
            "key": "field_6",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "sandbox",
            "options": [
              "sandbox",
              "live"
            ]
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "wise",
    "name": "Wise",
    "displayName": "Wise",
    "tab": "International",
    "logoUrl": "/payments/international/wise.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^TRANSFER-[0-9]{8,12}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Wise Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Recipient_wise_account",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "recipient_wise_account",
            "type": "text",
            "placeholder": "Enter recipient_wise_account...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "payoneer",
    "name": "Payoneer",
    "displayName": "Payoneer",
    "tab": "International",
    "logoUrl": "/payments/international/payoneer.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[0-9]{8,12}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Payoneer Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Payoneer_email",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "payoneer_email",
            "type": "text",
            "placeholder": "Enter payoneer_email...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "payeer",
    "name": "Payeer",
    "displayName": "Payeer",
    "tab": "International",
    "logoUrl": "/payments/international/payeer.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[0-9]{10,14}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Payeer Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Recipient_payeer_account",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "recipient_payeer_account",
            "type": "text",
            "placeholder": "Enter recipient_payeer_account...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "paypal",
    "name": "PayPal",
    "displayName": "PayPal",
    "tab": "International",
    "logoUrl": "/payments/international/paypal.png",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Z0-9]{17}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "PayPal Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Paypal_email",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "paypal_email",
            "type": "text",
            "placeholder": "Enter paypal_email...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "taptap_send",
    "name": "TapTap Send",
    "displayName": "TapTap Send",
    "tab": "International",
    "logoUrl": "/payments/taptap-send.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": null,
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "TapTap Send Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (manual)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Recipient_country",
          "Payment_method",
          "Mfs_number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Exchange Rate (1 USD = Invoice Currency)",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "recipient_country",
            "type": "text",
            "placeholder": "Enter recipient_country...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "payment_method",
            "type": "text",
            "placeholder": "Enter payment_method...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "mfs_number",
            "type": "text",
            "placeholder": "Enter mfs_number...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "USD",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "al_arafah_islami_bank_plc",
    "name": "Al-Arafah Islami Bank PLC",
    "displayName": "Al-Arafah Islami Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/al-arafah-islami-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "01526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Al-Arafah Islami Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "Al-Arafah Islami Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "islami_bank_bangladesh_plc",
    "name": "Islami Bank Bangladesh PLC",
    "displayName": "Islami Bank Bangladesh PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/islami-bank-.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "12527",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Islami Bank Bangladesh PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "Islami Bank Bangladesh PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "brac_bank_plc",
    "name": "BRAC Bank PLC",
    "displayName": "BRAC Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/brac-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "06026",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "BRAC Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "BRAC Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "city_bank_plc",
    "name": "City Bank PLC",
    "displayName": "City Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/city-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "22526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "City Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "City Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "dutch_bangla_bank_plc",
    "name": "Dutch-Bangla Bank PLC",
    "displayName": "Dutch-Bangla Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/dbbl-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "09026",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Dutch-Bangla Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "Dutch-Bangla Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "eastern_bank_plc",
    "name": "Eastern Bank PLC",
    "displayName": "Eastern Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/eastern-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "09526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Eastern Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "Eastern Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "ncc_bank_plc",
    "name": "NCC Bank PLC",
    "displayName": "NCC Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/ncc-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "15526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "NCC Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "NCC Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "nrb_commercial_bank_plc",
    "name": "NRB Commercial Bank PLC",
    "displayName": "NRB Commercial Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/nrb-commercial-bank-ltd.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "27526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "NRB Commercial Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "NRB Commercial Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "prime_bank_plc",
    "name": "Prime Bank PLC",
    "displayName": "Prime Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/prime-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "17526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Prime Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "Prime Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "pubali_bank_plc",
    "name": "Pubali Bank PLC",
    "displayName": "Pubali Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/pubali-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "18526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "Pubali Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "Pubali Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  },
  {
    "id": "united_commercial_bank_plc",
    "name": "United Commercial Bank PLC",
    "displayName": "United Commercial Bank PLC",
    "tab": "Bank",
    "logoUrl": "/payments/bank/ucb-bank.jpg",
    "ussdCode": null,
    "smsSenders": [],
    "trxIdRegex": "^[A-Za-z0-9_-]{6,32}$",
    "routingPrefix": "24526",
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "forms": {
      "default": {
        "sections": [
          "United Commercial Bank PLC Setup for Deshi Course - \u09a6\u09c7\u09b6\u09bf \u0995\u09cb\u09b0\u09cd\u09b8 (deshicourse.com)",
          "Credentials (account)",
          "Limits & Fees"
        ],
        "labels": [
          "Select Brand",
          "Bank Name",
          "Account Name",
          "Account Number",
          "Branch Name",
          "District",
          "Routing Number",
          "Minimum Amount (BDT)",
          "Maximum Amount (BDT)",
          "Payment Currency",
          "Gateway Fee",
          "Gateway Fee Type"
        ],
        "fields": [
          {
            "key": "field_0",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "brand_id",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "d8f22d88-0353-457a-bed1-ff1e5cda7f11",
            "options": [
              "d8f22d88-0353-457a-bed1-ff1e5cda7f11"
            ]
          },
          {
            "key": "bank_name",
            "type": "text",
            "placeholder": "Enter bankName...",
            "defaultValue": "United Commercial Bank PLC",
            "options": null
          },
          {
            "key": "account_name",
            "type": "text",
            "placeholder": "Enter accountName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "account_number",
            "type": "text",
            "placeholder": "Enter accountNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "branch_name",
            "type": "text",
            "placeholder": "Enter branchName...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "district",
            "type": "text",
            "placeholder": "Enter district...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "routing_number",
            "type": "text",
            "placeholder": "Enter routingNumber...",
            "defaultValue": "",
            "options": null
          },
          {
            "key": "min_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "1",
            "options": null
          },
          {
            "key": "max_amount",
            "type": "number",
            "placeholder": "",
            "defaultValue": "100000",
            "options": null
          },
          {
            "key": "currency",
            "type": "text",
            "placeholder": "BDT, USD, USDT...",
            "defaultValue": "BDT",
            "options": null
          },
          {
            "key": "gateway_fee",
            "type": "number",
            "placeholder": "",
            "defaultValue": "0",
            "options": null
          },
          {
            "key": "gateway_fee_type",
            "type": "select-one",
            "placeholder": "",
            "defaultValue": "percentage",
            "options": [
              "percentage",
              "fixed"
            ]
          }
        ]
      }
    }
  }
];

/**
 * Filter catalog by tab: 'All', 'Mobile', 'International', 'Bank'
 * @param {'All'|'Mobile'|'International'|'Bank'} tab 
 * @returns {Array} List of gateways matching tab
 */
function getGatewaysByTab(tab) {
  if (!tab || tab === 'All') return GATEWAY_CATALOG;
  return GATEWAY_CATALOG.filter(gw => gw.tab.toLowerCase() === tab.toLowerCase());
}

/**
 * Find gateway definition by ID
 * @param {string} gatewayId 
 * @returns {Object|null}
 */
function getGatewayById(gatewayId) {
  return GATEWAY_CATALOG.find(gw => gw.id === gatewayId) || null;
}

module.exports = {
  GATEWAY_CATALOG,
  getGatewaysByTab,
  getGatewayById
};
