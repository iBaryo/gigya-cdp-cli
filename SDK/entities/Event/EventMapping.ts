import {SchemaId} from "../common/withSchema";
import {MappingBase} from "../common/mapping";

export interface EventMapping extends MappingBase {
    target: SchemaId;
}