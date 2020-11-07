import {Condition, SimpleCondition} from "./Condition";
import {ValueCondition, ValueStateCondition, WithArrayCondition, WithTimeRange} from "./ValueStateCondition";

export interface FieldStateCondition extends SimpleCondition, Partial<WithArrayCondition & WithTimeRange> {
    field: string;
    condition: Condition<ValueStateCondition>
}

export interface FieldCondition extends SimpleCondition, Partial<WithArrayCondition & WithTimeRange> {
    field: string;
    condition: Condition<ValueCondition>;
}
