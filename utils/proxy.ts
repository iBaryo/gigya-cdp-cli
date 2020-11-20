import request, {Response} from "request";
import {resolve} from "json-schema-faker";

export function detectProxy(proxy = {hostname: '127.0.0.1', port: 8888}) {
    return new Promise<string | undefined>(r => {
        const proxyUrl = `http://${proxy.hostname}:${proxy.port}`;
        request.get(proxyUrl, (error: any, response: Response, body: any) => {
            r(error ? undefined : proxyUrl);
        });
    });
}