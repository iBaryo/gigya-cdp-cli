import {Event, EventType} from "../../gigya-cdp-sdk/entities/Event";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Purpose} from "../BoilerplateConfig";
import {FieldName} from "../../gigya-cdp-sdk/entities";
import {ActivityName} from "../schemas/ActivitiesSchemas";

export type DirectEventName = 'onPurchase' | 'onPageView';


interface EventConfig {
    payload: Payload<Event>,
    mapping: Partial<Record<ActivityName | 'profile', Array<{
        sourceField: FieldName; //FieldName is just a string
        targetField: FieldName;
    }>>>;
}


export const DirectEvents: Record<DirectEventName, EventConfig> = {

    'onPurchase': {
        payload: {
            enabled: true,
            name: 'onPurchase' as DirectEventName,
            description: 'money money money',
            purposeIds: ['basic', 'marketing'] as Array<Purpose>,
            dataType: EventType.firstPartyCrmData,
            schema: {
                'type': 'object',
                'properties': {
                    'firstName': {
                        type: 'string'
                    },
                    'primaryEmail': {
                        type: 'string'
                    },
                    'primaryPhone': {
                        type: 'string'
                    },
                    'purchasePrice': {
                        type: 'number'
                    },
                    'orderId': {
                        type: 'string'
                    },
                    'masterDataId': {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    "birthdate": {
                        type: "string",
                        format: "date"
                    },
                    "gender": {
                        type: "string"
                    },
                    "pageUrl": {
                        type: 'string'
                    },
                    "sessionTime": {
                        type: 'number'
                    }
                }
            }
        },
        mapping: {
            'profile': [
                {
                    'sourceField': 'firstName',
                    'targetField': 'firstName'
                },
                {
                    'sourceField': 'primaryEmail',
                    'targetField': 'primaryEmail'
                },
                {
                    'sourceField': 'primaryPhone',
                    'targetField': 'primaryPhone'
                },
                {
                    'sourceField': 'purchasePrice',
                    'targetField': 'price'
                },
                {
                    'sourceField': 'primaryPhone',
                    'targetField': 'primaryPhone'
                },
                {
                    'sourceField': 'masterDataId',
                    'targetField': 'masterDataId'
                },
                {
                    'sourceField': 'birthdate',
                    'targetField': 'birthdate'
                },
                {
                    'sourceField': 'gender',
                    'targetField': 'gender'
                }
            ],
            'Orders': [
                {
                    'sourceField': 'purchasePrice',
                    'targetField': 'purchasePrice'
                },
                {
                    'sourceField': 'orderId',
                    'targetField': 'orderId'
                }
            ]
        }
    },
    'onPageView': {
        payload: {
            enabled: true,
            name: 'onPageView' as DirectEventName,
            description: 'see that',
            purposeIds: ['basic'] as Array<Purpose>,
            dataType: EventType.offlineData,
            schema: {
                'type': 'object',
                'properties': {
                    'firstName': {
                        type: 'string'
                    },
                    'primaryEmail': {
                        type: 'string'
                    },
                    'primaryPhone': {
                        type: 'string'
                    },
                    'purchasePrice': {
                        type: 'number'
                    },
                    'orderId': {
                        type: 'string'
                    },
                    'masterDataId': {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    "birthdate": {
                        type: "string",
                        format: "date"
                    },
                    "gender": {
                        type: "string"
                    },
                    "pageUrl": {
                        type: 'string'
                    },
                    "sessionTime": {
                        type: 'number'
                    }
                }
            }
        },
        mapping: {
            'profile': [
                {
                    'sourceField': 'firstName',
                    'targetField': 'firstName'
                },
                {
                    'sourceField': 'primaryEmail',
                    'targetField': 'primaryEmail'
                },
                {
                    'sourceField': 'primaryPhone',
                    'targetField': 'primaryPhone'
                },
                {
                    'sourceField': 'purchasePrice',
                    'targetField': 'price'
                },
                {
                    'sourceField': 'primaryPhone',
                    'targetField': 'primaryPhone'
                },
                {
                    'sourceField': 'masterDataId',
                    'targetField': 'masterDataId'
                },
                {
                    'sourceField': 'birthdate',
                    'targetField': 'birthdate'
                },
                {
                    'sourceField': 'gender',
                    'targetField': 'gender'
                }
            ],
            'Page-Views': [
                {
                    'sourceField': 'pageUrl',
                    'targetField': 'pageUrl'
                },
                {
                    'sourceField': 'sessionTime',
                    'targetField': 'sessionTime'
                }
            ]
        }
    }
}
