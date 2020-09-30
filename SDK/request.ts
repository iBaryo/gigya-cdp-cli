import {Headers} from "request";

export type HttpProtocol = 'https' | 'http';
export type HttpMethod = 'get' | 'post' | 'put' | 'delete';

export interface Req<P extends object = {}> {
    protocol: HttpProtocol;
    domain: string;
    path: string;
    method: HttpMethod;
    params: P;
    headers: Headers;
}
