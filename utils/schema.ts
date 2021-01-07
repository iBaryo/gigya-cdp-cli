import {JSONSchema7} from "json-schema";
import FakerStatic = Faker.FakerStatic;
import * as faker from "faker";
import * as jsf from "json-schema-faker";

jsf.extend('faker', () => faker);

type WithFaker = { // TODO: import from fakify
    faker: string;
};
type WithIdentifier = {
    isIdentifier: boolean;
};

export type JSONSchemaFaker = JSONSchema7 & Partial<WithFaker>;
export type JSONSchemaFieldFaker = WithFaker & WithIdentifier & {
    fieldName: string;
    fieldPath: string;
    schema: JSONSchemaFaker;
    toString(): string;
};

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
                fieldName: path.split('.').pop(),
                fieldPath: path,
                schema: schema,

                get isIdentifier() {
                    return this.schema.isIdentifier;
                },
                set isIdentifier(isIdentifier: boolean) {
                    this.schema.isIdentifier = isIdentifier;
                },

                get faker() {
                    return this.schema.faker;
                },
                set faker(f: string) {
                    this.schema.faker = f;
                },

                toString() {
                    return `${this.fieldPath}\t${this.faker || '(No faker)'}`
                }
            }];
    }
}

export function getIdentifierFields(schema: JSONSchemaFaker) {
    return getFields(schema).filter(f => f.isIdentifier);
}

export function getFakerCategories(): Array<keyof FakerStatic> {
    return Object.entries(faker)
        .filter(([key, val]) => typeof val == 'object')
        .map(([k]) => k as keyof FakerStatic);
}

export function getFakers(category: keyof FakerStatic) {
    return Object.entries(faker[category])
        .filter(([k, val]) => true)
        .map(([k]) => k);
}

export function createArray<T>(size: number, fn?: (i: number) => T): T[] {
    return new Array(size).fill(0).map((_, i) => fn?.(i));
}
export function resolveFake(schema: JSONSchemaFaker) {
    return jsf.resolve(schema);
}
export function getFakedEvents(identifierName: string, schema: JSONSchemaFaker, eventsNum: number, customersNum = 0): Promise<object[]> {
    const identifierSchema = findField(identifierName, schema);
    return Promise.all(
        createArray(Math.max(1, customersNum), async () => {
            const id: unknown = await resolveFake(identifierSchema);
            console.log(`~~~~`, identifierName, id);
            return Promise.all(
                createArray(eventsNum, () => createFakeEventForIdentifier({
                    name: identifierName,
                    value: id
                }, schema))
            );
        })
    ).then(res => res.reduce((res, cur) => res.concat(cur), []));
}
export async function createFakeEventForIdentifier(
    identifier: { name: string; value: unknown },
    schema: JSONSchemaFaker) {
    return Object.assign(await resolveFake(schema), {
        [identifier.name]: identifier.value
    });
}

function findField(fieldPath: string, schema: JSONSchemaFaker): JSONSchemaFaker {
    const pathSegments = fieldPath.split('.');
    const currentPath = pathSegments.shift();

    if(schema.type !== 'object'){
        throw 'not an object';
    }

    const currentPathSchema = schema.properties[currentPath] as JSONSchemaFaker;

    if(!pathSegments.length) {
        return currentPathSchema;
    } else {
        return findField(pathSegments.join('.'), currentPathSchema);
    }
}
