import {Entity, Id} from './common';
import {BusinessUnitId} from './BusinessUnit';

export const Purpose = 'Purpose';

export type PurposeId = Id;

export interface Purpose extends Entity<PurposeId> {
  businessUnitId: BusinessUnitId;
  externalId: string;
  reason: string;
  customerAttributes?: string[];
  customerSegments?: string[];
  customerActivityIndicators?: string[];
  customerActivities?: Record<string, string[]>;
}
