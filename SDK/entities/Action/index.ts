import {Entity, Id, Payload} from "../common";
import {PurposeId} from "../Purpose";
import {JSONSchema7} from "json-schema";
import {ActionMapping} from "./ActionMapping";
import {WithConfigValues, WithResourcePath} from "../common/config";

export type ActionId = Id;

export interface Index extends Entity<ActionId>, WithResourcePath, /*WithConfigSchema,*/ WithConfigValues {
  category: string;
  purposeIds: PurposeId[];
}

interface ActionsEndpoints {
  '/businessUnits/$bUnit/applications/$appId/actions': {
    GET: (bUnit: Id, appId: Id) => Promise<Index[]>;
    // POST: (bUnit: Id, applicationId: Id, payload: Payload<Connector>) => Promise<Connector>;
  };

  '/businessUnits/$bUnit/applications/$appId/actions/$actionId': {
    GET: (bUnit: Id, applicationId: Id, actionId: Id) => Promise<Index & { schema: JSONSchema7 }>;
    PUT: (bUnit: Id, applicationId: Id, actionId: Id, payload: Payload<Index>) => Promise<Index>;
    DELETE: (bUnit: Id, applicationId: Id, actionId: Id) => Promise<void>;
  };

  '/businessUnits/$bUnit/applications/$appId/actions/$actionId/schema': {
    GET: (bUnit: Id, applicationId: Id, actionId: Id) => Promise<JSONSchema7>;
    POST: (bUnit: Id, applicationId: Id, actionId: Id, schema: JSONSchema7) => Promise<JSONSchema7>; // upsert
  };

  '/businessUnits/$bUnit/applications/$appId/actions/$actionId/mapping': {
    GET: (bUnit: Id, applicationId: Id, actionId: Id) => Promise<ActionMapping[]>;
    POST: (bUnit: Id, applicationId: Id, actionId: Id, payload: ActionMapping[]) => Promise<ActionMapping[]>; // upsert
  };

  '/businessUnits/$bUnit/application/$appId/action/$actionId/activate': {
    POST: (bUnit: Id, appId: Id, actionId: Id, customer: object) => void;
  }
}
