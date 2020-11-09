import {EntityApi, EntityDef} from "./ts-rest-client";
import {
    Action,
    ActivityIndicator,
    Application,
    BusinessUnit, Connector,
    Event,
    MergeRule,
    Segment,
    View,
    Workspace
} from "./entities";
import {EventMapping} from "./entities/Event/EventMapping";
import {EventSchedule} from "./entities/Event/EventSchedule";
import {MatchingRule, MatchingRulePriority} from "./entities/MatchingRule";
import {ActionMapping} from "./entities/Action/ActionMapping";

export type CDPEntitiesApi = {
    workspaces: EntityApi<EntityDef<Workspace>, {
        applibrary: EntityApi<EntityDef<Connector>>,
        global: EntityApi<never, {
            applibrary: EntityApi<EntityDef<Connector>>,
        }>;
    }>,
    businessunits: EntityApi<EntityDef<BusinessUnit>, {
        activityIndicators: EntityApi<EntityDef<ActivityIndicator>>;
        segments: EntityApi<EntityDef<Segment>>;
        applications: EntityApi<EntityDef<Application>, {

            dataevents: EntityApi<EntityDef<Event>, {
                mapping: EntityApi<EntityDef<EventMapping[]>>;
                schedule: EntityApi<EntityDef<EventSchedule>>;
                event: EntityApi;
                activate: EntityApi;
            }>;

            actions: EntityApi<EntityDef<Action>, {
                mapping: EntityApi<EntityDef<ActionMapping[]>>;
                activate: EntityApi;
            }>;

        }>;
        views: EntityApi<EntityDef<View>, {
            matchRules: EntityApi<EntityDef<MatchingRule>>;
            matchRulesPriority: EntityApi<EntityDef<MatchingRulePriority>>;

            mergeRules: EntityApi<EntityDef<MergeRule>>;
        }>;
    }>;
};
