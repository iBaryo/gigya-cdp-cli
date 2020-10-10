import request, {Headers, Response} from "request";
import {CredentialsType, getSigner, ISigner} from "./Signers";
import {HttpMethod, HttpProtocol, Req} from "./request";
import {toQueryString} from "./utils";

export type DataCenter = 'eu5';

export class CDP {
    public static DefaultOptions = {
        protocol: 'https' as HttpProtocol,
        dataCenter: 'eu5' as DataCenter,
        baseDomain: 'gigya.com',
        proxy: undefined as string,
        ignoreCertError: false,
        verboseLog: false,
        anonymousPaths: [] as RegExp[]
    };

    private _signer: ISigner;

    constructor(credentials: CredentialsType, public options?: Partial<typeof CDP.DefaultOptions>) {
        this.setCredentials(credentials);
        this.options = Object.assign({}, CDP.DefaultOptions, this.options);
    }

    public send<T>(path: string, method: HttpMethod, params: object = {}, headers: Headers = {}): Promise<T & { errorCode?: number }> {
        let req: Req = {
            protocol: this.options.protocol,
            domain: `cdp.${this.options.dataCenter}.${this.options.baseDomain}`,
            path,
            method,
            params,
            headers,
        };

        if (!this.isAnonymousEndpoint(path)) {
            req = this.sign(req);
        }

        this.log(`sending `, req);
        return this.httpSend<T>(req);
    }

    private isAnonymousEndpoint(path: string) {
        return this.options.anonymousPaths.some(anon => anon.test(path));
    }

    public setCredentials(credentials: CredentialsType): this {
        this._signer = getSigner(credentials);
        return this;
    }

    private sign(req: Req): Req {
        return this._signer.sign(req);
    }

    public httpSend<T>(req: Req) {
        const start = Date.now();
        let uri = `${req.protocol}://${req.domain}/api/${req.path}`;
        let body = undefined;

        switch (req.method) {
            case "get":
            case "delete":
                const qs = toQueryString(req.params);
                if (qs)
                    uri += `?${qs}`;
                break;
            default:
                body = req.params;
        }

        if (this.options.ignoreCertError) {
            process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0 as any; // todo: restore it?
        }

        return new Promise<T>((resolve, reject) => request[req.method](
            uri,
            {
                headers: req.headers,
                body,
                proxy: this.options.proxy
                // ca: ''
            }, (error: any, response: Response, body: any) => {
                this.log(`request to ${req.method.toUpperCase()} ${uri} took ${(Date.now() - start) / 1000} seconds`);
                if (error) {
                    this.log(`error:`, error, response, body);
                    reject({error, body});
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (ex) {
                    this.log(`failed to parse response body from request to ${uri}\n${body}`);
                    reject({error: ex, body});
                }
            }));
    }

    private log(msg: string, ...args: any[]) {
        if (this.options.verboseLog)
            console.log(msg, ...args);
    }

    public get<T>(path: string, params?: object, headers?: Headers) {
        return this.send<T>(path, 'get', params, headers);
    }

    public post<T>(path: string, body?: object, query?: object, headers?: Headers) {
        return this.send<T>(path, 'post', body, headers);
    }

    public put<T>(path: string, body?: object, query?: object, headers?: Headers) {
        return this.send<T>(path, 'put', body, headers);
    }

    public delete<T>(path: string, params?: object, headers?: Headers) {
        return this.send<T>(path, 'delete', params, headers);
    }
}
