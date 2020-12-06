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
import {DirectEventName, DirectEvents} from "./Events/Direct";
import {profileSchema as boilerplateProfileSchema} from "./schemas/ProfileSchema";
import {ActivityName, activitySchemas as boilerplateActivitySchemas} from "./schemas/ActivitiesSchemas";
import {purchaseSum as boilerplateActivityIndicator} from "./ActivityIndicators/PurchaseSum";
import {VIPSegment} from "./Segments/VIPSegment";
import {config} from "./BoilerplateConfig";
import {CampaignAudience as boilerplateAudience} from "./Audiences/AudienceCondition";
import {Audience} from "../gigya-cdp-sdk/entities/Audience";
import {AudienceCondition} from "../gigya-cdp-sdk/entities/Audience/AudienceCondition";

const isEqual = require('lodash/isEqual')

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
                            if (numberMatches == 3) {
                                alignedSegmentPromise = Promise.resolve(remoteSegment);
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
                        console.log('~~~~~~ segment is aligned!', alignedSegment.values);
                    }
                },

                purposes: {
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
                        // let mappingsPromise = Promise<>

                        console.log("~~~~~~~ aligning Direct applications");
                        const userDirectApplication = await bOps.applications.getAll().then(apps => apps && apps.find(app => app['type'] == 'Basic' && app.name == 'Test Application'));

                        if (userDirectApplication) { // user has a direct application
                            // TODO: this is not DRY, function should have ONE CONCERN ONLY.. here, deal with APP only.
                            const userDirectEvents = await bOps.applications.for(userDirectApplication.id).dataevents.getAll().then(events => events && events.filter(e => config.directEvents.includes(e.name)));


                            // don't need to update the user's direct application, because you can't have duplicates of the name, so just check event
                            if (userDirectEvents.length) {
                                for (let event of userDirectEvents) {
                                    const singleEvent = await bOps.applications.for(userDirectApplication.id).dataevents.for(event.id).get();
                                    if (JSON.stringify(JSON.parse(singleEvent.schema.toString())) == JSON.stringify(DirectEvents[singleEvent.name].payload.schema)) {
                                        console.log('matches') // check schema matches then dont need to update the event... can now look at the mapping...
                                    }

                                    // check Model --> if different, mapping is definitely different --> update both, keep users event
                                    // check Mapping if Model is the same --> update mapping if different, else keep user's mapping.
                                    //     directEventsPromise = bOps.applications.for(userDirectApplication.id).dataevents.for(event.id).update({
                                    //         ...DirectEvents[event.name].payload
                                    //     })
                                }
                            } else {
                                // create: event with schema, create mapping
                                for (let event of config.directEvents) {
                                    directEventsPromise = bOps.applications.for(userDirectApplication.id).dataevents.create({ //create dataEvent for application
                                        ...DirectEvents[event].payload
                                    })


                                }
                            }
                            // going to have repeat of creating events
                        } else { // create application, event, mapping
                            const boilerplateDirectApplication = await bOps.applications.create({
                                enabled: true,
                                logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
                                name: "Test Application",
                                securitySchemes: {}, // TODO: confirm this
                                description: "R&D test application for creating customers"
                            }).then(app => {
                                for (let event of config.directEvents) {
                                    directEventsPromise = bOps.applications.for(app.id).dataevents.create({
                                        ...DirectEvents[event].payload
                                    })
                                }
                            })

                            // now we have a new event, create the mapping

                            // targetID = dataeventId, sourceID = application
                        }
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
                        // TODO: zoe
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

                        if (remoteAudience) {
                            console.log(remoteAudience)
                            if (isEqual(remoteAudience, boilerplateAudience)) {
                                console.log('is equal')
                                audiencePromise = Promise.resolve(remoteAudience);
                            } else {
                                audiencePromise = vOps.audiences.for(remoteAudience.id).update({
                                    enabled: true,
                                    name: boilerplateAudience.name,
                                    purposeIds: [],
                                    query: boilerplateAudience.query
                                });
                            }
                        } else {
                                audiencePromise = vOps.audiences.create({
                                    enabled: true,
                                    name: boilerplateAudience.name,
                                    purposeIds: boilerplateAudience.purposeIds,
                                    query: boilerplateAudience.query
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


