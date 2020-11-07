import {Entity, Id} from '../common';
import {ActivityIndicatorStateCondition, Condition, ProfileStateCondition} from "../common/Condition";

export type SegmentId = Id;

export interface Segment extends Entity<SegmentId> {
    values: Array<{
        condition: object; // Waiting for backend:  SegmentRuleCondition
        value: string;
    }>;
}

export type SegmentRuleCondition = Condition<ProfileStateCondition
    | ActivityIndicatorStateCondition>;
