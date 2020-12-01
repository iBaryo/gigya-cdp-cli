import {JSONSchema7} from "json-schema";

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
                type: "number"
            },
            "tax": {
                type: "number"
            },
            "price": {
                type: "number"
            }
        }
    },
    "Page-Views": {
        type: 'object',
        properties: {
            "pageUrl": {
                "type": 'string',
                "format": 'hostname'
            },
            "sessionTime": {
                "type": 'number'
            }
        }
    }
};
