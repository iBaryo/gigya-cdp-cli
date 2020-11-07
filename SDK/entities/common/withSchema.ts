import {Id, WithId, WithMetaData, WithVersion} from "./index";
import {JSONSchema7} from "json-schema";

export type SchemaId = Id;

export interface WithSchema extends WithId<SchemaId>, WithVersion, WithMetaData {
    schema: JSONSchema7;
}