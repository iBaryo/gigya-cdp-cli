import { CDP } from "gigya-cdp-sdk";

const http = require('http')

const sdkOptions = {
    // ignoreCertError: true,
    // verboseLog: true,
}

export async function getSdkOptions(): Promise<Partial<typeof CDP.DefaultOptions>>{

    return new Promise<Partial<typeof CDP.DefaultOptions>>(resolve => {

        const proxyReqOptions = {
            hostname: '127.0.0.1',
            port: 8888,
            method: 'GET'
        }

        const req = http.request(proxyReqOptions, res => {

            console.log(`statusCode: ${res.statusCode}`)

            res.on('data', d => {
                process.stdout.write(`using fiddler as proxy`);
                resolve({
                    ...sdkOptions,
                    proxy: `http://${proxyReqOptions.hostname}:${proxyReqOptions.port}`,
                    // ignoreCertError: true,
                })
            })
        })

        req.on('error', error => {
            console.log(`if you'd like to use fiddler as a proxy, please make sure it's running with network capturing enabled, then restart cdp cli...`);
            resolve(sdkOptions);
        })

        req.end();
    })
}
