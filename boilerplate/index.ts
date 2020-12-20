import {CDP} from "../gigya-cdp-sdk";
import {
    ActivityIndicator,
    Application,
    BusinessUnitId,
    CustomerSchema,
    Event, ProfileFieldName, PurposeId,
    SchemaType,
    Segment,
    Purpose
} from "../gigya-cdp-sdk/entities";
import {DirectEventName, boilerplateDirectEvents} from "./Events/Direct";
import {profileSchema as boilerplateProfileSchema} from "./schemas/ProfileSchema";
import {ActivityName, activitySchemas as boilerplateActivitySchemas} from "./schemas/ActivitiesSchemas";
import {purchaseSum as boilerplateActivityIndicator} from "./ActivityIndicators/PurchaseSum";
import {VIPSegment} from "./Segments/VIPSegment";
import {config} from "./BoilerplateConfig";
import {CampaignAudience as boilerplateAudience} from "./Audiences/AudienceCondition";
import {Audience} from "../gigya-cdp-sdk/entities/Audience";
import {AudienceCondition} from "../gigya-cdp-sdk/entities/Audience/AudienceCondition";
import {defaultDirectApplication} from "./Applications/defaultDirectApplication";
import {Id, Payload} from "../gigya-cdp-sdk/entities/common";
import {PurposeReasons, Purposes as boilerplatePurposes} from "./purposes/purposes";
import {matchingRule} from "./MatchRules/matchRules";
import {cloudStorageApplication, cloudStorageApplications} from "./Applications/defaultCloudStorageApplications";

