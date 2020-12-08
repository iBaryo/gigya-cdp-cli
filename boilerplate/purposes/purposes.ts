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

export const Purposes: Record<PurposeName, Payload<Purpose>> = // Purpose gives error for 'enabled' TODO: WHY LIKE THIS 'ANY' ZOE
    {
        'marketing': {
            customerAttributes: ["firstName", "primaryEmail", "lastName"] as ProfileFieldName[],
            reason: "Marketing" as PurposeReasons,
            externalId: "123456",
            name: "marketing",
        },

        'basic': {
            customerAttributes: ["Purchase Sum" as ActivityIndicator, "VIP" as SegmentName],
            reason: "Consent" as PurposeReasons,
            externalId: "78910",
            name: 'basic'
        }
    }
