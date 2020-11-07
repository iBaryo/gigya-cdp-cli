import {Entity, Id} from "../common";
import {ActivityIndicatorRuleCondition} from "./ActivityIndicatorRuleCondition";
import {CalculationMethod} from "./CalculationMethod";
import {DateRange} from "./DateRange";

export type ActivityIndicatorId = Id;
export interface ActivityIndicator extends Entity<ActivityIndicatorId> {
  schemaId: string;
  // activity: string; // TODO: ActivityId?
  dateRange: DateRange;
  calculationMethod: CalculationMethod;
  condition: object; // Waiting for backend:  ActivityIndicatorRuleCondition
}

