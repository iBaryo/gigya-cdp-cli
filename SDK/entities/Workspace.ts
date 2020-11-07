import {Entity, Id} from './common';

export const Workspace = 'Workspace';

export type WorkspaceId = Id;

export interface Workspace extends Entity<WorkspaceId> {
  tenantId: string | number;
  isProduction?: boolean;
  noBusinessUnits?: boolean;
}
