import {JSONSchema7} from "json-schema";
import {ProfileFieldName} from "../../gigya-cdp-sdk/entities";

export const profileSchema: JSONSchema7 = {
    "firstName": {type: "string"},
    "primaryEmail": {type: "string"},
    "primaryPhone": {type: "string"},
    "masterDataId": {type: ["string"]},
    "gender": {type: "string"},
    "birthdate": {type: "string", format: "date"}
    // "age": {type: "number"}
} as JSONSchema7;
