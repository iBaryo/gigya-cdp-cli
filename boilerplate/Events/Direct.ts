import {Event, EventType} from "../../gigya-cdp-sdk/entities/Event";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Purpose} from "../BoilerplateConfig";
import {FieldName, PurposeId} from "../../gigya-cdp-sdk/entities";
import {ActivityName} from "../schemas/ActivitiesSchemas";
import {PurposeName} from "../purposes/purposes";

export type DirectEventName = 'onPurchase' | 'onPageView';


interface EventConfig {
    payload: Payload<Event>,
    mapping: Partial<Record<ActivityName | 'profile', Array<{
        sourceField: FieldName;
        targetField: FieldName;
    }>>>;
}


export const boilerplateDirectEvents: Record<DirectEventName, EventConfig> = {

    'onPurchase': {
        payload: {
            enabled: true,
            purposeIds: ["HKBvQ4rD59J7xunMoUB0uQ", "HHuf-Dxmf7B0NAd2zXUYTg", "HAO5gzPd_QrLf1UiiRvvRw"], // todo: purposeName[]
            name: 'onPurchase' as DirectEventName,
            description: 'money money money',
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
            purposeIds: ['marketing'] as PurposeName[], // on runtime, we'll swap this with the actual purposeIds
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
