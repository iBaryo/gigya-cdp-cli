import { BusinessUnitId } from './BusinessUnit';
import {Id} from "./common";

export const View = 'View';

export type ViewId = Id;

export interface View {
  id: ViewId
  type: string;
  businessUnitId: BusinessUnitId;
  name: string;
}
