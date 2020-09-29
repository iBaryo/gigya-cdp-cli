export class CDP {
    constructor(private _credentials: {userKey: string,secret: string}, dc = 'eu5') {}

    public async send<T>(method: string, httpVerb: 'GET'|'POST'|'PUT'|'DELETE', params?: object): Promise<T & {errCode?:number}> {
        return null;
    }

    public get<T>(method: string, params?: object) {
        return this.send<T>(method, 'GET', params);
    }

    public post<T>(method: string, params?: object) {
        return this.send<T>(method, 'POST', params);
    }
}
