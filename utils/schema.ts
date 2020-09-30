import {JSONSchema7} from "json-schema";

export type JSONSchemaFaker = JSONSchema7 & {faker?: string}; // TODO: import from fakify

export function getFields(schema: JSONSchemaFaker, path = ''): Array<{ field: string, faker: string, schema: JSONSchemaFaker, toString(): string }> {
    switch (schema.type) {
        case "object":
            return Object.entries(schema.properties)
                .map(([prop, childSchema]) => getFields(childSchema as JSONSchema7, path ? `${path}.${prop}` : prop))
                .reduce((res, cur) => res.concat(cur), []);

        case "array":
            return getFields(schema.items as JSONSchema7, `${path}[]`);

        default:
            return [{
                field: path,
                get faker() { return this.schema.faker; },
                schema: schema,
                toString() {
                    return `${this.field}\t${this.faker || '(None)'}`
                }
            }];
    }
}

export function getFakers() {
    return [''];
}

export function createArray<T>(size: number, fn: (i: number)=> T): T[] {
    return new Array(size).fill(0).map((_, i) => fn(i));
}
