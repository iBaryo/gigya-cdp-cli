import {JSONSchema7} from "json-schema";

export const activityIndicatorSchema: JSONSchema7 = {
    "name": {type: "string"},
    "calculationMethod": {
        "field": {
            type: "string"
        },
        "method": {
            type: "string"
        }
    },
    "dateRange": {
        "method": {
            type: "string"
        }
    }
} as JSONSchema7;
