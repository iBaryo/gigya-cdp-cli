import * as fs from "fs";
import Cryptr from "cryptr";

interface Store<T> {
    password: string;
    config: T;
}

export function initStore<T>(filePath: string) {
    return {
        clear() {
            if (this.exists()) {
                fs.unlinkSync(filePath);
            }
        },
        exists() {
            return fs.existsSync(filePath);
        },
        get(password = '') {
            const str = fs.readFileSync(filePath).toString();

            try {
                const store = JSON.parse(new Cryptr(password).decrypt(str)) as Store<T>;
                if (store.password != password)
                    return undefined;
                else
                    return store.config;
            } catch (e) {
                return undefined;
            }
        },
        set(config: T, password = '') {
            return fs.writeFileSync(filePath, new Cryptr(password).encrypt(JSON.stringify({config, password} as Store<T>)));
        }
    };
}
