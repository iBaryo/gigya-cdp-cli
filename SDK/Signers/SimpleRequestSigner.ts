import {AuthRequestSigner, isCredentials, UserKeyCredentials} from "./AuthRequestSigner";
import {clone} from "../utils";
import {Req} from "../request";

export interface SecretCredentials extends UserKeyCredentials {
    secret: string;
}

export function isSecretCredentials(credentials: SecretCredentials | any): credentials is SecretCredentials {
    return !!credentials.secret && isCredentials(credentials);
}

export class SimpleRequestSigner extends AuthRequestSigner<SecretCredentials> {
    constructor(_creds: SecretCredentials) {
        super(_creds);
    }

    public sign(request: Req<SecretCredentials>) {
        const signedReq = clone(request);

        // add credentials to sent params.
        signedReq.params.userKey = this._creds.userKey;
        signedReq.params.secret = this._creds.secret;

        return signedReq;
    }
}
