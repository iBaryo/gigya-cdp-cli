import {JSONSchema7} from "json-schema";
import {config} from "../BoilerplateConfig";

export type ActivityName = 'orders' | 'page-views';
export const activitySchemas: Record<ActivityName, JSONSchema7> = {
    "orders": {
        type: 'object' // TODO: zoe
    },
    "page-views": {
        type: 'object',
        properties: {
            pageUrl: {
                type: 'string'
            }
        }
    }
};
