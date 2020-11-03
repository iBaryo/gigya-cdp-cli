import request, {Headers, Response} from "request";
import {CredentialsType, getSigner, ISigner} from "./Signers";
import {HttpMethod, HttpProtocol, Req} from "./request";
import {toQueryString} from "./utils";
import {AnonymousRequestSigner} from "./Signers/AnonymousRequestSigner";
import {createArray} from "../utils/schema";

export type DataCenter = 'eu5'|`il1`;
type StagingEnvs = 1|2|3|4|5|6|7|8;
export type Env<n extends StagingEnvs = StagingEnvs> = 'prod'|`st${n}`;
export const availableEnvs: Record<DataCenter, Env[]> = {
    il1: ['prod', ...createArray(8, n => `st${n + 1}` as Env)],
    eu5: ['prod', ...createArray(1, n => `st${n + 1}` as Env)]
};

export class CDP {
    public static DefaultOptions = {
        protocol: 'https' as HttpProtocol,
        dataCenter: 'eu5' as DataCenter,
        env: 'prod' as Env,
        baseDomain: 'gigya.com',
        proxy: undefined as string,
        ignoreCertError: false,
        verboseLog: false,
        anonymousPaths: [] as RegExp[]
    };

    private _signer: ISigner;
    private _acls: { [wsId: string]: object } = {};

    constructor(credentials: CredentialsType, public options?: Partial<typeof CDP.DefaultOptions>) {
        this.setCredentials(credentials);
        this.options = Object.assign({},
            CDP.DefaultOptions,
            { ignoreCertError: this.options.dataCenter.startsWith('il1') } as typeof options,
            this.options
        );
    }

    public async getACL(workspace: string) {
        if (!this._acls[workspace]) {
            if (this._signer instanceof AnonymousRequestSigner) {
                this.log(`anonymous user: no permissions`);
                this._acls[workspace] = {};
            } else {
                const permissionsDc = this.options.dataCenter == 'eu5' ? 'us1' : 'il1';
                let req: Req = this.sign({
                    protocol: this.options.protocol,
                    domain: `admin.${permissionsDc}.${this.options.baseDomain}`,
                    path: `admin.getEffectiveACL`,
                    method: 'get',
                    query: {},
                    params: {
                        partnerID: workspace,
                        targetUserKey: this._signer.userKey
                    },
                    headers: {},
                });

                this.log(`sending `, req);
                this._acls[workspace] = await this.httpSend<object>(req);
            }
        }

        return this._acls[workspace];
    }

    public async hasPermissions(workspace: string, ...paths: string[]) {
        const apiAcl: Record<string, object> = await this.getACL(workspace).then((r: any) => r.eACL?.['_api'] ?? {});
        return paths.every(p => !!apiAcl[`api/${p}`]);
    }

    private getDomainDc({dataCenter, env} = this.options) {
        if (dataCenter == 'eu5' && env == 'prod')
            return 'eu5';

        const dc = dataCenter == 'il1' ? 'il1-cdp' : 'eu5';
        return `${dc}-${env}`;
    }

    public send<T>(path: string, method: HttpMethod, params: object = {}, headers: Headers = {}): Promise<T & { errorCode?: number }> {
        let req: Req = {
            protocol: this.options.protocol,
            domain: `cdp.${this.getDomainDc()}.${this.options.baseDomain}`,
            path: `api/${path}`,
            query: {},
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
        this._acls = {};
        return this;
    }

    private sign(req: Req): Req {
        return this._signer.sign(req);
    }

    public httpSend<T>(req: Req) {
        const start = Date.now();
        let uri = `${req.protocol}://${req.domain}/${req.path}`;
        let body = undefined;

        switch (req.method) {
            case "get":
            case "delete":
                Object.assign(req.query, req.params);
                break;
            default:
                body = JSON.stringify(req.params);
        }

        const qs = toQueryString(req.query);
        if (qs)
            uri += `?${qs}`;

        if (this.options.ignoreCertError) {
            process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0 as any; // todo: restore it?
        }

        if (this.options.proxy) {
            this.log(`sending via proxy:`, this.options.proxy);
        }

        return new Promise<T>((resolve, reject) => request[req.method](
            uri,
            {
                headers: {...req.headers, ['Content-type']: 'application/json'},
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

    public ['🤩']() {
        console.log('with love from Baryo');
    }
}
