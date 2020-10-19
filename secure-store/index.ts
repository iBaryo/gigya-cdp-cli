import * as fs from "fs";

interface Store<T> {
    password: string;
    config: T;
}

export function initStore<T>(filePath: string) {
    return {
        exists() {
            return fs.existsSync(filePath);
        },
        get(password: string) {
            const store = JSON.parse(fs.readFileSync(filePath).toString()) as Store<T>;
            if (store.password != password)
                return undefined;
            else
                return store.config;
        },
        set(config: T, password) {
            return fs.writeFileSync(filePath, JSON.stringify({config, password} as Store<T>));
        }
    };
}
