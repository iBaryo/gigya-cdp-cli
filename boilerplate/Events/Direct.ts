import {Event, EventType} from "../../gigya-cdp-sdk/entities/Event";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
// import {Purpose} from "../BoilerplateConfig";
import {FieldName, Purpose, PurposeId} from "../../gigya-cdp-sdk/entities";
import {ActivityName} from "../schemas/ActivitiesSchemas";
import {PurposeName} from "../purposes/purposes";

export type DirectEventName = 'onPurchase' | 'onPageView';


interface EventConfig {
    payload: Payload<Event>,
    mapping: Partial<Record<ActivityName | 'Profile', Array<{
        sourceField: FieldName;
        targetField: FieldName;
    }>>>;
}


export const boilerplateDirectEvents: Record<DirectEventName, EventConfig> = {

    'onPurchase': {
        payload: {
            purposeIds: ["basic", "marketing"] as Array<PurposeName>,
            enabled: true,
            name: 'onPurchase' as DirectEventName,
            description: 'money money money',
            dataType: EventType.firstPartyCrmData,
            schema: {
                type: 'object',
                properties: {
                    firstName: {
                        type: 'string'
                    },
                    primaryEmail: {
                        type: 'string'
                    },
                    primaryPhone: {
                        type: 'string'
                    },
                    purchasePrice: {
                        type: 'number'
                    },
                    orderId: {
                        type: 'string'
                    },
                    masterDataId: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    birthdate: {
                        type: "string",
                        format: "date"
                    },
                    gender: {
                        type: "string"
                    },
                    pageUrl: {
                        type: 'string'
                    },
                    sessionTime: {
                        type: 'number'
                    }
                }
            }
        },
        mapping: {
            'Profile': [
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
                    'targetField': 'price'
                },
                {
                    'sourceField': 'orderId',
                    'targetField': 'orderId'
                }
            ],
            'Page-Views': []
        }
    },
    'onPageView': {
        payload: {
            enabled: true,
            name: 'onPageView' as DirectEventName,
            description: 'see that',
            purposeIds: ["basic", "marketing"] as Array<PurposeName>,
            dataType: EventType.offlineData,
            schema: {
                type: 'object',
                properties: {
                    firstName: {
                        type: 'string'
                    },
                    primaryEmail: {
                        type: 'string'
                    },
                    primaryPhone: {
                        type: 'string'
                    },
                    purchasePrice: {
                        type: 'number'
                    },
                    orderId: {
                        type: 'string'
                    },
                    masterDataId: {
                        type: 'array',
                        items: {
                            type: 'string'
                        }
                    },
                    birthdate: {
                        type: "string",
                        format: "date"
                    },
                    gender: {
                        type: "string"
                    },
                    pageUrl: {
                        type: 'string'
                    },
                    sessionTime: {
                        type: 'number'
                    }
                }
            }
        },
        mapping: {
            'Profile': [
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
            ],
            'Orders': [],
        }
    }
}
