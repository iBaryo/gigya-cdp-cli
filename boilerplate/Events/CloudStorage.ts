import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Event} from "../../gigya-cdp-sdk/entities/Event";
import {config} from "../BoilerplateConfig";

export const cloudStorageEventTemplate: Payload<Event> = {
    dataType: undefined, name: "", purposeIds: [],
    enabled: false,
    schema: {
        type: 'object',
        properties: {
            [config.commonIdentifier]: {
                type: 'string'
            },
        }
    }

}; // TODO: zoe
