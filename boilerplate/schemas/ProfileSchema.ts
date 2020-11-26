import {JSONSchema7} from "json-schema";

export const profileSchema: JSONSchema7 = {
    "firstName": {type: "string"},
    "primaryEmail": {type: "string"},
    "primaryPhone": {type: "string"},
    "masterDataId": {type: ["string"]},
    "gender": {type: "string"},
    "birthdate": {type: "string", format: "date"}
} as JSONSchema7;
