import {Event, EventType} from "../../gigya-cdp-sdk/entities/Event";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Purpose} from "../BoilerplateConfig";

export type DirectEventName = 'purchase' | 'page-view';

export const DirectEvents: Record<DirectEventName, Payload<Event>> = {
    'purchase': {
        enabled: true,
        name: 'purchase' as DirectEventName,
        description: 'money money money',
        purposeIds: ['basic', 'marketing'] as Array<Purpose>,
        dataType: EventType.firstPartyCrmData,
        schema: {
            'type': 'object',
            'properties': {
                'firstName': {
                    'type': 'string'
                },
                'lastName': {
                    'type': 'string'
                },


            }
        } // TODO: zoe
    },
    'page-view': {
        enabled: true,
        name: 'page-view' as DirectEventName,
        description: 'see that',
        purposeIds: ['basic'] as Array<Purpose>,
        dataType: EventType.offlineData,
        schema: {} // TODO: zoe
    }
};
