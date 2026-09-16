export interface ApiEndpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    title: string;
    description: string;
    requiresAuth: boolean;
    headers: {
        key: string;
        value: string;
        description: string;
    }[];
    requestBodyExample?: object;
    requestBodySchema?: {
        field: string;
        type: string;
        required: boolean;
        description: string;
    }[];
    snippets: {
        curl: string;
        nodejs: string;
        python: string;
        php: string;
    };
    responses: {
        status: number;
        title: string;
        body: object;
    }[];
}
export declare const API_ENDPOINTS: ApiEndpoint[];
//# sourceMappingURL=apiDocsData.d.ts.map