export interface GatewayItem {
    id: string;
    name: string;
    displayName: string;
    tab: 'Mobile' | 'International' | 'Bank';
    category: string;
    ussdCode: string | null;
    currency: string;
    accountTypes: string[];
    description: string;
    logoUrl?: string;
    color?: string;
    popular?: boolean;
}
export declare const PAYMENT_GATEWAYS: GatewayItem[];
export declare const GATEWAY_TABS: readonly ["All", "Mobile", "International", "Bank"];
export type GatewayTab = typeof GATEWAY_TABS[number];
//# sourceMappingURL=gatewayData.d.ts.map