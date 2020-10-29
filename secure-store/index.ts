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
            let str = fs.readFileSync(filePath).toString();

            try {
                if (password) {
                    str = new Cryptr(password).decrypt(str)
                }
                const store = JSON.parse(str) as Store<T>;
                if (store.password != password)
                    return undefined;
                else
                    return store.config;
            } catch (e) {
                return undefined;
            }
        },
        set(config: T, password = '') {
            let str = JSON.stringify({config, password} as Store<T>);
            if (password) {
                str = new Cryptr(password).encrypt(str);
            }
            return fs.writeFileSync(filePath, str);
        }
    };
}
