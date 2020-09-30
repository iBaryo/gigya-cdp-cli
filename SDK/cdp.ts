import request, {Headers, Response} from "request";
import {CredentialsType, getSigner} from "./Signers/factory";
import {ISigner} from "./Signers/ISigner";
import {HttpMethod, HttpProtocol, Req} from "./request";

export type DataCenter = 'eu5';

export class CDP {
    public static DefaultOptions = {
        protocol: 'https' as HttpProtocol,
        dataCenter: 'eu5' as DataCenter,
        baseDomain: 'gigya.com',
        proxy: undefined as string,
        verboseLog: false,
        anonymousPaths: [] as RegExp[]
    };

    private _signer: ISigner;

    constructor(credentials: { userKey: string, secret: string }, public options?: Partial<typeof CDP.DefaultOptions>) {
        this.setCredentials(credentials);
        this.options = Object.assign({}, CDP.DefaultOptions, this.options);
    }

    public send<T>(path: string, method: HttpMethod, params?: object, headers?: Headers): Promise<T & { errCode?: number }> {
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
        const uri = `${req.protocol}://${req.domain}/${req.path}`;

        return new Promise<T>((resolve, reject) => request.post(
            uri,
            {
                method: req.method,
                headers: req.headers,
                body: req.params,
                proxy: this.options.proxy
                // ca: ''
            }, (error: any, response: Response, body: any) => {
                this.log(`request to ${uri} took ${(Date.now() - start) / 1000} seconds`);
                if (error) {
                    this.log(error);
                    reject({error, body});
                }
                try {
                    resolve(JSON.parse(body));
                } catch (ex) {
                    this.log(`failed to parse response body from request to ${uri}\n${body}`);
                    reject({error: ex, body});
                }
            }));
    }

    private log(msg: string) {
        if (this.options.verboseLog)
            console.log(msg);
    }

    public get<T>(method: string, params?: object, headers?: Headers) {
        return this.send<T>(method, 'get', params, headers);
    }

    public post<T>(method: string, params?: object, headers?: Headers) {
        return this.send<T>(method, 'post', params, headers);
    }

    public put<T>(method: string, params?: object, headers?: Headers) {
        return this.send<T>(method, 'put', params, headers);
    }

    public delete<T>(method: string, params?: object, headers?: Headers) {
        return this.send<T>(method, 'delete', params, headers);
    }
}
