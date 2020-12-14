import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Event} from "../../gigya-cdp-sdk/entities/Event";
import {config} from "../BoilerplateConfig";
import {PurposeName} from "../purposes/purposes";

export const cloudStorageEventTemplate: Payload<Event> = {
    configValues: undefined,
    dataType: undefined,
    description: "",
    enabled: true,
    name: "",
    purposeIds: ["basic", "marketing"] as Array<PurposeName>,
    schema: undefined
}

