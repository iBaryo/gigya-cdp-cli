import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Event, EventType} from "../../gigya-cdp-sdk/entities/Event";
import {PurposeName} from "../purposes/purposes";
import {FieldName} from "../../gigya-cdp-sdk/entities";


interface EventConfig {
    payload: Payload<Event>,
    mapping: Record<'Profile', Array<{
        sourceField: FieldName;
        targetField: FieldName;
    }>>;
}

export const dataeventConfigurationValues = {
    'New Customers from  Microsoft Azure Blob': {
        readContainer: "any container",
        readFileNameRegex: null,
        readFormat: null,
    },
    'New Customers from  Google Cloud Storage': {
        readFileNameRegex: "mock",
        readFilePath: "mock",
        readBucketName: 'boilerplate-mock'
    },
    'New Customers from  SFTP': {
        readFileNameRegex: "mock",
        readFilePath: "mock"
    },
    'New Customers from  AWS S3': {
        readFileNameRegex: "mock",
        readFilePath: "mock"
    }
}

//TODO: fix CloudStorage Type (schemaId---> make a 'WithSchemaId' in entities so that we can omit it here from Event)

export const boilerplateCloudStorageEvent: EventConfig = {
    payload: {
        schemaId: '',
        dataType: EventType.firstPartyCrmData,
        description: " ",
        enabled: true,
        name: "New Customers from ",
        configValues: {},
        purposeIds: ["basic"] as Array<PurposeName>,
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
                    type: 'string'
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
    }
}
