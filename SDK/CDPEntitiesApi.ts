import {EntityApi, EntityDef} from "./ts-rest-client";
import {Application, BusinessUnit, Event, Workspace} from "./entities";

export type CDPEntitiesApi = {
    workspaces: EntityApi<EntityDef<Workspace>>,
    businessunits: EntityApi<EntityDef<BusinessUnit>, {
        applications: EntityApi<EntityDef<Application>, {
            dataevents: EntityApi<EntityDef<Event>, {
                event: EntityApi<EntityDef<any>>
            }>;
        }>;
    }>;
};
