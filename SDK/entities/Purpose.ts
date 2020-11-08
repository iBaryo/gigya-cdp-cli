import {Entity, Id} from './common';
import {WithBusinessUnitId} from './BusinessUnit';
import {SegmentName} from "./Segment";
import {ActivityIndicatorId} from "./ActivityIndicator";

export type PurposeId = Id;

export interface Purpose extends Entity<PurposeId>, WithBusinessUnitId {
  externalId: string;
  reason: string;
  customerAttributes?: string[];
  customerSegments?: SegmentName[];
  customerActivityIndicators?: ActivityIndicatorId[];
  customerActivities?: Record<Id, string[]>;
}
