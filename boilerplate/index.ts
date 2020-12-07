import {CDP} from "../gigya-cdp-sdk";
import {
    ActivityIndicator,
    Application,
    BusinessUnitId,
    CustomerSchema,
    Event,
    SchemaType,
    Segment
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

                purposes: { //TODO: PURPOSES
                    async align() {
                        console.log('~~~~~~  aligning Purposes')
                        const userPurposes = await bOps.purposes.getAll().then(p => p)
                        console.log('userPurposes', userPurposes)
                        // TODO: zoe come back here
                        // basic - attributes: profile.firstName, profile.lastName, profile.primaryEmail
                        // marketing - attributes: segment.VIP, activityIndicator.purchaseSum
                    }
                },
                //TODO: IDENTIFIER?!


                applications: { //TODO: mapping for events
                    async alignDirect() {
                        let directApplicationPromise: Promise<Application>
                        let directEventsPromise: Promise<Event>;
                        let directEventsArray: [Event];
                        let alignedDirectApp: Application;

                        console.log("~~~~~~~ aligning Direct applications");
                        let remoteApplicationId = await bOps.applications.getAll().then(apps =>
                            apps?.find(app =>
                                app.type == defaultDirectApplication.type && app.name == defaultDirectApplication.name)?.id
                        );

                        // check if there is a direct application,
                        // There is one??
                        // 1. check that it has events
                        // 2. if YES events --> check that our events are the same as theirs (maybe check which event they have or dont have), ---> now check mappings
                        // 3. if NO events -->  create events, create mapping
                        // No Direct application?
                        // 1. create application
                        // 2. create events
                        // 3. create mapping


                        if (!remoteApplicationId) {
                            remoteApplicationId = await bOps.applications.create({
                                type: 'Basic',
                                enabled: true,
                                logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                                name: "Test Application",
                                securitySchemes: {}, // TODO: confirm this
                                description: "R&D test application for creating customers"
                            }).then(app => app.id);
                        }

                        const remoteSchemas = await bOps.ucpschemas.getAll();

                        const appOps = bOps.applications.for(remoteApplicationId);
                        const remoteDirectEvents = await appOps.dataevents.getAll();

                        console.log('remoteDirectEvents', remoteDirectEvents);

                        await Promise.all(
                            Object.entries(boilerplateDirectEvents).map(async ([eventName, {payload: boilerplateEvent, mapping: boilerplateMapping}]) => {
                                let remoteEventId = remoteDirectEvents.find(ev => ev.name == eventName)?.id;

                                if (!remoteEventId) {
                                    remoteEventId = await appOps.dataevents.create(boilerplateEvent).then(ev => ev.id);

                                    await Promise.all(
                                        Object.entries(boilerplateMapping).map(([schemaName, mappings]) => {
                                            const targetSchemaId = remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)?.id;
                                            if (!targetSchemaId)
                                                throw `mapping set to a non existing schema: ${schemaName}`;

                                            return bOps.mappings.create({
                                                sourceId: remoteEventId,
                                                targetId: targetSchemaId,
                                                mappings
                                            });
                                        })
                                    );


                                } else {
                                    const eventOps = appOps.dataevents.for(remoteEventId);
                                    const remoteEvent = await eventOps.get();

                                    if (!isEqual(remoteEvent, boilerplateEvent)) {
                                        await eventOps.update(boilerplateEvent);

                                        // const remoteEventMapping = await bOps.mappings.get();
                                        // console.log('remoteEventMapping', remoteEventMapping)
                                        await Promise.all(
                                            Object.entries(boilerplateMapping).map(([schemaName, mappings]) => {
                                                const targetSchemaId = remoteSchemas.find(remoteSchema => remoteSchema.name == schemaName)?.id;
                                                if (!targetSchemaId)
                                                    throw `mapping set to a non existing schema: ${schemaName}`;

                                                return bOps.mappings.update({
                                                    sourceId: remoteEvent.id,
                                                    targetId: targetSchemaId,
                                                    mappings
                                                });
                                            })
                                        );
                                    }

                                    // TODO: updating mapping
                                }


                            }));

                        // ±±±±±±±±±±±±


                        // if (remoteApplicationId) {
                        //     alignedDirectApp = remoteApplicationId;
                        //     // TODO: this is not DRY, function should have ONE CONCERN ONLY.. here, deal with APP only.
                        //
                        //
                        //     // don't need to update the user's direct application, because you can't have duplicates of the name, so just check event
                        //     if (remoteDirectEvents.length > 0) {
                        //         const matchingRemoteDEs = remoteDirectEvents.filter(e => Object.keys(boilerplateDirectEvents).includes(e.name));
                        //         // const diffRemoteDE = Object.values(DirectEvents).map(m => m.payload).filter(p => remoteDirectEvents.includes(p));
                        //
                        //         console.log(diffRemoteDE, 'diffRemoteDE');
                        //         console.log(matchingRemoteDEs, 'matchingRemoteDE');
                        //         // update the ones that match
                        //
                        //         if (matchingRemoteDEs.length) {
                        //             for (let remoteEvent of matchingRemoteDEs) {
                        //                 const singleEvent = await bOps.applications.for(remoteApplicationId.id).dataevents.for(remoteEvent.id).get();
                        //                 console.log('singleEvent', singleEvent)
                        //                 // are they the same as ours?
                        //                 if (singleEvent) {
                        //                     const boilerplateSingleEvent = boilerplateDirectEvents[singleEvent.name].payload
                        //                     if (isEqual(singleEvent.schema, boilerplateSingleEvent.schema)) {
                        //                         // same as ours? keep theirs!
                        //                         directEventsArray.push(remoteEvent);
                        //                         //TODO: check mapping because we have the same events
                        //
                        //                     } else {
                        //                         // different from ours? update events & update mapping!
                        //                         const directEventPayload = await bOps.applications.for(remoteApplicationId.id).dataevents.for(singleEvent.id).update({
                        //                             ...boilerplateDirectEvents[singleEvent.name].payload
                        //                         });
                        //                         directEventsArray.push(directEventPayload);
                        //                         //TODO: MAPPING - update or create if not there
                        //                     }
                        //                 }
                        //                 console.log('directEventsArray', directEventsArray)
                        //             }
                        //         } else if (diffRemoteDE) {
                        //             // have only some of the events
                        //             console.log('diffRemoteDE', diffRemoteDE)
                        //             for (let event of diffRemoteDE) {
                        //                 const directEventsPayload = await bOps.applications.for(remoteApplicationId.id).dataevents.create({ //create dataEvent for application
                        //                     ...boilerplateDirectEvents[event].payload
                        //                 }) //TODO: create  mapping
                        //                 directEventsArray.push(directEventsPayload);
                        //             }
                        //             console.log('directEventsArray', directEventsArray)
                        //         }
                        //         // there is a remote application, but he has no events
                        //     } else {
                        //         // NO DIRECT EVENTS BUT THERE IS AN APP SO CREATE Event and mapping
                        //         // create: event with schema, create mapping
                        //         for (let event of config.directEvents) {
                        //             const directEventsPayload = await bOps.applications.for(remoteApplicationId.id).dataevents.create({ //create dataEvent for application
                        //                 ...boilerplateDirectEvents[event].payload
                        //             }) //TODO: create  mapping
                        //
                        //             directEventsArray.push(directEventsPayload);
                        //         }
                        //     }
                        //     // NO remote application:
                        //     // create application, event, mapping
                        // } else {
                        //     alignedDirectApp = await bOps.applications.create({
                        //         type: 'Basic'
                        //         enabled: true,
                        //         logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                        //         name: "Test Application",
                        //         securitySchemes: {}, // TODO: confirm this
                        //         description: "R&D test application for creating customers"
                        //     });
                        //
                        //     if (alignedDirectApp)
                        //         for (let event of config.directEvents) {
                        //             const directEventsPayload = await bOps.applications.for(alignedDirectApp.id).dataevents.create({
                        //                 ...boilerplateDirectEvents[event].payload
                        //             })
                        //             directEventsArray.push(directEventsPayload);
                        //
                        //             console.log("directEvents", directEventsArray)
                        //         }
                            //TODO: create mapping

                            // now we have a new event, create the mapping

                            // targetID = dataeventId, sourceID = application
                        // }
                        const alignedDirectEvent = Promise.resolve(directEventsPromise)
                        const alignedDirectApplication = Promise.resolve(directApplicationPromise)
                        console.log('Direct Application is aligned!', alignedDirectApp);
                        console.log('Direct Event is aligned!', directEventsArray)
                        /*

                            create direct application:
                              `  name: Test Application
                                desc: R&D test application for creating customers
                                enabled: true
                                create direct events according to boilerplate
                                    settings
                                    schema
                                    mapping TODO:
                                        to profile
                                            TO THE SAME IDENTIFIER
                                        to activities`
                         */
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
                            console.log(remoteAudience)
                            if (isEqual(remoteAudience, boilerplateAudience)) {
                                console.log('is equal')
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
                        this.applications.alignAll(),
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
