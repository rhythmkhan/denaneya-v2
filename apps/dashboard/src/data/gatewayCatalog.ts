/**
 * DenaNeya v2.0 - Complete 52+ Payment Gateway Catalog Definition
 * File: apps/dashboard/src/data/gatewayCatalog.ts
 *
 * All 52 Payment Channels across 4 Tabs:
 * - All: 52
 * - Mobile: 33
 * - International: 8
 * - Bank: 11
 */

export interface GatewayDefinition {
  id: string;
  name: string;
  displayName: string;
  tab: 'Mobile' | 'International' | 'Bank';
  logoUrl: string;
  ussdCode: string | null;
  smsSenders: string[];
  trxIdRegex: string;
  defaultCurrency: string;
  subtypes: string[];
  description?: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    placeholder?: string;
    required?: boolean;
    options?: string[];
  }>;
}

export const GATEWAY_CATALOG: GatewayDefinition[] = [
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "merchant",
      "personal",
      "agent",
      "payment"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "merchant",
          "personal",
          "agent",
          "payment"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "personal",
      "agent",
      "payment"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "personal",
          "agent",
          "payment"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "merchant",
      "personal",
      "agent"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "merchant",
          "personal",
          "agent"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "personal",
      "agent",
      "payment"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "personal",
          "agent",
          "payment"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "merchant",
      "agent"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "merchant",
          "agent"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "USD",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "api_key",
        "label": "API / Public Key",
        "type": "text",
        "placeholder": "pk_live_..."
      },
      {
        "key": "secret_key",
        "label": "API / Secret Key",
        "type": "password",
        "placeholder": "sk_live_..."
      },
      {
        "key": "exchange_rate",
        "label": "Exchange Rate to BDT",
        "type": "number",
        "placeholder": "115.00"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
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
    "defaultCurrency": "BDT",
    "subtypes": [
      "default"
    ],
    "fields": [
      {
        "key": "account_number",
        "label": "Account Number / Wallet ID",
        "type": "text",
        "placeholder": "e.g. 017XXXXXXXX",
        "required": true
      },
      {
        "key": "account_type",
        "label": "Account Type",
        "type": "select",
        "options": [
          "default"
        ],
        "required": true
      },
      {
        "key": "fee_percentage",
        "label": "Fee Percentage (%)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "fee_fixed",
        "label": "Fixed Fee (BDT)",
        "type": "number",
        "placeholder": "0.00"
      },
      {
        "key": "routing_number",
        "label": "Bank Routing Number",
        "type": "text",
        "placeholder": "9-digit routing number"
      },
      {
        "key": "branch_name",
        "label": "Branch Name",
        "type": "text",
        "placeholder": "e.g. Motijheel Corporate Branch"
      },
      {
        "key": "district",
        "label": "District",
        "type": "text",
        "placeholder": "e.g. Dhaka"
      }
    ]
  },
];

export const GATEWAY_TABS = [
  { id: 'all', label: 'All Channels', count: 52 },
  { id: 'Mobile', label: 'Mobile Banking (MFS)', count: 33 },
  { id: 'International', label: 'International & Crypto', count: 8 },
  { id: 'Bank', label: 'Commercial Banks', count: 11 }
] as const;

export default GATEWAY_CATALOG;