const isEqual = require('lodash/isEqual');
const without = require('lodash/without');

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
                    async alignProfile() { //TODO: age vs birthdate??
                        console.log("~~~~~~~~ aligning profile schema ~~~~~~~~");

                        const profileSchemaEntity = await bOps.ucpschemas.getAll().then(schemas => schemas.find(s => s.schemaType == SchemaType.Profile));

                        let alignProfilePromise: Promise<CustomerSchema>;

                        if (!profileSchemaEntity) {
                            alignProfilePromise = bOps.ucpschemas.create({
                                enabled: true,
                                name: "Profile",
                                schema: JSON.stringify(boilerplateProfileSchema),
                                schemaType: SchemaType.Profile
                            });
                        } else {
                            const profileSchema = JSON.parse(profileSchemaEntity.schema.toString());
                            const profileFields = Object.keys(profileSchema.properties);
                            const boilerplateProfileFields = Object.keys(boilerplateProfileSchema.properties);
                            const fieldDiffs = boilerplateProfileFields.filter(f => !profileFields.includes(f));

                            alignProfilePromise = !fieldDiffs.length ?
                                Promise.resolve(profileSchemaEntity)
                                : bOps.ucpschemas.for(profileSchemaEntity.id).update({
                                    enabled: true,
                                    name: "Profile",
                                    schema: JSON.stringify({
                                        ...profileSchema,
                                        properties: {...boilerplateProfileSchema, ...profileSchema.properties}
                                    }),
                                    schemaType: SchemaType.Profile
                                });
                        }

                        const alignedProfile = await alignProfilePromise;
                        console.log('~~~~~ aligned profile:', alignedProfile);
                    },


                    async alignActivities() {
                        let alignActivityPromise: Promise<CustomerSchema>;
                        const customerSchemas = await bOps.ucpschemas.getAll();

                        for (const [activity, boilerplateSchema] of Object.entries(boilerplateActivitySchemas)) {
                            console.log(`~~~~~~ aligning ${activity} Activity`);
                            const activitySchema = customerSchemas.find(s => s.name == activity && s.schemaType == SchemaType.Activity);

                            if (!activitySchema) {
                                alignActivityPromise = bOps.ucpschemas.create({
                                    enabled: true,
                                    name: activity,
                                    schema: JSON.stringify(boilerplateSchema),
                                    schemaType: SchemaType.Activity
                                });
                            } else {
                                const remoteActivitySchema = JSON.parse(activitySchema.schema.toString());
                                const remoteSchemaProperties = Object.keys(remoteActivitySchema.properties);
                                const fieldDiffs = Object.keys(boilerplateSchema.properties).filter(f => !remoteSchemaProperties.includes(f));

                                alignActivityPromise = !fieldDiffs.length ?
                                    Promise.resolve(activitySchema)
                                    : bOps.ucpschemas.for(activitySchema.id).update({
                                        enabled: true,
                                        name: activity,
                                        schema: JSON.stringify({
                                            ...remoteActivitySchema,
                                            properties: {...remoteActivitySchema.properties, ...boilerplateSchema.properties} //order = priority => lower, higher
                                        }),
                                        schemaType: SchemaType.Activity
                                    });
                            }
                            const alignedActivity = await alignActivityPromise;
                            console.log(`~~~~~~~~aligned ${activity}`, alignedActivity);
                        }
                    }
                },

                async alignMatchRules() {

                    const view = await bOps.views.getAll().then(views => views.find(v => v.type == "Marketing"));
                    const vOps = bOps.views.for(view.id);
                    const remoteMatchRules = await vOps.matchRules.getAll();

                    const masterDataIdMR = remoteMatchRules?.find(matchRules => matchRules.attributeName == config.commonIdentifier);

                    !masterDataIdMR ? await vOps.matchRules.create({
                        attributeName: config.commonIdentifier,
                        name: config.commonIdentifier,
                        ucpResolutionPolicy: 'merge',
                        // if they are not equal, update
                        // if they are equal, don't do anything
                    }) : (!isEqual(masterDataIdMR, matchingRule) ?? (await vOps.matchRules.for(masterDataIdMR.id).update({
                        attributeName: config.commonIdentifier, // this seems too explicit if I have already created an interface, but ...masterDataIdMR does not work
                        name: config.commonIdentifier,
                        ucpResolutionPolicy: 'merge',
                    })));
                },


                activityIndicators: {
                    async align() {
                        console.log('~~~~~~~ aligning Activity Indicators');

                        let alignedActivityIndicatorPromise: Promise<ActivityIndicator>

                        const [remoteActivitySchema, remoteActivityIndicator] = await Promise.all([
                            bOps.ucpschemas.getAll().then(schemas => schemas.find(s => s.name == ('Orders' as ActivityName))),
                            bOps.activityIndicators.getAll().then(a => a.find(ind => (config.activityIndicators.includes(ind.name))))
                        ]);

                        // haven't taken into account if more than one activity indicator... if bpConfig changes //TODO
                        if (!remoteActivityIndicator) {
                            alignedActivityIndicatorPromise = bOps.activityIndicators.create({
                                ...boilerplateActivityIndicator,
                                schemaId: remoteActivitySchema.id,
                            });
                        } else {
                            const fieldDiffs = Object.entries(boilerplateActivityIndicator).find(f => !Object.entries(remoteActivityIndicator).includes(f));

                            alignedActivityIndicatorPromise = !fieldDiffs.length ?
                                Promise.resolve(remoteActivityIndicator)
                                : bOps.activityIndicators.for(remoteActivityIndicator.id).update({
                                    ...boilerplateActivityIndicator,
                                    schemaId: remoteActivityIndicator.id,
                                });
                        }
                        const alignedActivityIndicator = await alignedActivityIndicatorPromise;
                        console.log('~~~~~~~ aligned Activity Indicator:', alignedActivityIndicator);
                    },
                },

                segments: {
                    async align() {

                        let alignedSegmentPromise: Promise<Segment>;

                        console.log('~~~~~~~ aligning segment');
                        const remoteSegment = await bOps.segments.getAll().then(segments => segments.find(s => s.name == VIPSegment.name));

                        if (remoteSegment) {

                            let numberMatches = 0;
                            let i = 2;

                            while (i >= 0) {
                                if (isEqual(remoteSegment.values[i].condition, VIPSegment.values[i].condition)) {
                                    numberMatches += 1
                                }
                                i--
                            }
                            alignedSegmentPromise = numberMatches == 3 ? Promise.resolve(remoteSegment) : bOps.segments.for(remoteSegment.id).update({
                                ...VIPSegment
                            });

                        } else {
                            alignedSegmentPromise = bOps.segments.create({
                                ...VIPSegment
                            });
                        }
                        const alignedSegment = await alignedSegmentPromise
                        console.log('~~~~~~ segment is aligned!', alignedSegment.values);
                    }
                },

                purposes: {
                    async align() {
                        console.log('~~~~~~  aligning Purposes')

                        const remotePurposes = bOps.purposes.getAll()

                        let finalPurpose: Payload<Purpose>

                        Object.entries(boilerplatePurposes).map(async ([boilerplatePurposeName, boilerplatePurposePayload]) => {

                            const purposeId = (await remotePurposes.then(purposes => purposes.find(p => p.name == boilerplatePurposeName)))?.id

                            const cleanedRemotePurposes = await remotePurposes.then(purposes => purposes.map(purpose => {
                                delete purpose.id
                                delete purpose.created;
                                delete purpose.updated;
                                return purpose
                            }))

                            const purpose = cleanedRemotePurposes.find(p => p.name == boilerplatePurposeName)


                            if (!purpose || !purposeId) {
                                finalPurpose = await bOps.purposes.create({
                                    ...boilerplatePurposePayload
                                })
                            }

                            // if remote purpose is not the same as boilerplate, update the remote
                            if (!isEqual(purpose, boilerplatePurposePayload)) {
                                // @ts-ignore
                                await bOps.purposes.update({
                                    id: purposeId,
                                    ...boilerplatePurposePayload
                                })
                            }
                            console.log('~~~~~~~~ Purposes aligned!', finalPurpose)
                        })
                    }
                },

                applications: { //TODO: mapping for events
                    async alignDirect() {

                        console.log("~~~~~~~ aligning Direct applications");
                        let remoteApplications = await bOps.applications.getAll();

                        let remoteApplicationId = (remoteApplications?.find(app =>
                            app.type == defaultDirectApplication.type && app.name == defaultDirectApplication.name))?.id

                        // no existing remoteApp --> create one
                        if (!remoteApplicationId) {
                            console.log(`~~~~~~ creating direct application...`);
                            remoteApplicationId = (await bOps.applications.create({
                                type: 'Basic',
                                enabled: true,
                                logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                                name: "Direct Test Application",
                                securitySchemes: {}, // TODO: confirm this
                                description: "R&D test application for creating customers"
                            }))?.id
                        }

                        console.log("~~~~~~~ Direct Application is aligned!", remoteApplicationId);

                        const appOps = bOps.applications.for(remoteApplicationId)

                        const [remoteSchemas, remoteDirectEvents, bUnitPurposes] = await Promise.all([
                            bOps.ucpschemas.getAll(),
                            appOps.dataevents.getAll(),
                            bOps.purposes.getAll()
                        ])

                        const adjustMappingsModel = (mappings, targetSchemaId) => {
                            let adjustedMappings = []
                                mappings?.map(mapping => {
                                    adjustedMappings.push({
                                        sourceField: mapping.sourceField,
                                        targetField: mapping.targetField,
                                        target: targetSchemaId
                                    })
                            })
                            return adjustedMappings

                        }

                        async function createMappingsFromBoilerplate(adjustedBoilerplateMappings, remoteDirectEventId) {
                            // if there are no remote mappings for the remote direct event, create them according to boilerplate

                            await appOps.dataevents.for(remoteDirectEventId).mappings.create({
                                mappings: adjustedBoilerplateMappings
                            })
                        }

                        function updateMappingsFromBoilerplate(targetSchemaId, adjustedBoilerplateMappings, remoteDirectEventId, adjustedRemoteMappings) {

                            if (!isEqual(adjustedBoilerplateMappings, adjustedRemoteMappings)) {

                                // if it has mappings and boilerplate does not - remove mappings from remote
                                if ((adjustedBoilerplateMappings.length < 1) && (adjustedRemoteMappings.length >= 1)) {
                                    //TODO: delete not working..
                                    // TODO: CALL SUNNY HE IS IN CHARGE ON MAPPINGS
                                    return appOps.dataevents.for(remoteDirectEventId).mappings.delete({
                                        target: targetSchemaId,
                                        mappings: adjustedRemoteMappings
                                    }).then(res => console.log('delete', res))

                                    // if remote does not have mappings but boilerplate does, create remote mappings
                                } else if ((adjustedBoilerplateMappings.length >= 1) && (adjustedRemoteMappings.length < 1)) {
                                    return createMappingsFromBoilerplate(adjustedBoilerplateMappings, remoteDirectEventId)

                                    // if they both have mappings that are not the same, update remote mappings to be the boilerplate mappings
                                    // TODO: this is not working
                                } else
                                    // if ((boilerplateMapping.length >= 1) && (adjustedRemoteMappings?.length >= 1))
                                {
                                    return appOps.dataevents.for(remoteDirectEventId).mappings.update({
                                        mappings: adjustedBoilerplateMappings
                                    });
                                }
                            }
                        }

                        function checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping) {

                            Object
                                .entries(boilerplateMapping)
                                .map(async ([schemaName, mappings]) => {
                                    // find the id of the remote schema who has the same name as our schema.. eg 'Profile' / 'Orders' / 'Page-Views'
                                    const targetSchemaId = (remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)).id

                                    // const targetSchemaId = targetSchema.id
                                    if (!targetSchemaId)
                                        new Error(`mapping set to a non existing schema: ${schemaName}`);


                                    // get the mappings for the remote direct event
                                    let remoteMappings = await appOps.dataevents.for(remoteDirectEventId).mappings.get()
                                    console.log('remote mappings', remoteMappings)

                                    const adjustedBoilerplateMappings = adjustMappingsModel(mappings, targetSchemaId)

                                    // @ts-ignore
                                    if (remoteMappings.length < 1) {
                                        return createMappingsFromBoilerplate(adjustedBoilerplateMappings, remoteDirectEventId)
                                    } else {
                                        const adjustedRemoteMappings = adjustMappingsModel(remoteMappings.mappings, targetSchemaId)
                                        return updateMappingsFromBoilerplate(targetSchemaId, adjustedBoilerplateMappings, remoteDirectEventId, adjustedRemoteMappings)
                                    }
                                })
                        }

                        function adjustBoilerplateEventForPurposeIds(boilerplateEvent) {
                            // change purposeNames to purposeIds in boilerplateEvent
                            const eventPurposeIds = boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes.find(p => p.name == purposeName).id).filter(Boolean);
                            return {
                                ...boilerplateEvent,
                                purposeIds: eventPurposeIds
                            };
                        }

                        async function adjustRemoteEventForComparisonWithAdjustedBpEvent(boilerplateEvent, remoteEvent) {
                            const adjustedRemoteEvent = {
                                ...remoteEvent,
                                schema: JSON.stringify(remoteEvent.schema)
                            };

                            let remoteEventToCompare = {}
                            Object.keys(boilerplateEvent).forEach(k => {
                                remoteEventToCompare[k] = adjustedRemoteEvent[k]
                            })

                            return remoteEventToCompare
                        }

                        async function createRemoteDirectEventId(boilerplateEvent) {
                            const adjustedBoilerplateEvent = adjustBoilerplateEventForPurposeIds(boilerplateEvent);
                            const remoteDirectEvent = await appOps.dataevents.create({
                                ...adjustedBoilerplateEvent,
                                schema: JSON.stringify(boilerplateEvent.schema),
                                purposeIds: JSON.stringify(adjustedBoilerplateEvent.purposeIds) as any
                            });
                            return remoteDirectEvent.id;
                        }

                        async function updateRemoteDirectEvent(boilerplateEvent, remoteEvent) {
                            await appOps.dataevents.for(remoteEvent.id).update({
                                ...boilerplateEvent,
                                schema: JSON.stringify(boilerplateEvent.schema),
                            })
                        }

                        await Promise.all(
                            Object.entries(boilerplateDirectEvents).map(async ([eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {

                                let remoteDirectEventId = remoteDirectEvents ? remoteDirectEvents.find(ev => ev.name == eventName)?.id : await createRemoteDirectEventId(boilerplateEvent);
                                // if no remote event, create them
                                // if (remoteDirectEvents) {
                                // if there is a remoteEvent, check it and update/keep

                                if (!remoteDirectEventId) {
                                    remoteDirectEventId = await createRemoteDirectEventId(boilerplateEvent)
                                    await checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping);

                                }
                                let remoteEvent = await appOps.dataevents.for(remoteDirectEventId).get();
                                if (!isEqual(adjustRemoteEventForComparisonWithAdjustedBpEvent(boilerplateEvent, remoteEvent), adjustBoilerplateEventForPurposeIds(boilerplateEvent))) {
                                    await  updateRemoteDirectEvent(boilerplateEvent, remoteEvent);
                                    console.log(`~~~~~ aligning ${eventName}`);
                                    return  checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping);

                                }
                                // await checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping);
                            }));

                        console.log('~~~~~~~ Direct Application is aligned!');
                        console.log('~~~~~~~ Direct Events are aligned!');
                        console.log('~~~~~~~ Mappings are aligned!');
                    },


                    async alignCloudStorage() {
                        // TODO: CLOUD STORAGE MAPPING (not started)
                        const getAppViewModel = (application) => {
                            return {
                                configValues: application.configValues ? application.configValues : cloudStorageApplications[application.resources.type].configValues,
                                configSchema: application.configSchema,
                                securitySchemes: application.securitySchemes,
                                type: application.type,
                                name: application.name
                            }
                        }


                        console.log('~~~~ aligning cloud storage applications');
                        const remoteApplications = await bOps.applications.getAll();

                        const remoteCloudStorageConnectors = (await sdk.api.workspaces.for('19834500').applibrary.getAll({includePublic: true}));

                        await Promise.all(remoteCloudStorageConnectors['connectors'] && remoteCloudStorageConnectors['connectors'].map(async connector => {

                            const remoteCloudStorageApplication = remoteApplications.find(application => application['originConnectorId'] == connector.id);

                            if (!remoteCloudStorageApplication) {
                                console.log('creating remote app')
                                await bOps.applications.create({
                                    configSchema: JSON.stringify(connector.configSchema) as any,
                                    configValues: cloudStorageApplications[connector.resources.type].configValues,
                                    connectorId: connector.id,
                                    description: cloudStorageApplications[connector.resources.type].description,
                                    enabled: false,
                                    logoUrl: connector.logoUrl,
                                    name: connector.name,
                                    pollingConfig: undefined,
                                    securitySchemes: connector.securitySchemes,
                                    testResourcePath: "",
                                    type: 'CloudStorage'
                                });
                            } else {

                                const viewModelRemoteCSApp = getAppViewModel(remoteCloudStorageApplication);
                                const viewModelCSApp = getAppViewModel(connector);

                                console.log('viewModelRemoteCSApp, viewModelCSApp', viewModelRemoteCSApp, viewModelCSApp);

                                if (!isEqual(viewModelRemoteCSApp, viewModelCSApp)) {
                                    console.log('update remote app')
                                    await bOps.applications.for(remoteCloudStorageApplication.id).update({
                                        ...remoteCloudStorageApplication,
                                        configSchema: JSON.stringify(connector.configSchema) as any,
                                        configValues: cloudStorageApplications[connector.resources.type].configValues,
                                        connectorId: connector.id,
                                        enabled: false,
                                        pollingConfig: undefined,
                                        securitySchemes: connector.securitySchemes,
                                        testResourcePath: "",
                                        type: 'CloudStorage',
                                        description: cloudStorageApplications[connector.resources.type].description,
                                        logoUrl: connector.logoUrl,
                                        name: connector.name,
                                    })
                                } else console.log('they are equal...');
                                // else return remoteCloudStorageApplication
                            }
                        }));
                    },
                    alignAll() {
                        return Promise.all([
                            this.alignDirect(),
                            this.alignCloudStorage()
                        ]);
                    }
                },
                //TODO: need purpose IDS
                audiences: {
                    async align() {
                        console.log('~~~~~~~ aligning Audiences')
                        let audiencePromise: Promise<Audience>
                        const view = await bOps.views.getAll().then(views => views.find(v => v.type == "Marketing"));
                        const vOps = bOps.views.for(view.id);

                        const remoteAudience = await vOps.audiences.getAll().then(audiences => audiences.find(a => a.name == boilerplateAudience.name))
                        // TODO: change the purpose id's to their actual ID's
                        if (remoteAudience) {
                            if (isEqual(remoteAudience, boilerplateAudience)) {
                                audiencePromise = Promise.resolve(remoteAudience);
                            } else {
                                audiencePromise = vOps.audiences.for(remoteAudience.id).update({
                                    ...boilerplateAudience
                                });
                            }
                        } else {
                            audiencePromise = vOps.audiences.create({
                                ...boilerplateAudience
                            });
                        }

                        const alignedAudience = await audiencePromise
                        console.log('~~~~~ Audience aligned!', alignedAudience)
                    }
                },
                async alignAll() {
                    await Promise.all([
                        this.schemas.alignProfile(),
                        this.schemas.alignActivities()
                    ]);

                    await this.activityIndicators.align();
                    await this.segments.align();
                    await this.purposes.align();

                    await Promise.all([
                        this.applications.alignDirect(),
                        this.audiences.align()
                    ]);
                },
                async ingestFakeEvents(customersNum: number, events: DirectEventName[]) {
                    // TODO: zoe
                    /*
                        according to customersNum
                            create a unique common identifier
                            for each event in events
                                create a fake event using its schema and common identifier and send to ingest
                     */
                }
            }
        }
    };
}
