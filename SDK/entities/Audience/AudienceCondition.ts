import {Condition} from "../Condition/Condition";
import {
    ActivityIndicatorStateCondition,
    ProfileStateCondition, PurposeCondition,
    SegmentStateCondition
} from "../Condition/EntityCondition";

export type AudienceCondition = Condition<
    ProfileStateCondition                   // no change
    | SegmentStateCondition                 // only "in"
    | ActivityIndicatorStateCondition       // no change
    | PurposeCondition
    >;
