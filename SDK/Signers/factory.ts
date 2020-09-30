import {ISigner} from "./ISigner";
import {AnonymousRequestSigner, isAnonymous, NoCredentials} from "./AnonymousRequestSigner";
import {isCredentials} from "./AuthRequestSigner";
import {AuthBearerSigner, isRSACreds, RSACredentials} from "./AuthBearerSigner";
import {isSecretCredentials, SecretCredentials} from "./SimpleRequestSigner";
import {CredentialsSigner} from "./CredentialsSigner";

export type CredentialsType = NoCredentials | SecretCredentials | RSACredentials;

export function getSigner(credentials: CredentialsType): ISigner | null {
    if (isAnonymous(credentials)) {
        return new AnonymousRequestSigner();
    } else if (!isCredentials(credentials)) {
        throw 'missing credentials userkey and secret/privateKey';
    } else if (isRSACreds(credentials)) {
        return new AuthBearerSigner(credentials);
    } else if (isSecretCredentials(credentials)) {
        return new CredentialsSigner(credentials);
    } else {
        throw 'missing credentials secret/privateKey';
    }
}
