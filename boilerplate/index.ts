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
import {cloudStorageApplications as boilerplateCloudStorageApplications} from "./Applications/defaultCloudStorageApplications";

const isEqual = require('lodash/isEqual');
const differenceWith = require('lodash/differenceWith');
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
                                    sourceField: mapping.sourceField ? mapping.sourceField : mapping.srcField,
                                    targetField: mapping.targetField,
                                    target: targetSchemaId
                                })
                            })
                            return adjustedMappings
                        }

                        const adjustRemoteMappingsModel = (remoteMappings) => {
                            let adjustedMappings = []
                            remoteMappings?.map(mapping => {
                                adjustedMappings.push({
                                    sourceField: mapping.sourceField ? mapping.sourceField : mapping.srcField,
                                    targetField: mapping.targetField,
                                    target: mapping.target
                                })
                            })
                            return adjustedMappings
                        }

                        function createMappingsFromBoilerplate(adjustedBoilerplateMappings, remoteDirectEventId) {
                            // if there are no remote mappings for the remote direct event, create them according to boilerplate
                            if (adjustedBoilerplateMappings.length) {
                                return appOps.dataevents.for(remoteDirectEventId).mappings.create({
                                    mappings: adjustedBoilerplateMappings
                                });
                            }
                        }

                        function updateMappingsFromBoilerplate(targetSchemaId, adjustedBoilerplateMappings, remoteDirectEventId, adjustedRemoteMappings) {

                            function isMappingFieldEqualToRemote(adjustedBoilerplateMappingField) {
                                const adjustedRemoteMappingField = adjustedRemoteMappings.find(adjustedRemoteMappingField =>
                                    (adjustedRemoteMappingField.sourceField === adjustedBoilerplateMappingField.sourceField)
                                    && (adjustedRemoteMappingField.targetField === adjustedBoilerplateMappingField.targetField)
                                );
                                console.log('adjustedRemoteMappingField', adjustedRemoteMappingField)
                                return isEqual(adjustedBoilerplateMappingField, adjustedRemoteMappingField);
                            }

                            console.log('in equality testing', adjustedBoilerplateMappings, adjustedRemoteMappings)
                            if (adjustedBoilerplateMappings.every(isMappingFieldEqualToRemote) == false) {
                                console.log('not equal')
                                if ((adjustedBoilerplateMappings.length <= 0) && (adjustedRemoteMappings.length >= 1)) {
                                    console.log('should delete')
                                    return appOps.dataevents.for(remoteDirectEventId).mappings.delete({
                                        target: targetSchemaId,
                                        mappings: adjustedRemoteMappings
                                    }).then(res => console.log('delete', res))
                                }

                                if ((!adjustedBoilerplateMappings) && (adjustedRemoteMappings.length <= 0)) {
                                    return appOps.dataevents.for(remoteDirectEventId).mappings.create({
                                        mappings: adjustedBoilerplateMappings
                                    }).then(r => console.log('creted updtae', r))
                                } else {
                                    return appOps.dataevents.for(remoteDirectEventId).mappings.create({
                                        mappings: adjustedBoilerplateMappings
                                    }).then(res => console.log(res, 'update'));
                                }
                            }
                        }

                        async function checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping) {
                            // get the mappings for the remote direct event
                            let remoteMappings = await appOps.dataevents.for(remoteDirectEventId).mappings.get()
                            let mappingsArray = []
                            console.log('~~~~~~ aligning Mappings')
                            Object
                                .entries(boilerplateMapping)
                                .map(async ([schemaName, mappings]) => {
                                    // find the id of the remote schema who has the same name as our schema.. eg 'Profile' / 'Orders' / 'Page-Views'
                                    const targetSchemaId = (remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)).id

                                    // const targetSchemaId = targetSchema.id
                                    if (!targetSchemaId)
                                        new Error(`mapping set to a non existing schema: ${schemaName}`);


                                    // @ts-ignore
                                    // const remoteMappingsForTarget = remoteMappings ? remoteMappings.filter(map => map.target != targetSchemaId) : []
                                    // console.log(remoteMappings, targetSchemaId, remoteMappingsForTarget)

                                    const adjustedBoilerplateMappings = adjustMappingsModel(mappings, targetSchemaId)
                                    mappingsArray.push(adjustedBoilerplateMappings)
                                    mappingsArray.flat()


                                    // if (adjustedBoilerplateMappings.length > 1) {
                                    //
                                    //     if (remoteMappingsForTarget.length < 1) {
                                    //         console.log('create', schemaName)
                                    //         return await createMappingsFromBoilerplate(adjustedBoilerplateMappings, remoteDirectEventId)
                                    //     } else {
                                    //         console.log('UPDATE', schemaName)
                                    //         const adjustedRemoteMappings = adjustMappingsModel(remoteMappings, targetSchemaId)
                                    //         return await updateMappingsFromBoilerplate(targetSchemaId, adjustedBoilerplateMappings, remoteDirectEventId, adjustedRemoteMappings)
                                    //     }
                                    // }
                                    // else {
                                    //     if (remoteMappings > 1){
                                    //         console.log('no BP', remoteMappings, schemaName)
                                    //     }
                                    // }
                                })

                            // check if remote mappings and boilerplate mappings are equal
                            // using Lodash's
                            // - differenceWith, which checks the differences between values in two arrays - returns array of the difference
                            // - isEmpty which checks for empty array - returns boolean
                            // - isEqual which checks equality of two arrays - returns boolean
                            // Lodash docs:
                            // var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
                            // _.differenceWith(objects, [{ 'x': 1, 'y': 2 }], _.isEqual);
                            // // => [{ 'x': 2, 'y': 1 }]
                            const isArrayEqual = function (bpMappings, rMappings) {
                                return _(bpMappings).differenceWith(rMappings, _.isEqual).isEmpty();
                            };

                            // @ts-ignore
                            if (remoteMappings.length < 1) {
                                return appOps.dataevents.for(remoteDirectEventId).mappings.create({
                                    mappings: mappingsArray.flat()
                                }).then(r => console.log('CREATED BECAUSE DID NOT EXIST', r))
                            } else {
                                const adjustedRemoteMappings = adjustRemoteMappingsModel(remoteMappings)
                                if (!isArrayEqual(mappingsArray, adjustedRemoteMappings)) {
                                    return appOps.dataevents.for(remoteDirectEventId).mappings.create({
                                        mappings: mappingsArray.flat()
                                    }).then(r => console.log('CREATED BECAUSE WERE NOT EQUAL', r))
                                }
                            }
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

                            let remoteEventToCompare = {}
                            Object.keys(boilerplateEvent).forEach(k => {
                                remoteEventToCompare[k] = remoteEvent[k]
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

                        function updateRemoteDirectEvent(boilerplateEvent, remoteEvent) {
                            return appOps.dataevents.for(remoteEvent.id).update({
                                ...boilerplateEvent,
                                schema: JSON.stringify(boilerplateEvent.schema),
                                purposeIds: JSON.stringify(boilerplateEvent.purposeIds)
                            }).then(res => console.log(res))
                        }

                        await Promise.all(
                            Object.entries(boilerplateDirectEvents).map(async ([eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {

                                let remoteDirectEventId = remoteDirectEvents?.find(ev => ev.name == eventName)?.id;
                                // if no remote event, create them
                                // if there is a remoteEvent, check it and update/keep
                                console.log('~~~~~~ aligning Direct Applications');
                                if (!remoteDirectEventId) {
                                    remoteDirectEventId = await createRemoteDirectEventId(boilerplateEvent);
                                }

                                const remoteEvent = await appOps.dataevents.for(remoteDirectEventId).get(); // this is a promise


                                const adjustedBPEventForPurposeIds = adjustBoilerplateEventForPurposeIds(boilerplateEvent);
                                const adjustedRemoteEventForComparisonWithAdjustedBpEvent = await adjustRemoteEventForComparisonWithAdjustedBpEvent(boilerplateEvent, remoteEvent);
                                console.log('~~~~~ aligning Direct Events')
                                if (!isEqual(adjustedRemoteEventForComparisonWithAdjustedBpEvent, adjustedBPEventForPurposeIds)) {
                                    await updateRemoteDirectEvent(adjustedBPEventForPurposeIds, remoteEvent);
                                }

                                await checkToUpdateOrCreateMappings(remoteDirectEventId, boilerplateMapping);
                            }));

                        console.log('~~~~~~~ Direct Application is aligned!');
                        console.log('~~~~~~~ Direct Events are aligned!');
                        console.log('~~~~~~~ Mappings are aligned!');
                    },


                    async alignCloudStorage() {
                        // TODO: CLOUD STORAGE MAPPING (not started)
                        // TODO: AUTHENTICATION BECAUSE THE APP ISNT CREATED CORRECTLY WITHOUT IT!
                        const getAppViewModel = (application) => {
                            return {
                                configValues: application.configValues ? application.configValues : boilerplateCloudStorageApplications[application.resources.type].configValues,
                                type: application.type,
                                name: application.name,
                                description: application.description
                            }
                        }


                        console.log('~~~~ aligning cloud storage applications');
                        const remoteApplications = await bOps.applications.getAll();
                        const remoteConnectors = await sdk.api.workspaces.for('19834500').applibrary.getAll({includePublic: true});

                        // get remote connectors that are Cloud Storage connectors
                        const remoteCloudStorageConnectors = remoteConnectors['connectors'] && remoteConnectors['connectors'].filter(connector => connector.type === 'CloudStorage')

                        await Promise.all(remoteCloudStorageConnectors.map(async connector => {
                            // get the corresponding cloud storage application
                            const remoteCloudStorageApplication = remoteApplications?.find(application => application['originConnectorId'] == connector.id);

                            //get the corresponding boilerplate application
                            const boilerplateCloudStorageApplication = boilerplateCloudStorageApplications[connector.resources.type]
                            // if there is not a cloudStorageApplication of type 'azure.blob' | 'googlecloud' | 'sftp' | aws3
                            // then create cloudStorageApplication
                            if (!remoteCloudStorageApplication) {
                                console.log('no conn')
                                await bOps.applications.create({
                                    configSchema: JSON.stringify(connector.configSchema) as any,
                                    configValues: boilerplateCloudStorageApplication.configValues,
                                    connectorId: connector.id,
                                    description: boilerplateCloudStorageApplication.description,
                                    enabled: false,
                                    logoUrl: connector.logoUrl,
                                    name: connector.name,
                                    pollingConfig: undefined,
                                    securitySchemes: connector.securitySchemes,
                                    testResourcePath: "",
                                    type: 'CloudStorage'
                                });

                            } else {
                                // if there is a cloudStorageApplication of type 'azure.blob' | 'googlecloud' | 'sftp' | aws3
                                // adjust the model so that we can work with it
                                const viewModelRemoteCSApp = getAppViewModel(remoteCloudStorageApplication);
                                const viewModelCSApp = getAppViewModel(connector);

                                console.log('viewModelCSApp', viewModelCSApp);
                                console.log('viewModelRemoteCSApp', viewModelRemoteCSApp);

                                // check if they are not equal and update to boilerplate Cloud Storage Application
                                if (!(_.isEqual(viewModelRemoteCSApp, viewModelCSApp))) {
                                    await bOps.applications.for(remoteCloudStorageApplication.id).update({
                                        ...remoteCloudStorageApplication,
                                        configSchema: JSON.stringify(connector.configSchema) as any,
                                        configValues: boilerplateCloudStorageApplications[connector.resources.type].configValues,
                                        connectorId: connector.id,
                                        enabled: false,
                                        pollingConfig: undefined,
                                        securitySchemes: connector.securitySchemes,
                                        testResourcePath: "",
                                        type: 'CloudStorage',
                                        description: boilerplateCloudStorageApplications[connector.resources.type].description,
                                        logoUrl: connector.logoUrl,
                                        name: connector.name,
                                    })
                                }
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
