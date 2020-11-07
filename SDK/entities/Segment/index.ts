import {Entity, Id} from '../common';
import {Condition} from "../Condition/Condition";
import {ActivityIndicatorStateCondition, ProfileStateCondition} from "../Condition/EntityCondition";

export const Index = 'Segment';

export type SegmentId = Id;

export interface Segment extends Entity<SegmentId> {
  values: Array<{
    condition: object; // Waiting for backend:  SegmentRuleCondition
    value: string;
  }>;
}

export type SegmentRuleCondition = Condition<
    ProfileStateCondition
    | ActivityIndicatorStateCondition
    >;
