import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {CustomerSchema, ProfileFieldName, Purpose, PurposeId, SegmentName} from "../../gigya-cdp-sdk/entities";
import {profileSchema} from "../schemas/ProfileSchema";
import {activityIndicatorSchema} from "../schemas/ActivityIndicatorSchema";
import {ActivityIndicator} from "../BoilerplateConfig";

export type PurposeName = 'marketing' | 'basic';
export type PurposeReasons = 'Marketing' | 'Consent'

export const Purposes: Record<PurposeName, Payload<any>> = // Purpose gives error for 'enabled'
    {
        'marketing': {
            customerActivities: {},
            customerActivityIndicators: [],
            customerAttributes: ["firstName", "primaryEmail", "lastName"] as Array<ProfileFieldName>,
            customerSegments: [],
            reason: ["Marketing", "Consent"] as Array<PurposeReasons>,
            externalId: "123456",
            name: "Marketing",
        },
        'basic': {
            customerActivities: {},
            customerActivityIndicators: [],
            customerAttributes: ["Purchase Sum" as ActivityIndicator, "VIP" as SegmentName],
            customerSegments: [],
            reason: "Consent" as PurposeReasons,
            externalId: "78910",
            name: 'Basic'
        }
    }
