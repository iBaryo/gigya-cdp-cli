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
                faker: schema.faker,
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
