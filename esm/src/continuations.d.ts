export declare function get_continuations(results: any, continuation_type: string, limit: number | null, request: (additional_params: Record<string, string>) => Promise<any>, parse: (data: any, continuation?: any) => any[], _ctoken_path?: string, reloadable?: boolean, stopAfter?: (tracks: any[]) => boolean): Promise<{
    items: any[];
    continuation: string;
}>;
export declare function get_sort_continuations<Return extends any>(results: any, continuation_type: string, request: (additional_params: Record<string, string>) => Promise<any>, parse: (data: any, continuation?: any) => Return): Promise<Return | null>;
export declare function get_validated_continuations(results: any, continuation_type: string, limit: number, per_page: number, request: (additional_params: Record<string, string>) => Promise<any>, parse: (data: any) => any[], _ctoken_path?: string): Promise<{
    items: any[];
    continuation: string;
}>;
export declare function get_parsed_continuation_items(response: any, parse: (data: any) => any[], continuation_type: string): {
    results: any;
    parsed: any[];
};
export declare function get_continuation_params(results: any, ctoken_path?: string): {
    ctoken: string;
    continuation: string;
    type: string;
};
export declare function get_reloadable_continuation_params(results: any): {
    ctoken: string;
    continuation: string;
    type: string;
};
export declare function get_continuation_contents<T extends any = any>(continuation: any, parse: (data: any, continuation?: any) => T): T;
export declare function resend_request_until_valid(request: (params: Record<string, string>) => Promise<any>, params: Record<string, string>, parse: (data: any) => any, validate: (data: any) => boolean, max_retries?: number): Promise<any>;
export declare function validate_response(response: any, per_page: number, limit: number, current_count: number): boolean;
//# sourceMappingURL=continuations.d.ts.map