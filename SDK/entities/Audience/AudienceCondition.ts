import {Condition} from "../common/Condition";
import {
    ActivityIndicatorStateCondition,
    ProfileStateCondition, PurposeCondition,
    SegmentStateCondition
} from "../common/Condition/EntityCondition";

export type AudienceCondition = Condition<
    ProfileStateCondition                   // no change
    | SegmentStateCondition                 // only "in"
    | ActivityIndicatorStateCondition       // no change
    | PurposeCondition
    >;
