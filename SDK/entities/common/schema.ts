import {Id, WithId, WithMetaData, WithVersion} from "./index";

export type SchemaId = Id;

export interface Schema extends WithId, WithVersion, WithMetaData {
    schema: JsonSchema;
}

export interface JsonSchema {
    type: string,
    properties: {
        [key: string]: {
            type: SchemaFieldType
        }
    }
}

export enum SchemaFieldType {
    string,
    number
}