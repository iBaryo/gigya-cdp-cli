import {SchemaId} from "../common/schema";
import {MappingBase} from "../common/mapping";

export interface EventMapping extends MappingBase {
    target: SchemaId;
}