import "../_dnt.polyfills.js";
import { RequestClient } from "./request.js";
import { Store } from "./store.js";
export interface Token {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_date: Date;
    expires_in: number;
}
export interface LoginCode {
    device_code: string;
    user_code: string;
    expires_in: number;
    interval: number;
    verification_url: string;
}
export interface PureAuthenticatorOptions {
    token?: Token;
}
interface AuthenticatorOptions extends PureAuthenticatorOptions {
    client: RequestClient;
    store: Store;
}
export type RequiresLoginEvent = CustomEvent<(_fn: () => Promise<void>) => void>;
interface AuthenticatorEventMap {
    "requires-login": RequiresLoginEvent;
    "token-changed": Event;
}
export interface Authenticator {
    addEventListener<K extends keyof AuthenticatorEventMap>(type: K, listener: (this: Authenticator, ev: AuthenticatorEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof AuthenticatorEventMap>(type: K, listener: (this: Authenticator, ev: AuthenticatorEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
/**
 * Authenticates with youtube's API
 */
export declare class Authenticator {
    _token: Token | null;
    store: Store;
    client: RequestClient;
    constructor(options: AuthenticatorOptions);
    set token(token: Token | null);
    get token(): Token | null;
    /**
     * Get if the API requires a login
     */
    requires_login(): Promise<boolean>;
    has_token(): boolean;
    /**
     * Get a login code to login via Google Authentiction
     */
    get_login_code(): Promise<LoginCode>;
    /**
     * After getting a login code, get a token
     */
    load_token_with_code(login_code: LoginCode, signal?: AbortSignal): Promise<Token>;
    /**
     * @deprecated Pass the login code directly
     */
    load_token_with_code(code: string, interval?: number, signal?: AbortSignal): Promise<Token>;
    /**
     * Smartly load a token, when you have already loaded one
     * If a token is present, it will check if it is expired
     */
    get_token(): Promise<Token>;
    get_headers(): Promise<{
        Authorization?: string;
    }>;
}
export {};
//# sourceMappingURL=auth.d.ts.map