import {JSONSchema7} from "json-schema";
import FakerStatic = Faker.FakerStatic;
import * as faker from "faker";
import * as jsf from "json-schema-faker";

jsf.extend('faker', () => faker);

export type JSONSchemaFaker = JSONSchema7 & {faker?: string}; // TODO: import from fakify
export type JSONSchemaFieldFaker = { field: string, faker: string, schema: JSONSchemaFaker, toString(): string };

export function getFields(schema: JSONSchemaFaker, path = ''): Array<JSONSchemaFieldFaker> {
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

export function getFakerCategories() {
    return Object.entries(faker)
        .filter(([key, val]) => typeof val == 'object')
        .map(([k]) => k);
}

export function getFakers(category: keyof FakerStatic) {
    return Object.entries(faker[category])
        .filter(([k, val]) => true)
        .map(([k]) => k);
}

export function createArray<T>(size: number, fn: (i: number)=> T): T[] {
    return new Array(size).fill(0).map((_, i) => fn(i));
}

export function resolveFake(schema: JSONSchemaFaker) {
    return jsf.resolve(schema);
}
