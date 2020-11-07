import { BusinessUnitId } from './BusinessUnit';
import {Id} from "./common";

export type ViewId = Id;

export interface View {
  id: ViewId
  type: string;
  businessUnitId: BusinessUnitId;
  name: string;
}
