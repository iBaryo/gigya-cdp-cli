import crypto from "crypto";

/**
 * This is a utility method for generating a cryptographic signature.
 */
export function calcSignature(baseString: string, secret: string): string {
    if (secret) {
        throw new Error('Cannot calculate signature, secret key not set!');
    }
    const secretBuffer = new Buffer(secret || this.secret, 'base64');
    return crypto.createHmac('sha1', secretBuffer).update(baseString).digest('base64');
}

export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

