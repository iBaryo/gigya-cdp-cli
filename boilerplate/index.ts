import {CDP} from "../gigya-cdp-sdk";
import {
    ActivityIndicator,
    BusinessUnitId,
    CustomerSchema,
    SchemaType,
    Segment,
    Application, DirectApplication, CloudStorageApplication, ApplicationId, Connector,
} from "../gigya-cdp-sdk/entities";
import {boilerplateDirectEvents} from "./Events/Direct";
import {profileSchema as boilerplateProfileSchema} from "./schemas/ProfileSchema";
import {ActivityName, activitySchemas as boilerplateActivitySchemas} from "./schemas/ActivitiesSchemas";
import {purchaseSum as boilerplateActivityIndicator} from "./ActivityIndicators/PurchaseSum";
import {VIPSegment} from "./Segments/VIPSegment";
import {config, DirectEventName} from "./BoilerplateConfig";
import {CampaignAudience as boilerplateAudience} from "./Audiences/AudienceCondition";
import {Audience} from "../gigya-cdp-sdk/entities/Audience";
import {defaultDirectApplication as boilerplateDirectApplication} from "./Applications/defaultDirectApplication";
import {WithType} from "../gigya-cdp-sdk/entities/common";
import {Purposes as boilerplatePurposes} from "./purposes/purposes";
import {matchingRule} from "./MatchRules/matchRules";
import {
    cloudStorageApplications as boilerplateCloudStorageApplications,
    CSType
} from "./Applications/defaultCloudStorageApplications";
import {boilerplateCloudStorageEvent} from "./Events/CloudStorage";
import {terminal} from "terminal-kit";
import {JSONSchema7, JSONSchema7Object} from "json-schema";
import {EventMapping} from "../gigya-cdp-sdk/entities/Event/EventMapping";
import {ServerOnlyFields} from "../gigya-cdp-sdk/CDPEntitiesApi";
import {createArray, createFakeEventForIdentifier, JSONSchemaFaker, resolveFake} from "../utils/schema";
import {defaultSchemaPropFakers, fakify} from "json-schema-fakify";
import {initStore} from "../secure-store";
import {WithResources} from "../gigya-cdp-sdk/entities/Application/ApplicationResource";
import {keepUnique} from "./utils/helper-functions";


const isEqual = require('lodash/isEqual');
const _ = require('lodash')

/*
       1. always extend, never delete
       2. log operations
       3. only update if there a change is required, e.g. if the current schema already contains the boilerplate schema then no need to update.
       4. override users config if it does not make sense to keep it.
 */

