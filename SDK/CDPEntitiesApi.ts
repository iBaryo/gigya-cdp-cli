import {EntityApi, EntityDef} from "./ts-rest-client";
import {
    Action,
    ActivityIndicator,
    Application,
    BusinessUnit,
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
    workspaces: EntityApi<EntityDef<Workspace>>,
    businessunits: EntityApi<EntityDef<BusinessUnit>, {
        activityIndicators: EntityApi<EntityDef<ActivityIndicator>>;
        segments: EntityApi<EntityDef<Segment>>;
        applications: EntityApi<EntityDef<Application>, {

            dataevents: EntityApi<EntityDef<Event>, {
                mapping: EntityApi<EntityDef<EventMapping & any>>;
                schedule: EntityApi<EntityDef<EventSchedule & any>>;
                event: EntityApi<EntityDef<any>>;
                activate: EntityApi<EntityDef<any>>;
            }>;

            actions: EntityApi<EntityDef<Action>, {
                mapping: EntityApi<EntityDef<ActionMapping & any>>;
                activate: EntityApi<EntityDef<any>>;
            }>;

        }>;
        views: EntityApi<EntityDef<View>, {
            matchRules: EntityApi<EntityDef<MatchingRule>>;
            matchRulesPriority: EntityApi<EntityDef<MatchingRulePriority & any>>;

            mergeRules: EntityApi<EntityDef<MergeRule & any>>;
        }>;
    }>;
};
