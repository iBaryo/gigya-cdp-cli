import {JSONSchema7} from "json-schema";
import {config} from "../BoilerplateConfig";

export type ActivityName = 'Orders' | 'Page-Views';
export const activitySchemas: Record<ActivityName, JSONSchema7> = {
    "Orders": {
        type: 'object',
        properties: {
            "orderId": {
                type: "string"
            },
            "currency": {
                type: "string"
            },
            "amount": {
                type: "integer"
            },
            "tax": {
                type: "integer"
            }
        }
    },
    "Page-Views": {
        type: 'object',
        properties: {
            "pageUrl": {
                "type": 'string',
                "format": 'hostname'
            }
        }
    }
};
