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
                    const remoteMatchRules = await vOps.matchRules.getAll()

                    const masterDataIdMR = remoteMatchRules?.find(matchRules => matchRules.attributeName == config.commonIdentifier)

                    !masterDataIdMR ? await vOps.matchRules.create({
                        attributeName: "",
                        name: "",
                        ucpResolutionPolicy: undefined,
                        }) : (isEqual(masterDataIdMR, matchingRule) ?? (await vOps.matchRules.for(masterDataIdMR.id).update({
                        attributeName: "",
                        name: "",
                        ucpResolutionPolicy: undefined,
                    })))
                    // check if
                },

                //TODO: Application Identifier

                activityIndicators: {
                    async align() {
                        console.log('~~~~~~~ aligning Activity Indicators')

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
                        console.log('~~~~~~~ aligned Activity Indicator:', alignedActivityIndicator)
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

                                let stringifiedPayload = {}


                                Object.entries(boilerplatePurposePayload).map(([k, v]) => {
                                    stringifiedPayload[k] = JSON.stringify(v)
                                })


                                // TODO: updating mapping priority 1* --- need to send strings.
                                // await bOps.purposes.for(purposeId).update({
                                //     // ...boilerplatePurposePayload,
                                //     customerAttributes: '["firstName", "primaryEmail", "lastName"]' as any,
                                //     reason: "Marketing" as PurposeReasons,
                                //     externalId: "123456",
                                //     name: "marketing",
                                // // @ts-ignore
                                // customerAttributes: '["firstName", "primaryEmail", "lastName"]',
                                // //  // @ts-ignore
                                // // customerActivities: "'" + boilerplatePurposePayload.customerActivities + "'",
                                // // // @ts-ignore
                                // // customerSegments: boilerplatePurposePayload.customerSegments?.toString(),
                                // //  // @ts-ignore
                                //         // // customerActivityIndicators: boilerplatePurposePayload.customerActivityIndicators?.toString()
                                //     }).then(res => console.log(res))
                                //     console.log(finalPurpose)
                            }
                            console.log('~~~~~~~~ Purposes aligned!', finalPurpose)
                        })
                    }
                },
                //TODO: IDENTIFIER?!


                applications: { //TODO: mapping for events
                    //TODO: AUTH FOR APPLICATION CREATED???
                    async alignDirect() {

                        console.log("~~~~~~~ aligning Direct applications");
                        let remoteApplicationId = await bOps.applications.getAll().then(apps =>
                            apps?.find(app =>
                                app.type == defaultDirectApplication.type && app.name == defaultDirectApplication.name)?.id
                        );


                        // no existing remoteApp --> create one
                        if (!remoteApplicationId) {
                            console.log(`~~~~~~ creating direct application...`);
                            remoteApplicationId = (await bOps.applications.create({
                                type: 'Basic',
                                enabled: true,
                                logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                                name: "Test Application",
                                securitySchemes: {}, // TODO: confirm this
                                description: "R&D test application for creating customers"
                            })).id;
                        }
                        console.log("~~~~~~~ Direct Application is aligned!");

                        const appOps = bOps.applications.for(remoteApplicationId);

                        const [remoteSchemas, remoteDirectEvents, bUnitPurposes] = await Promise.all([
                            bOps.ucpschemas.getAll(),
                            appOps.dataevents.getAll(),
                            bOps.purposes.getAll()
                        ])


                        await Promise.all(
                            Object.entries(boilerplateDirectEvents).map(async ([eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {

                                // dealing with event's mapping
                                const checkMappings = async (remoteEventId) => {
                                    await Promise.all(
                                        Object.entries(boilerplateMapping).map(async ([schemaName, mappings]) => {

                                            const targetSchemaId = remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)?.id

                                            if (!targetSchemaId)
                                                throw `mapping set to a non existing schema: ${schemaName}`;

                                            const remoteMappings = await bOps.mappings.get({
                                                sourceId: remoteEventId
                                            })

                                            // if remote mapping is not the same as boilerplate
                                            if (isEqual(mappings, remoteMappings[targetSchemaId])) { // if the mappings are equal!!!
                                                // not sure what goes here
                                                console.log('is equal')
                                                return
                                            } else {
                                                console.log(`~~~~~~~ ALIGNING  ${schemaName} Mapping`)

                                                // if it has mappings and boilerplate does not - remove mappings from remote
                                                if ((!mappings || !mappings.length) && (remoteMappings[targetSchemaId].length >= 1)) {
                                                    console.log(`~~~~~~~ deleting ${schemaName} Mapping`)
                                                    return bOps.mappings.delete({
                                                        sourceId: remoteEventId,
                                                        targetId: targetSchemaId,
                                                        mappings: remoteMappings[targetSchemaId]
                                                    })

                                                    // or do you update with [] ? in schema defined I put []

                                                    // if it does not have mappings but boilerplate does, create remote mappings
                                                } else if ((mappings.length >= 1) && (!remoteMappings[targetSchemaId])) {
                                                    console.log(`~~~~~~~ creating ${schemaName} Mapping`)
                                                    return bOps.mappings.create({
                                                        sourceId: remoteEventId,
                                                        targetId: targetSchemaId,
                                                        mappings
                                                    });

                                                    // if they both have mappings that are not the same, update remote mappings to be the boilerplate mappings
                                                    // TODO: this is not working
                                                } else if ((mappings.length >= 1) && (remoteMappings[targetSchemaId].length >= 1)) {
                                                    console.log(`~~~~~~~ updating ${schemaName} Mapping`)
                                                    return bOps.mappings.update({
                                                        sourceId: remoteEventId,
                                                        targetId: targetSchemaId,
                                                        mappings
                                                    });
                                                }
                                            }
                                        })
                                    );
                                    console.log("~~~~~~~ Mapping is aligned!");
                                }
                                // end of checking mappings

                                // if there are no mappings at all and the event is new: (maybe we can just use above?)
                                const createMappings = async (id) => {
                                    await Promise.all(
                                        Object.entries(boilerplateMapping).map(([schemaName, mappings]) => {

                                            const targetSchemaId = remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)?.id;
                                            if (!targetSchemaId)
                                                throw `mapping set to a non existing schema: ${schemaName}`;

                                            console.log(`~~~~~~~ creating ${schemaName} Mapping`);
                                            return bOps.mappings.create({
                                                sourceId: id,
                                                targetId: targetSchemaId,
                                                mappings
                                            });
                                        })
                                    );
                                }

                                const eventPurposeIds =
                                    boilerplateEvent.purposeIds.map(purposeName => bUnitPurposes.find(p => p.name == purposeName)?.id).filter(Boolean);

                                let remoteEventId = remoteDirectEvents.find(ev => ev.name == eventName)?.id;

                                // if no remote event, create them + mappings
                                if (!remoteEventId) {
                                    boilerplateEvent = {
                                        ...boilerplateEvent,
                                        schema: JSON.stringify(boilerplateEvent.schema),
                                        // // @ts-ignore
                                        purposeIds: JSON.stringify(eventPurposeIds) as any
                                    };

                                    console.log(`~~~~~~~ aligning Direct Event ${boilerplateEvent.name}`)
                                    let remoteEvent = await appOps.dataevents.create(boilerplateEvent);

                                    // there was no event, therefore definitely need to create mappings
                                    // do we need this here????
                                    // or can we do a full check mappings after we are done with the events???
                                    await createMappings(remoteEvent.id)

                                } else {
                                    // if there is a remoteEvent, check it and update/keep
                                    let remoteEvent = await appOps.dataevents.for(remoteEventId).get();
                                    remoteEvent = {...remoteEvent, schema: JSON.parse(remoteEvent.schema.toString())};

                                    // change purposeNames to purposeIds in boilerplateEvent
                                    boilerplateEvent = {...boilerplateEvent, purposeIds: eventPurposeIds};

                                    let remoteEventToCompare = {}
                                    Object.keys(boilerplateEvent).forEach(k => {
                                        remoteEventToCompare[k] = remoteEvent[k]
                                    })

                                    // comparing remoteEvent and boilerplateEvent:
                                    // different events: update to ours
                                    if (!isEqual(remoteEventToCompare, boilerplateEvent)) {
                                        console.log(`~~~~~~~ updating Direct Event ${boilerplateEvent.name}`)
                                        await appOps.dataevents.for(remoteEvent.id).update({
                                            ...boilerplateEvent,
                                            schema: JSON.stringify(boilerplateEvent.schema),
                                            purposeIds: JSON.stringify(eventPurposeIds) as any
                                        })
                                    }
                                    // else {
                                    //         // they are equal and we still need to check mappings
                                    //
                                    //         await checkMappings(remoteEvent.id)
                                    //     }
                                    // same events: we are not doing anything to event --> carry on

                                    // now we have checked events, we can check mapping

                                }
                                // we always check mappings...
                                console.log(`~~~~~ aligning ${eventName}`)

                                await checkMappings(remoteEventId)

                            }));
                        console.log('~~~~~~~ Direct Application is aligned!');
                        console.log('~~~~~~~ Direct Events are aligned!');
                        console.log('~~~~~~~ Mappings are aligned!');
                    },


                    async alignCloudStorage() {
                        // TODO: CLOUD STORAGE
                        /*
                            get all connectors from the applibrary
                            for each cloud storage connector
                            create an application -
                                name according to connector's
                                enabled: false
                                mock all other fields
                                mock auth & config
                                create an event
                                    name: `new customers from ${app.name}`
                                    purposes: basic
                                    mock settings & config
                                    create schema according to boilerplate
                                    create mapping
                                    no schedule
                         */
                        // const CSApps = bOps.applications.for()
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
