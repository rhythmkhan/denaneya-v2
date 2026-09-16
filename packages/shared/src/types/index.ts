import { MFSProvider } from "../constants/telecom.js";

export interface ParsedMfsData {
  provider: MFSProvider;
  trxId: string;
  amount: number;
  amountPaisa: number;
  senderNumber: string;
  smsRef: string;
  balance: number | null;
  transactionDate: string | null;
}

export type ParseSmsResult =
  | {
      success: true;
      data: ParsedMfsData;
    }
  | {
      success: false;
      error: string;
      message: string;
    };

export interface WebhookEventPayload {
  event: "billing.payment_received" | "invoice.expired" | "invoice.created";
  brand_id: string;
  invoice_id: string;
  amount: number;
  amount_paisa: number;
  trx_id?: string;
  provider?: MFSProvider;
  sender_number?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
