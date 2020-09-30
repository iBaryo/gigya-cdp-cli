import {ISigner} from "./ISigner";
import {Req} from "../request";

export interface UserKeyCredentials {
    userKey?: string;
}

export function isCredentials(credentials: UserKeyCredentials | any): credentials is UserKeyCredentials {
    return !!credentials.userKey;
}

export abstract class AuthRequestSigner<T extends UserKeyCredentials> implements ISigner {
    protected constructor(protected _creds: T) {
    }

    public abstract sign(request: Req): Req;

    protected createNonce() {
        return Math.floor(Math.random() * Math.floor(Date.now()));
    }
}
