import {Entity, Id} from "../common";
import {PurposeId} from "../Purpose";
import {ApplicationId} from "../Application";
import {Schema} from "../common/schema";

export type EventId = Id;

export interface Event extends Entity<EventId>, Schema {
    applicationId: ApplicationId;
    purposeIds: PurposeId[];
    dataType: EventType;
}

export enum EventType {
    firstPartyCrmData = 0,
    visitorData = 1,
    offlineData = 2,
    thirdPartyData = 3
}
