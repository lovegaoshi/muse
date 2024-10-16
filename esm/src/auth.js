import "../_dnt.polyfills.js";
import CONSTANTS from "./constants-ng.js";
import { wait } from "./util.js";
import { ERROR_CODE, MuseError } from "./errors.js";
/**
 * Authenticates with youtube's API
 */
export class Authenticator {
    constructor(options) {
        Object.defineProperty(this, "_token", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "store", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.token = options.token ?? options.store.get("token") ?? null;
        this.store = options.store;
        this.client = options.client;
    }
    set token(token) {
        if (token)
            token.expires_date = new Date(token.expires_date);
        this._token = token;
        this.store?.set("token", token);
    }
    get token() {
        return this._token;
    }
    /**
     * Get if the API requires a login
     */
    async requires_login() {
        if (!this.has_token()) {
            let fn = () => Promise.resolve();
            await fn();
        }
        return !this.has_token();
    }
    has_token() {
        return this.token != null;
    }
    /**
     * Get a login code to login via Google Authentiction
     */
    async get_login_code() {
        const response = await this.client.request("https://www.youtube.com/o/oauth2/device/code", {
            method: "post",
            data: {
                client_id: CONSTANTS.CLIENT_ID,
                scope: CONSTANTS.SCOPE,
            },
        });
        if (!response.ok) {
            const text = await response.text();
            throw new MuseError(ERROR_CODE.AUTH_CANT_GET_LOGIN_CODE, "Can't get login code", {
                cause: text,
            });
        }
        const data = response.json();
        return data;
    }
    async load_token_with_code(...args) {
        let res = null;
        let tries = 0;
        let code, interval, signal;
        if (typeof args[0] === "string") {
            code = args[0];
            interval = args[1] ?? 5;
            signal = args[2];
        }
        else {
            code = args[0].device_code;
            interval = args[0].interval;
            signal = args[1];
        }
        while (!res || !res.refresh_token) {
            if (signal?.aborted) {
                throw new DOMException("Aborted", "AbortError");
            }
            const response = await this.client.request("https://oauth2.googleapis.com/token", {
                method: "post",
                data: {
                    client_id: CONSTANTS.CLIENT_ID,
                    client_secret: CONSTANTS.CLIENT_SECRET,
                    code: code,
                    grant_type: "http://oauth.net/grant_type/device/1.0",
                },
                signal,
            });
            res = await response.json();
            if (!response.ok)
                await wait(interval * 1000);
            tries++;
        }
        return this.token = {
            ...res,
            expires_date: new Date(Date.now() + res.expires_in * 1000),
        };
    }
    /**
     * Smartly load a token, when you have already loaded one
     * If a token is present, it will check if it is expired
     */
    async get_token() {
        const token = this.token;
        if (!token) {
            throw new MuseError(ERROR_CODE.AUTH_NO_TOKEN, "No token present, use `get_login_code` to get a new token");
        }
        if (token.expires_date < new Date()) {
            const res = await this.client.request("https://oauth2.googleapis.com/token", {
                method: "post",
                data: {
                    client_id: CONSTANTS.CLIENT_ID,
                    client_secret: CONSTANTS.CLIENT_SECRET,
                    grant_type: "refresh_token",
                    refresh_token: token.refresh_token,
                },
            });
            if (!res.ok) {
                // throw the error, but also set the token to null
                this.token = null;
                const text = await res.text();
                throw new MuseError(ERROR_CODE.AUTH_INVALID_REFRESH_TOKEN, `Can't refresh token, refresh token is invalid or expired`, { cause: text });
            }
            const new_token = await res.json();
            this.token = {
                ...token,
                ...new_token,
                expires_date: new Date(Date.now() + new_token.expires_in * 1000),
            };
            return this.token;
        }
        return token;
    }
    async get_headers() {
        if (this.has_token()) {
            const token = await this.get_token();
            return {
                Authorization: `${token.token_type} ${token.access_token}`,
            };
        }
        else {
            return {};
        }
    }
}
