import {Id, WithId, WithMetaData, WithVersion} from "./index";
import {JSONSchema7} from "json-schema";

export type SchemaId = Id;

export interface WithSchema extends WithId<SchemaId>, WithVersion, WithMetaData {
    schema: JSONSchema7; // | JsonSchema; // TODO: why?..
}
//
// export interface JsonSchema {
//     type: string,
//     properties: {
//         [key: string]: {
//             type: SchemaFieldType
//         }
//     }
// }
//
// export enum SchemaFieldType {
//     string,
//     number
// }