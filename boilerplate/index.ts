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
import {Payload} from "../gigya-cdp-sdk/entities/common";
import {PurposeReasons, Purposes as boilerplatePurposes} from "./purposes/purposes";
import {matchingRule} from "./MatchRules/matchRules";
import {cloudStorageApplication, cloudStorageApplications} from "./Applications/defaultCloudStorageApplications";
import stringMatching = jasmine.stringMatching;

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

                    //TODO: matching rules! ****

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
                        // attributeName: config.commonIdentifier, // this seems too explicit if I have already created an interface, but ...masterDataIdMR does not work
                        // name: config.commonIdentifier,
                        // ucpResolutionPolicy: 'merge',

                        ...matchingRule, ...masterDataIdMR // does not work if I use this
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
                                }).then(res => console.log(res))
                                console.log(finalPurpose)
                            }
                            console.log('~~~~~~~~ Purposes aligned!', finalPurpose)
                        })
                    }
                },

                applications: { //TODO: mapping for events
                    async alignDirect() {

                        console.log("~~~~~~~ aligning Direct applications");
                        let remoteApplicationId = await bOps.applications.getAll().then(apps =>
                            apps?.find(app =>
                                app.type == defaultDirectApplication.type && app.name == defaultDirectApplication.name)?.id
                        );


                        // no existing remoteApp --> create one
                        if (!remoteApplicationId) {
                            remoteApplicationId = (await bOps.applications.create({
                                type: 'Basic',
                                enabled: true,
                                logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                                name: "Direct Test Application",
                                securitySchemes: {}, // TODO: confirm this
                                description: "R&D test application for creating customers"
                            })).id;
                        }
                        console.log("~~~~~~~ Direct Application is aligned!");

                        const appOps = bOps.applications.for(remoteApplicationId)

                        const [remoteSchemas, remoteDirectEvents, bUnitPurposes] = await Promise.all([
                            bOps.ucpschemas.getAll(),
                            bOps.applications.for(remoteApplicationId).dataevents.getAll(),
                            bOps.purposes.getAll()
                        ]);

                        const createDirectEventsFromBoilerplate = Object
                            .entries(boilerplateDirectEvents)
                            .map(async ([eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {
                                // find remote direct events' id  who have the same name as the boilerplate's
                                const remoteDirectEventId = remoteDirectEvents.find(event => event.name === eventName)?.id;
                                console.log('remoteDirectEventId 2 ', remoteDirectEventId)

                                // if no existing remote direct event, create one
                                if (!remoteDirectEventId) {
                                    const eventPurposeIds =
                                        boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes.find(p => p.name == purposeName)?.id).filter(Boolean);
                                    // manipulate boilerplate direct event for POST request
                                    boilerplateEvent = {
                                        ...boilerplateEvent,
                                        schema: JSON.stringify(boilerplateEvent.schema),
                                        purposeIds: JSON.stringify(eventPurposeIds) as any
                                    };

                                    console.log(`~~~~~~~ aligning Direct Event ${boilerplateEvent.name}`)
                                    return appOps.dataevents.create(boilerplateEvent);
                                }
                            })


                        const updateDirectEventsFromBoilerplate = Object
                            .entries(boilerplateDirectEvents)
                            .reduce((matchedDirectEventNames, [eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {
                                // find remote direct events' id  who have the same name as the boilerplate's
                                const remoteDirectEventId = remoteDirectEvents.find(event => event.name === eventName)?.id;
                                console.log('remoteDirectEventId 1', remoteDirectEventId)
                                return remoteDirectEventId ? [...matchedDirectEventNames, {
                                    remoteDirectEventId,
                                    boilerplateEvent
                                }] : matchedDirectEventNames;
                            }, [])
                            // filter to get only the remote direct events who have the same name & who are not equal to the boilerplate
                            .filter(async ({remoteDirectEventId, boilerplateEvent}): Promise<any> => {
                                // get the remote direct event
                                let remoteDirectEvent = await bOps.applications.for(remoteApplicationId).dataevents.for(remoteDirectEventId).get()

                                // change purposeNames to purposeIds in boilerplateEvent
                                const eventPurposeIds = boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes.find(p => p.name == purposeName).id).filter(Boolean);
                                const boilerplateEventAdjustedForPurposeId = {
                                    ...boilerplateEvent,
                                    purposeIds: eventPurposeIds
                                };

                                //manipulating remote direct event so that we can compare it with boilerplate's
                                const remoteEvent = {
                                    ...remoteDirectEvent,
                                    schema: JSON.parse(remoteDirectEvent.schema.toString())
                                };
                                let remoteEventToCompare = {}
                                Object.keys(boilerplateEvent).forEach(k => {
                                    remoteEventToCompare[k] = remoteEvent[k]
                                })

                                return (!isEqual(boilerplateEventAdjustedForPurposeId, remoteEventToCompare));
                            }).map(({remoteDirectEventId, boilerplateEvent}): Promise<any> => {
                                console.log(remoteDirectEventId, boilerplateEvent)
                                const eventPurposeIds = boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes.find(p => p.name == purposeName).id).filter(Boolean);

                                // update the direct events to match our boilerplate direct event
                                return bOps.applications.for(remoteApplicationId).dataevents.for(remoteDirectEventId).update({
                                    ...boilerplateEvent as Payload<Event>,
                                    schema: JSON.stringify(boilerplateEvent.schema),
                                    purposeIds: JSON.stringify(eventPurposeIds) as any
                                })
                            }); // getting array of update of direct events from boilerplate.

                        const createdDirectEvents = await Promise.all(createDirectEventsFromBoilerplate);
                        const updatedDirectEvents = await Promise.all(updateDirectEventsFromBoilerplate);
                        console.log('~~~~~~~~~~~Direct Events are aligned!', createdDirectEvents, updatedDirectEvents)

                        // ----------------------------------------------------------------------------------------------------------------------
//                         await Promise.all(
//                             // taking two boilerplate direct events and going through their entries
//                             Object.entries(boilerplateDirectEvents).map(async ([eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {
//
//                                 // dealing with event's mapping
//                                 const checkMappings = async (remoteEventId) => {
//                                     await Promise.all(
//                                         Object.entries(boilerplateMapping).map(async ([schemaName, mappings]) => {
//
//                                             const targetSchemaId = remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)?.id
//
//                                             if (!targetSchemaId)
//                                                 throw `mapping set to a non existing schema: ${schemaName}`;
//
//                                             const remoteMappings = await bOps.mappings.get({
//                                                 sourceId: remoteEventId
//                                             })
//
//                                             const newMappingsObj = mappings.map(mapping => {
//                                                 return {
//                                                     srcField: mapping.sourceField,
//                                                     targetField: mapping.targetField,
//                                                     target: targetSchemaId
//                                                 }
//                                             })
//
//                                             // if remote mapping is not the same as boilerplate
//                                             if (isEqual(newMappingsObj, remoteMappings[targetSchemaId])) { // if the mappings are equal!!!
//                                                 // not sure what goes here
//                                                 console.log('is equal')
//                                                 return
//                                             } else {
//
//                                                 // if it has mappings and boilerplate does not - remove mappings from remote
//                                                 if ((!newMappingsObj || !newMappingsObj.length) && remoteMappings[targetSchemaId]) {
//                                                     console.log(`~~~~~~~ deleting ${schemaName} Mapping`);
//
//                                                     // TODO: this is working BUT because of updated API - need to make changes to SDK
//                                                     return bOps.mappings.delete({
//                                                         sourceId: remoteEventId,
//                                                         targetId: targetSchemaId,
//                                                         mappings: remoteMappings[targetSchemaId]
//                                                     })
//
//                                                     // or do you update with [] ? in schema defined I put []
//
//                                                     // if it does not have mappings but boilerplate does, create remote mappings
//                                                 } else if ((newMappingsObj.length >= 1) && (!remoteMappings[targetSchemaId])) {
//                                                     console.log(`~~~~~~~ creating ${schemaName} Mapping`)
//
//                                                     //TODO: this is what the request body needs to be...
//
//
//                                                     // TODO: this is not working because of updated API - need to make changes to SDK
//                                                     // @ts-ignore
//                                                     return appOps.dataevents.for(remoteEventId).mappings.create({
//                                                         // sourceId: remoteEventId,
//                                                         // targetId: targetSchemaId,
//                                                         // contextId: remoteEventId,
//                                                         // @ts-ignore
//                                                         mappings: newMappingsObj,
//                                                         // target: targetSchemaId,
//                                                     }).then(res => console.log(res, 'mappings', newMappingsObj))
//
//                                                     // if they both have mappings that are not the same, update remote mappings to be the boilerplate mappings
//                                                     // TODO: this is not working because of updated API - need to make changes to SDK
//                                                 } else if ((newMappingsObj.length >= 1) && (remoteMappings[targetSchemaId].length >= 1)) {
//                                                     console.log(`~~~~~~~ updating ${schemaName} Mapping`)
//
//                                                     // @ts-ignore
//                                                     return appOps.dataevents.for(remoteEventId).mappings.update({
//                                                         // @ts-ignore
//                                                         mappings: newMappingsObj,
//                                                     });
//                                                 }
//                                             }
//                                         })
//                                     );
//                                     console.log("~~~~~~~ Mapping is aligned!");
//                                 }
//                                 // end of checking mappings
//
//                                 // if there are no mappings at all and the event is new: (maybe we can just use above?)
//                                 const createMappings = async (id) => {
//                                     await Promise.all(
//                                         Object.entries(boilerplateMapping).map(([schemaName, mappings]) => {
//
//                                             const targetSchemaId = remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)?.id;
//                                             if (!targetSchemaId)
//                                                 throw `mapping set to a non existing schema: ${schemaName}`;
//
//                                             const newMappingsObj = mappings.map(mapping => {
//                                                 return {
//                                                     srcField: mapping.sourceField,
//                                                     targetField: mapping.targetField,
//                                                     target: targetSchemaId
//                                                 }
//                                             })
//
//                                             console.log(`~~~~~~~ creating ${schemaName} Mapping`);
//                                             return appOps.dataevents.for(remoteEventId).mappings.create({
//                                                 // sourceId: remoteEventId,
//                                                 // targetId: targetSchemaId,
//                                                 // contextId: remoteEventId,
//                                                 // @ts-ignore
//                                                 mappings: newMappingsObj,
//                                                 // target: targetSchemaId,
//                                             }).then(res => console.log(res, 'mappings CREATED', newMappingsObj))
//                                         })
//                                     );
//                                 }
//
//                                 const eventPurposeIds =
//                                     boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes.find(p => p.name == purposeName)?.id).filter(Boolean);
//
//
//                                 let remoteEventId = remoteDirectEvents.find(ev => ev.name == eventName)?.id;
//
//                                 // if no remote event, create them + mappings
//                                 if (!remoteEventId) {
//                                     boilerplateEvent = {
//                                         ...boilerplateEvent,
//                                         schema: JSON.stringify(boilerplateEvent.schema),
//                                         purposeIds: JSON.stringify(eventPurposeIds) as any
//                                     };
//
//                                     console.log(`~~~~~~~ aligning Direct Event ${boilerplateEvent.name}`)
//                                     // ---------- Refactored create event
//
//                                     let remoteEvent = await appOps.dataevents.create(boilerplateEvent);
//
//                                     // there was no event, therefore definitely need to create mappings
//                                     // do we need this here????
//                                     // or can we do a full check mappings after we are done with the events???
//                                     // ---------- NEED TO REFACTOR::::
//                                     await createMappings(remoteEvent.id)
//
//                                 } else {
//                                     //  REFACTORED update event-----------------------------------------------------------------------------------------------------
//                                     // if there is a remoteEvent, check it and update/keep
//                                     let remoteEvent = await appOps.dataevents.for(remoteEventId).get();
//                                     remoteEvent = {...remoteEvent, schema: JSON.parse(remoteEvent.schema.toString())};
//
//                                     // change purposeNames to purposeIds in boilerplateEvent
//                                     boilerplateEvent = {...boilerplateEvent, purposeIds: eventPurposeIds};
//
//                                     let remoteEventToCompare = {}
//                                     Object.keys(boilerplateEvent).forEach(k => {
//                                         remoteEventToCompare[k] = remoteEvent[k]
//                                     })
//
//                                     // comparing remoteEvent and boilerplateEvent:
//                                     // different events: update to ours
//                                     if (!isEqual(remoteEventToCompare, boilerplateEvent)) {
//                                         console.log(`~~~~~~~ updating Direct Event ${boilerplateEvent.name}`)
//                                         await appOps.dataevents.for(remoteEvent.id).update({
//                                             ...boilerplateEvent,
//                                             schema: JSON.stringify(boilerplateEvent.schema),
//                                             purposeIds: JSON.stringify(eventPurposeIds) as any
//                                         })
//                                     }
//
//                                 }
//                                 // we always check mappings...
//                                 console.log(`~~~~~ aligning ${eventName}`)
// // ---------- NEED TO REFACTOR::::
//                                 await checkMappings(remoteEventId)
//
//                             }));

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
