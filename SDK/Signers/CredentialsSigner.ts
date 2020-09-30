import {SecretCredentials, SimpleRequestSigner} from "./SimpleRequestSigner";
import {calcSignature} from "../util";
import {HttpMethod, Req} from "../request";

const strictUriEncode = require('strict-uri-encode') as (str: string) => string;

interface SignedRequestParams {
    timestamp: number;
    nonce: number;
    sig: string;
}

export class CredentialsSigner extends SimpleRequestSigner {
    constructor(creds: SecretCredentials,
                private calcSignature = calcSignature) {
        super(creds);
    }

    public sign(request: Req<SecretCredentials & SignedRequestParams>) {
        const signedReq = super.sign(request);
        const requestParams = signedReq.params as SecretCredentials & SignedRequestParams;
        const effectiveSecret = requestParams.secret;

        // clear previous authentications
        delete requestParams.secret;
        delete requestParams.sig;

        if (effectiveSecret) {
            requestParams.timestamp = Date.now();
            requestParams.nonce = this.createNonce();
            requestParams.sig =
                this.createRequestSignature(
                    this._creds.secret,
                    `${request.protocol}://${request.domain.toLowerCase()}/${request.path}`,
                    request.method,
                    requestParams);
        }

        return signedReq;
    }

    protected createRequestSignature(secret: string, uri: string, httpMethod: HttpMethod, requestParams: object) {
        const queryString =
            Object.keys(requestParams)
                .sort()
                .map(key => `${key}=${strictUriEncode((requestParams[key] || '').toString())}`)
                .join('&');
        const baseString = `${httpMethod.toUpperCase()}&${strictUriEncode(uri)}&${strictUriEncode(queryString)}`;
        return this.calcSignature(baseString, secret);
    }
}