export function createBoilerplate(sdk: CDP) {
    return {
        for(bUnitId: BusinessUnitId) {
            const bOps = sdk.api.businessunits.for(bUnitId);

            return {

                schemas: {

                    async alignProfile() {

                        terminal.colorRgb(255, 192, 203)('~~~~~~~~~ aligning Profile Schema');
                        terminal('\n');

                        const profileSchemaEntity = await bOps.customerschemas.getAll()
                            .then(schemas => schemas.find(s => s.schemaType == SchemaType.Profile));

                        let alignProfilePromise: Promise<CustomerSchema>;
                        if (!profileSchemaEntity) {
                            alignProfilePromise = bOps.customerschemas.create({
                                name: "Profile",
                                schema: boilerplateProfileSchema,
                                schemaType: SchemaType.Profile
                            });
                        } else {
                            const profileFields = Object.keys(profileSchemaEntity.schema.properties);
                            const boilerplateProfileFields = Object.keys(boilerplateProfileSchema.properties);
                            const fieldDiffs = boilerplateProfileFields.filter(f => !profileFields.includes(f));

                            alignProfilePromise = !fieldDiffs.length ?
                                Promise.resolve(profileSchemaEntity)
                                : bOps.customerschemas.for(profileSchemaEntity.id).update({
                                    name: "Profile",
                                    schema: {
                                        ...profileSchemaEntity.schema as Object,
                                        properties: {...boilerplateProfileSchema.properties, ...profileSchemaEntity.schema.properties}
                                    },
                                    schemaType: SchemaType.Profile
                                });
                        }

                        const alignedProfile = await alignProfilePromise;
                        terminal('\n');
                        terminal.colorRgb(255, 192, 203)('~~~~~ aligned Profile Schema:');
                        terminal('\n');
                        console.log(alignedProfile)
                        terminal('\n');

                    },


                    async alignActivities() {

                        terminal.colorRgb(215, 95, 175)(`~~~~~~~~~ aligning Activities Schema`);
                        terminal('\n');

                        let alignActivityPromise: Promise<CustomerSchema>;
                        const customerSchemas = await bOps.customerschemas.getAll();

                        for (const [activity, boilerplateSchema] of Object.entries(boilerplateActivitySchemas)) {
                            const activitySchema = customerSchemas.find(s => {
                                return s.name == activity && s.schemaType == SchemaType.Activity
                            });
                            if (!activitySchema) {
                                alignActivityPromise = bOps.customerschemas.create({
                                    name: activity,
                                    schema: boilerplateSchema,
                                    schemaType: SchemaType.Activity
                                });
                            } else {
                                const remoteActivitySchema = activitySchema.schema;
                                const remoteSchemaProperties = Object.keys(remoteActivitySchema.properties);
                                const fieldDiffs = Object.keys(boilerplateSchema.properties)
                                    .filter(f => !remoteSchemaProperties.includes(f));


                                alignActivityPromise = !fieldDiffs.length ?
                                    Promise.resolve(activitySchema)
                                    : bOps.customerschemas.for(activitySchema.id).update({
                                        name: activity,
                                        schema: {
                                            ...remoteActivitySchema as Object,
                                            properties: {
                                                ...remoteActivitySchema.properties,
                                                ...boilerplateSchema.properties
                                            } //order = priority => lower, higher
                                        },
                                        schemaType: SchemaType.Activity
                                    });
                            }
                            const alignedActivity = await alignActivityPromise;
                            terminal.colorRgb(215, 95, 175)(`~~~~~~~~ aligned ${activity} Activity Schema`);
                            terminal('\n');
                            console.log(alignedActivity);
                        }
                    }
                },

                matchRules: {
                    async alignMatchRules() {
                        terminal.colorRgb(255, 135, 215)('~~~~~~~ aligning Match Rules');
                        terminal('\n');

                        const view = await bOps.views.getAll().then(views => views
                            .find(v => v.type == "Marketing"));
                        const vOps = bOps.views.for(view.id);
                        const remoteMatchRules = await vOps.matchRules.getAll();

                        const masterDataIdMR = remoteMatchRules?.find(matchRules => matchRules.attributeName == config.commonIdentifier);

                        const alignedMatchRules = !masterDataIdMR ? await vOps.matchRules.create({
                            attributeName: config.commonIdentifier,
                            name: config.commonIdentifier,
                            ucpResolutionPolicy: 'merge',
                            // if they are not equal, update
                            // if they are equal, don't do anything
                        }) : (!isEqual(masterDataIdMR, matchingRule) ??
                            (await vOps.matchRules.for(masterDataIdMR.id).update({
                                attributeName: config.commonIdentifier, // this seems too explicit if I have already created an interface, but ...masterDataIdMR does not work
                                name: config.commonIdentifier,
                                ucpResolutionPolicy: 'merge',
                            })));

                        terminal.colorRgb(255, 135, 215)('~~~~~~ aligned Match Rules!');
                        terminal('\n');
                        console.log(alignedMatchRules);
                    },
                }, // masterDataId

                activityIndicators: {
                    async align() {
                        terminal.colorRgb(255, 215, 215)(`~~~~~~~~ aligning Activity Indicator!`);
                        terminal('\n');

                        let alignedActivityIndicatorPromise: Promise<ActivityIndicator>;

                        const [remoteActivitySchema, remoteActivityIndicator] = await Promise.all([
                            bOps.customerschemas.getAll().then(schemas => schemas.find(s => s.name == ('Orders' as ActivityName))),
                            bOps.activityIndicators.getAll().then(a => a.find(ind => (config.activityIndicators.includes(ind.name))))
                        ]);

                        if (!remoteActivityIndicator) {
                            alignedActivityIndicatorPromise = bOps.activityIndicators.create({
                                ...boilerplateActivityIndicator,
                                schemaId: remoteActivitySchema.id,
                            });
                        } else {
                            const fieldDiffs = Object.entries(boilerplateActivityIndicator)
                                .find(f => !Object.entries(remoteActivityIndicator).includes(f));

                            alignedActivityIndicatorPromise = !fieldDiffs.length ?
                                Promise.resolve(remoteActivityIndicator)
                                : bOps.activityIndicators.for(remoteActivityIndicator.id).update({
                                    ...boilerplateActivityIndicator,
                                    schemaId: remoteActivitySchema.id,
                                });
                        }
                        const alignedActivityIndicator = await alignedActivityIndicatorPromise;
                        terminal('\n');
                        terminal.colorRgb(255, 215, 215)('~~~~~~~ aligned Activity Indicator:');
                        terminal('\n');
                        console.log(alignedActivityIndicator);
                    },
                }, // Standard: Total Orders & Total Page-Views.. Purchase Sum

                segments: {
                    async align() {
                        terminal.colorRgb(215, 95, 135)('~~~~~~~ aligning Segments');
                        terminal('\n');

                        let alignedSegmentPromise: Promise<Segment>;

                        const remoteSegment = await bOps.segments.getAll().then(segments => segments.find(s => s.name == VIPSegment.name));
                        //get the VIP remote segment and see if its values are the same
                        // values are the conditions with their associated value
                        if (remoteSegment) {
                            // if all 3 are not the same, update the segment to be the boilerplateVIPSegment
                            if ((remoteSegment.values.length === VIPSegment.values.length) &&
                                VIPSegment.values.every(segmentValue =>
                                    remoteSegment.values.some(remoteValue => isEqual(segmentValue, remoteValue)))) {
                                alignedSegmentPromise = Promise.resolve(remoteSegment)
                            } else {
                                alignedSegmentPromise = bOps.segments.for(remoteSegment.id).update({
                                    ...VIPSegment
                                });
                            }
                        } else {
                            alignedSegmentPromise = bOps.segments.create({
                                ...VIPSegment
                            });
                        }
                        const alignedSegment = await alignedSegmentPromise

                        terminal.colorRgb(215, 95, 135)('~~~~~~ aligned Segment: ');
                        terminal('\n');
                        console.log(alignedSegment);
                    }
                }, // VIP

                purposes: { //basic, marketing
                    async align() {
                        terminal.colorRgb(255, 192, 203)('~~~~~~~~ aligning Purposes');
                        terminal('\n');

                        const remotePurposes = await bOps.purposes.getAll();

                        let remotePurpose: typeof remotePurposes[0];

                        // changes over here
                        Object.entries(boilerplatePurposes)
                            .map(async ([boilerplatePurposeName, boilerplatePurposePayload]) => {


                                if (remotePurposes.length < 1 || !remotePurposes) {
                                    remotePurpose = await bOps.purposes.create({
                                        ...boilerplatePurposePayload
                                    });
                                } else {
                                    remotePurpose = remotePurposes.find(p => p.name == boilerplatePurposeName);
                                }

                                const purposeId = remotePurpose.id;

                                const {
                                    id,
                                    created,
                                    updated,
                                    ...normalizedRemotePurpose
                                } = remotePurpose;


                                // if remote purpose is not the same as boilerplate, update the remote
                                if (!isEqual(normalizedRemotePurpose, boilerplatePurposePayload)) {
                                    // @ts-ignore
                                    remotePurpose = await bOps.purposes.update({
                                        id: purposeId,
                                        ...boilerplatePurposePayload
                                    })
                                }
                                terminal.colorRgb(255, 192, 203)('~~~~~~~~ aligned Purpose:');
                                console.log(remotePurpose)
                                return remotePurpose
                            })
                    }
                },

                applications: { //Direct Test = 2 Events, 1 Application per CloudStorage = 1 event per CS (same)
                    async alignDirect() {
                        terminal('\n');
                        terminal.colorRgb(255, 135, 135)("~~~~~~~ aligning Direct applications");
                        terminal('\n');

                        let remoteApplications = await bOps.applications.getAll();

                        let remoteApplication = remoteApplications?.find(app =>
                            app.type === ('Direct') && app.name === boilerplateDirectApplication.name);

                        type DirectApplicationPayload = Omit<DirectApplication, ServerOnlyFields>;

                        const remoteDirectApplicationPayload: DirectApplicationPayload = {
                            type: 'Direct',
                            enabled: true,
                            logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                            name: "Direct Test Application: Boilerplate",
                            description: "R&D test application for creating customers"
                        }

                        let remoteApplicationId = remoteApplication?.id

                        // no existing remoteApp --> create one
                        if (!remoteApplication) {
                            remoteApplication = await bOps.applications.create(remoteDirectApplicationPayload);
                            remoteApplicationId = remoteApplication.id;
                        }

                        const appOps = bOps.applications.for(remoteApplicationId)

                        const [remoteSchemas, remoteDirectEvents, bUnitPurposes] = await Promise.all([
                            bOps.customerschemas.getAll(),
                            appOps.dataevents.getAll(),
                            bOps.purposes.getAll()
                        ]);

                        function normalizeMappings(mappings, targetSchemaId?) {
                            let adjustedMappings = []
                            mappings?.map(mapping => {
                                adjustedMappings.push({
                                    sourceField: mapping.sourceField ? mapping.sourceField : mapping.srcField,
                                    targetField: mapping.targetField,
                                    target: targetSchemaId || mapping.target
                                });
                            });
                            return adjustedMappings
                        }


                        async function checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping) {
                            // get the mappings for the remote direct event
                            let remoteMappings = await appOps.dataevents.for(remoteDirectEventId).mappings.get() as EventMapping[];
                            let mappingsArray = [];

                            Object
                                .entries(boilerplateMapping)
                                .map(async ([schemaName, mappings]) => {
                                    // find the id of the remote schema who has the same name as our schema.. eg 'Profile' / 'Orders' / 'Page-Views'
                                    const targetSchemaId = (remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)).id
                                    if (!targetSchemaId)
                                        new Error(`mapping set to a non existing schema: ${schemaName}`);

                                    const adjustedBoilerplateMappings = normalizeMappings(mappings, targetSchemaId);
                                    mappingsArray.push(adjustedBoilerplateMappings);
                                    mappingsArray.flat();
                                });

                            // check if remote mappings and boilerplate mappings are equal
                            const isArrayEqual = function (bpMappings, rMappings) {
                                return _(bpMappings).differenceWith(rMappings, _.isEqual).isEmpty();
                            };

                            if (remoteMappings.length < 1) {
                                await appOps.dataevents.for(remoteDirectEventId).mappings.create(
                                    mappingsArray.flat()
                                )
                            } else {
                                const adjustedRemoteMappings = normalizeMappings(remoteMappings)
                                if (!isArrayEqual(mappingsArray, adjustedRemoteMappings)) {
                                    await appOps.dataevents.for(remoteDirectEventId).mappings.create(
                                        mappingsArray.flat()
                                    )
                                }
                            }
                            terminal.colorRgb(255, 135, 135)(`aligned Direct Event Mappings`);
                            terminal('\n');
                        }

                        function adjustBoilerplateEventForPurposeIds(boilerplateEvent) {
                            // change purposeNames to purposeIds in boilerplateEvent
                            const eventPurposeIds = boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes
                                .find(p => p.name == purposeName).id)
                                .filter(Boolean);
                            return {
                                ...boilerplateEvent,
                                purposeIds: eventPurposeIds
                            };
                        }

                        async function adjustRemoteEventForComparisonWithAdjustedBpEvent(boilerplateEvent, remoteEvent) {

                            let remoteEventToCompare = {}
                            Object.keys(boilerplateEvent).forEach(k => {
                                remoteEventToCompare[k] = remoteEvent[k]
                            });
                            return remoteEventToCompare
                        }

                        async function createRemoteDirectEvent(boilerplateEvent) {
                            const adjustedBoilerplateEvent = adjustBoilerplateEventForPurposeIds(boilerplateEvent);
                            return appOps.dataevents.create({
                                ...adjustedBoilerplateEvent,
                                schema: JSON.stringify(boilerplateEvent.schema),
                                purposeIds: adjustedBoilerplateEvent.purposeIds
                            });
                        }

                        function updateRemoteDirectEvent(boilerplateEvent, remoteEvent) {
                            return appOps.dataevents.for(remoteEvent.id).update({
                                ...boilerplateEvent,
                                schema: JSON.stringify(boilerplateEvent.schema),
                                purposeIds: boilerplateEvent.purposeIds
                            });
                        }

                        terminal.colorRgb(255, 135, 135)(`aligned Direct Application`);
                        terminal('\n');
                        console.log(remoteApplication);

                        await Promise.all(
                            Object.entries(boilerplateDirectEvents)
                                .map(async ([eventName, {
                                    payload: boilerplateEvent, mapping: boilerplateMapping
                                }]) => {
                                    let remoteDirectEventId = remoteDirectEvents?.find(ev => ev.name == eventName)?.id;
                                    // if no remote event, create them
                                    // if there is a remoteEvent, check it and update/keep
                                    if (!remoteDirectEventId) {
                                        const remoteDirectEvent = await createRemoteDirectEvent(boilerplateEvent);
                                        remoteDirectEventId = remoteDirectEvent.id;
                                        terminal.colorRgb(175, 0, 135)(`aligned ${eventName} Direct Event`);
                                        terminal('\n');
                                    }

                                    const remoteEvent = await appOps.dataevents.for(remoteDirectEventId).get();
                                    const adjustedBPEventForPurposeIds = adjustBoilerplateEventForPurposeIds(boilerplateEvent);
                                    const adjustedRemoteEventForComparisonWithAdjustedBpEvent = await adjustRemoteEventForComparisonWithAdjustedBpEvent(boilerplateEvent, remoteEvent);
                                    if (!isEqual(adjustedRemoteEventForComparisonWithAdjustedBpEvent, adjustedBPEventForPurposeIds)) {
                                        await updateRemoteDirectEvent(adjustedBPEventForPurposeIds, remoteEvent);
                                        terminal.colorRgb(175, 0, 135)(`aligned ${eventName} Direct Event`);
                                        terminal('\n');
                                    }
                                    await checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping);
                                }));

                    },

                    async alignCloudStorage() {
                        const [remoteSchemas, bUnitPurposes] = await Promise.all([
                            bOps.customerschemas.getAll(),
                            bOps.purposes.getAll()
                        ]);

                        const eventPurposeIds = boilerplateCloudStorageEvent.payload.purposeIds
                            .map(purposeName => (bUnitPurposes.find(p => p.name == purposeName)).id)
                            .filter(Boolean);

                        function getAppViewModel(application) {
                            return {
                                type: application.type,
                                name: application.name,
                                category: application.category,
                            }
                        }

                        function adjustBoilerplateEventForPurposeIdsAndName(remoteEvent) {
                            // change purposeNames to purposeIds in boilerplateEvent
                            return {
                                payload: {
                                    ...boilerplateCloudStorageEvent.payload,
                                    name: `${boilerplateCloudStorageEvent.payload.name} ${remoteEvent.name}`,
                                    purposeIds: eventPurposeIds
                                }
                            }
                        }

                        function normalizeMappings(mappings, targetSchemaId?) {
                            return mappings?.map(mapping => {
                                return {
                                    sourceField: mapping.sourceField ?
                                        mapping.sourceField :
                                        mapping.srcField,
                                    targetField: mapping.targetField,
                                    target: targetSchemaId || mapping.target
                                }
                            });
                        }


                        function createCloudStorageEvent(boilerplateEvent, remoteCloudStorageApplication) {
                            // const conf = {};
                            // for (const key of Object.keys(remoteCloudStorageApplication.configSchema.properties)) {
                            //     conf[key] = 'value';
                            // }

                            return bOps.applications.for(remoteCloudStorageApplication.id).dataevents.create({
                                ...boilerplateEvent,
                                schema: JSON.stringify(boilerplateEvent.schema),
                                purposeIds: boilerplateEvent.purposeIds,
                                configValues: remoteCloudStorageApplication.name === 'Microsoft Azure Blob' ?
                                    {
                                        // these need to be explicitly defined and cannot be taken from the connector's or application's config schema since there is a ton of irrelevant info there
                                        readContainer: "any container",
                                        readFileNameRegex: null,
                                        readFormat: null,
                                    }
                                    :
                                    boilerplateEvent.configValues
                            })
                        }

                        function adjustRemoteEventForComparisonWithAdjustedBpEvent(boilerplateEvent, remoteEvent) {

                            let remoteEventToCompare = {}
                            Object.keys(boilerplateEvent).forEach(k => {
                                remoteEventToCompare[k] = remoteEvent[k]
                            });
                            return remoteEventToCompare
                        }

                        function updateRemoteCloudStorageEvent(adjustedBoilerplateEvent, remoteCloudStorageApplicationId, remoteCloudStorageEventIdForApplication) {
                            return bOps.applications.for(remoteCloudStorageApplicationId).dataevents
                                .for(remoteCloudStorageEventIdForApplication)
                                .update({
                                    ...adjustedBoilerplateEvent,
                                    schema: JSON.stringify(adjustedBoilerplateEvent.schema),
                                    purposeIds: adjustedBoilerplateEvent.purposeIds
                                });
                        }

                        async function checkToUpdateOrCreateMappings(remoteCloudStorageEventIdForApplication, boilerplateCloudStorageEventMapping, remoteCloudStorageApplicationId) {
                            // get the mappings for the remote direct event
                            let remoteMappings = await bOps.applications.for(remoteCloudStorageApplicationId).dataevents
                                .for(remoteCloudStorageEventIdForApplication).mappings.get();

                            // find the id of the remote schema who has the same name as our schema.. eg 'Profile'
                            const targetSchemaId = (remoteSchemas.find(remoteSchema => remoteSchema.name == 'Profile')).id

                            if (!targetSchemaId)
                                new Error(`mapping set to a non existing schema: Profile`);

                            const adjustedBoilerplateMappings = normalizeMappings(boilerplateCloudStorageEventMapping['Profile'], targetSchemaId);

                            // check if remote mappings and boilerplate mappings are equal
                            // using Lodash's
                            // - differenceWith, which checks the differences between values in two arrays - returns array of the difference
                            // - isEmpty which checks for empty array - returns boolean
                            // - isEqual which checks equality of two arrays - returns boolean
                            const isArrayEqual = function (bpMappings, rMappings) {
                                return _(bpMappings).differenceWith(rMappings, _.isEqual).isEmpty();
                            };

                            if (remoteMappings.length < 1 || !remoteMappings) {
                                return bOps.applications.for(remoteCloudStorageApplicationId).dataevents
                                    .for(remoteCloudStorageEventIdForApplication).mappings.create(
                                        adjustedBoilerplateMappings
                                    )
                            } else {
                                const adjustedRemoteMappings = normalizeMappings(remoteMappings)
                                if (!isArrayEqual(adjustedBoilerplateMappings, adjustedRemoteMappings)) {
                                    await bOps.applications.for(remoteCloudStorageApplicationId).dataevents
                                        .for(remoteCloudStorageEventIdForApplication).mappings.create(
                                            adjustedBoilerplateMappings
                                        );
                                }
                            }
                        }

                        const allCloudStorageRemoteApplications = await bOps.applications.getAll().then(apps => apps.filter(app => app.type === 'CloudStorage'));

                        const remoteConnectors = await sdk.api.workspaces.for(config.workspaceId).applibrary.getAll({includePublic: true});

                        const boilerplateConnectorTypes: CSType[] = ['AWS S3', 'Microsoft Azure Blob', 'Google Cloud Storage', 'SFTP']

                        // get remote connectors that are Cloud Storage connectors
                        const remoteCloudStorageConnectors =
                            keepUnique(remoteConnectors, conn => conn.name).filter((connector: Connector) => connector.type === 'CloudStorage' && connector.enabled && (boilerplateConnectorTypes.includes(connector.name as CSType)));
                        await Promise.all(remoteCloudStorageConnectors.map(async (connector: Connector) => {
                            // get the corresponding cloud storage application

                            // get cloud storage applications created from connector
                            let remoteCloudStorageApplication = allCloudStorageRemoteApplications?.find(application => (application['originConnectorId'] === connector.id || application.name === connector.name))
                            //get the corresponding boilerplate application
                            const boilerplateCloudStorageApplication = boilerplateCloudStorageApplications[connector.name];

                            let remoteCloudStorageApplicationId: ApplicationId;
                            type CloudStorageApplicationPayload = Omit<CloudStorageApplication, ServerOnlyFields | keyof WithType<any> | keyof WithResources<any>>;

                            /**  if there is not a cloudStorageApplication of type 'azure.blob' | 'googlecloud' | 'sftp' | aws3
                             then create cloudStorageApplication
                             **/
                            if (!remoteCloudStorageApplication) {
                                const cloudStoragePayload: CloudStorageApplicationPayload = {
                                    category: "Cloud Storage",
                                    name: connector.name,
                                    description: boilerplateCloudStorageApplication.description,
                                    connectorId: connector.id,
                                    configValues: boilerplateCloudStorageApplication.configValues,
                                    enabled: true,
                                };
                                remoteCloudStorageApplication = await bOps.applications.create(cloudStoragePayload).then(app => {
                                    return bOps.applications.for(app.id).get()
                                });
                            } else {
                                remoteCloudStorageApplicationId = remoteCloudStorageApplication.id;
                                remoteCloudStorageApplication = await bOps.applications.for(remoteCloudStorageApplicationId).get();
                                // if there is a cloudStorageApplication of type 'azure.blob' | 'googlecloud' | 'sftp' | 'amazon.s3'
                                // adjust the model so that we can work with it
                                const viewModelRemoteCSApp = getAppViewModel(remoteCloudStorageApplication);
                                const viewModelCSApp = getAppViewModel(connector);
                                const boilerplateCloudStorageApplication = boilerplateCloudStorageApplications[connector.name];
                                // check if they are not equal and update to boilerplate Cloud Storage Application
                                if (!(_.isEqual(viewModelRemoteCSApp, viewModelCSApp))) {
                                    const payload: CloudStorageApplicationPayload = {
                                        category: "Cloud Storage",
                                        connectorId: connector.id,
                                        name: connector.name,
                                        enabled: true,
                                        description: boilerplateCloudStorageApplication.description,
                                        configValues: boilerplateCloudStorageApplication.configValues,
                                    };
                                    remoteCloudStorageApplication = await bOps.applications.for(remoteCloudStorageApplication.id).update(payload);
                                }
                            }

                            terminal.colorRgb(255, 175, 215)(`~~~~~~ aligning ${remoteCloudStorageApplication.name} CloudStorage Application`);
                            terminal('\n');
                            remoteCloudStorageApplicationId = remoteCloudStorageApplication.id;
                            const remoteCloudStorageEvents = await bOps.applications.for(remoteCloudStorageApplicationId).dataevents.getAll();

                            let remoteCloudStorageEventIdForApplication = remoteCloudStorageEvents.length > 0 && (remoteCloudStorageEvents?.find(event =>
                                event.name === `${boilerplateCloudStorageEvent.payload.name} ${remoteCloudStorageApplication.name}`
                            ))?.id;

                            const adjustedBoilerplateEventRecord = adjustBoilerplateEventForPurposeIdsAndName(remoteCloudStorageApplication);
                            const adjustedBoilerplateEvent = adjustedBoilerplateEventRecord.payload;

                            // if there is no id for the remote cloud storage event, create it
                            if (!remoteCloudStorageEventIdForApplication) {

                                const createdCloudStorageEvent = await createCloudStorageEvent(adjustedBoilerplateEvent, remoteCloudStorageApplication);
                                remoteCloudStorageEventIdForApplication = createdCloudStorageEvent.id;
                            }

                            // get the eventId && check if it is the same as boilerplate
                            const remoteCloudStorageEventForApplication = await bOps.applications.for(remoteCloudStorageApplicationId).dataevents
                                .for(remoteCloudStorageEventIdForApplication).get();

                            terminal.colorRgb(255, 175, 215)(`~~~~~~ aligning ${remoteCloudStorageEventForApplication.name} CloudStorage Event`);
                            terminal('\n');

                            const adjustedRemoteEventForComparisonWithAdjustedBpEvent = adjustRemoteEventForComparisonWithAdjustedBpEvent(adjustedBoilerplateEvent, remoteCloudStorageEventForApplication);

                            if (!isEqual(adjustedRemoteEventForComparisonWithAdjustedBpEvent, adjustedBoilerplateEvent)) {
                                await updateRemoteCloudStorageEvent(adjustedBoilerplateEvent, remoteCloudStorageApplicationId, remoteCloudStorageEventIdForApplication);
                            }
                            terminal.colorRgb(255, 175, 215)(`~~~~~~ aligning ${remoteCloudStorageEventForApplication.name} CloudStorage Event Mappings`);
                            terminal('\n');
                            await checkToUpdateOrCreateMappings(remoteCloudStorageEventIdForApplication, boilerplateCloudStorageEvent.mapping, remoteCloudStorageApplicationId);
                        }));
                    },

                    async alignAll() {
                        // take into account timing - use await rather than Promise.all([])
                        await this.alignDirect();
                        await this.alignCloudStorage()
                    }
                },

                audiences: {
                    async align() {
                        terminal.colorRgb(255, 95, 135)('~~~~~~~~ aligning Audience');
                        terminal('\n');

                        let audiencePromise: Promise<Audience>
                        const view = await bOps.views.getAll().then(views => views.find(v => v.type == "Marketing"));
                        const vOps = bOps.views.for(view.id);

                        const bUnitPurposes = await bOps.purposes.getAll()
                        const audiencePurposeIds = boilerplateAudience.purposeIds
                            .map(purposeName => bUnitPurposes
                                .find(p => p.name == purposeName).id).filter(Boolean);

                        const remoteAudience = await vOps.audiences.getAll().then(audiences => audiences.find(a => a.name == boilerplateAudience.name))

                        const normalizedBoilerplateAudienceForPurposeIds =
                            {
                                ...boilerplateAudience,
                                purposeIds: audiencePurposeIds
                            }

                        if (remoteAudience) {
                            if (isEqual(remoteAudience, normalizedBoilerplateAudienceForPurposeIds)) {
                                audiencePromise = Promise.resolve(remoteAudience);
                            } else {
                                audiencePromise = vOps.audiences.for(remoteAudience.id).update({
                                    ...normalizedBoilerplateAudienceForPurposeIds
                                });
                            }
                        } else {
                            audiencePromise = vOps.audiences.create({
                                ...normalizedBoilerplateAudienceForPurposeIds
                            });
                        }

                        const alignedAudience = await audiencePromise
                        terminal.colorRgb(255, 95, 135)('~~~~~ Audience aligned!');
                        terminal('\n');
                        console.log(alignedAudience)
                    }
                },
                async alignAll() {
                    terminal.bgMagenta.black('~~~~~~~~~ Aligning your Business Unit ~~~~~~~~~~');
                    terminal('\n');
                    terminal('\n');

                    await Promise.all(
                        [
                            this.schemas.alignProfile(),
                            this.schemas.alignActivities()
                        ]
                    )

                    await this.matchRules.alignMatchRules();
                    await this.activityIndicators.align();
                    await this.segments.align();
                    await this.purposes.align();
                    await this.applications.alignAll();

                    await this.audiences.align();
                },
                ingestFakeEvents: async function (
                    customersNum: number,
                    eventNames: DirectEventName[],
                    options?: Partial<{
                        delayBetweenEvents: number;
                        delayBetweenCustomers: number;
                        customersInParallel: number;
                    }>) {
                    terminal.colorRgb(255, 105, 180)(`~~~~~~~~ Ingesting Faked Events ~~~~~~~~~`);
                    terminal('\n')

                    console.log(`fetching direct app...`);
                    const directApp =
                        await bOps.applications.getAll().then(apps => apps
                            .find(app => app.name == boilerplateDirectApplication.name &&
                                (app.type == 'Direct' || app.type == 'Basic' as unknown)
                            ));

                    if (!directApp)
                        throw 'direct app not found (align business-unit with boilerplate?)';
                    const appOps =
                        bOps.applications.for(directApp.id);

                    terminal.colorRgb(255, 105, 180)(`setting fakers...`);
                    terminal('/n');

                    const fieldFakersStore = initStore<typeof defaultSchemaPropFakers>('./boilerplateFakers.json');
                    const fieldFakers = fieldFakersStore.exists() ? fieldFakersStore.get() : fieldFakersStore.set({
                        "primaryEmail": "email",
                        "primaryPhone": "phoneNumber",
                        "purchasePrice": "price",
                        "orderId": "uuid",
                        "sessionTime": "number",
                        "pageUrl": "url"
                    }, "");

                    Object.assign(defaultSchemaPropFakers, fieldFakers);

                    terminal.colorRgb(255, 105, 180)(`fetching direct events...`);
                    terminal('\n');

                    const allEvents =
                        await appOps.dataevents.getAll()
                            .then(evs => evs.filter(e => eventNames.includes(e.name)))
                            .then(evs => Promise.all(
                                evs.map(ev => appOps.dataevents.for(ev.id).get()
                                    .then(fullEvent => ({
                                        ...fullEvent,
                                        schema: fakify(getSchemaObject(fullEvent.schema))
                                    }))
                                )
                                )
                            );

                    const events = eventNames.map(name => allEvents.find(e => e.name == name)).filter(Boolean);

                    if (events.length < eventNames.length)
                        console.warn(`not all events were found (align business-unit with boilerplate?)`);

                    const identifierSchema: JSONSchemaFaker = {
                        type: 'string',
                        faker: config.commonIdentifierFaker
                    };

                    const identifiers = await Promise.all(createArray(customersNum).map(async () => ({
                        name: config.commonIdentifier,
                        value: await resolveFake(identifierSchema) as object
                    })));

                    interface CustomersEvents {
                        [customerId: string]: {
                            [eventId: string]: {
                                send(): Promise<unknown>
                            }
                        }
                    }

                    const customersEvents =
                        events.reduce((res: CustomersEvents, event) => {
                                const eventOps = appOps.dataevents.for(event.id);
                                return identifiers.reduce((res, identifier) => {
                                        const customerId = identifier.value.toString();
                                        if (!res[customerId]) {
                                            res[customerId] = {};
                                        }
                                        res[customerId][event.id] = {
                                            send: async () => {
                                                const fakeEvent = await createFakeEventForIdentifier(identifier, getSchemaObject(event.schema));
                                                console.log(fakeEvent);
                                                return eventOps.event.create(fakeEvent);
                                            }
                                        };
                                        return res;
                                    },
                                    res);
                            },
                            {});
                    if (options) {
                        // TODO: options.customersInParallel && options.delayBetweenCustomers && options.delayBetweenEvents
                    } else {
                        const results = await Promise.all(
                            Object.entries(customersEvents).map(([customerId, events]) => {
                                terminal.colorRgb(255, 105, 180)(`sending events for ${customerId}`);
                                terminal('\n');
                                return Promise.all(
                                    Object.entries(events)
                                        .map(([eventId, event]) => {
                                            return event.send();
                                        })
                                );
                            })
                        );
                        terminal.colorRgb(255, 105, 180)('~~~~~ Ingested Faked Events!');
                        terminal('\n');
                        terminal('\n');

                        terminal.bgMagenta.black('~~~~~~~~~ Business Unit is aligned! ~~~~~~~~~~');
                    }
                }
            }
        }
    };
}


function getSchemaObject(schema: string | JSONSchema7): JSONSchema7 {
    return typeof schema == 'string' ? JSON.parse(schema) : schema;
}
