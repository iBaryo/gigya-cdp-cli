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

export type JSONSchemaFaker = JSONSchema7 & Partial<WithFaker & WithIdentifier>;
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
                get faker() {
                    return this.schema.faker;
                },
                get isIdentifier() {
                    return this.schema['isIdentifier'];
                },
                schema: schema,
                toString() {
                    return `${this.fieldPath}\t${this.faker || '(No faker)'}`
                }
            }];
    }
}

export function getIdentifierFields(schema: JSONSchemaFaker) {
    return getFields(schema).filter(f => f.isIdentifier);
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

export function createArray<T>(size: number, fn: (i: number) => T): T[] {
    return new Array(size).fill(0).map((_, i) => fn(i));
}

export function resolveFake(schema: JSONSchemaFaker) {
    return jsf.resolve(schema);
}

export function getFakedEvents(schema: JSONSchemaFaker, eventsNum: number, customersNum = 0): Promise<object[]> {
    const identifiers = getIdentifierFields(schema);
    if (!identifiers.length) {
        return Promise.all(
            createArray(eventsNum, () => resolveFake(schema))
        );
    } else {
        return Promise.all(
            identifiers.flatMap(identifier => {
                return createArray(Math.max(1, customersNum), async () => {
                    const id = await resolveFake(identifier.schema);
                    console.log(`~~~~`, identifier.fieldName, id);
                    return Promise.all(
                        createArray(eventsNum, async () => Object.assign(await resolveFake(schema), {
                            [identifier.fieldName]: id
                        }))
                    );
                });
            })
        ).then(res => res.reduce((res, cur) => res.concat(cur), []));

    }
}