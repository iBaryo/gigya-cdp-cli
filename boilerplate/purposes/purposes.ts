import {Entity, Payload} from "../../gigya-cdp-sdk/entities/common";
import {
    ActivityFieldName,
    ActivityIndicatorName,
    ActivitySchemaName,
    ProfileFieldName,
    Purpose,
    PurposeId,
    SegmentName
} from "../../gigya-cdp-sdk/entities";

import {ActivityIndicator} from "../BoilerplateConfig";

export type PurposeName = 'marketing' | 'basic';
export type PurposeReasons = 'Marketing' | 'Consent'

export const Purposes: Record<PurposeName, Payload<any>> = // Purpose gives error for 'enabled' TODO: sort out purposes...
    {
        'marketing': {
            customerAttributes: ["firstName", "primaryEmail", "lastName"],
            reason: "Marketing" as PurposeReasons,
            externalId: "123456",
            name: "Marketing",
        },

        'basic': {
            customerAttributes: ["Purchase Sum" as ActivityIndicator, "VIP" as SegmentName],
            reason: "Consent" as PurposeReasons,
            externalId: "78910",
            name: 'Basic'
        }
    }
