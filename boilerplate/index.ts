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
import {activitySchemas as boilerplateActivitySchemas} from "./schemas/ActivitiesSchemas";
import {purchaseSum as boilerplateActivityIndicator} from "./ActivityIndicators/PurchaseSum";
import {VIPSegment} from "./Segments/VIPSegment";
import {config} from "./BoilerplateConfig";
import {CampaignAudience} from "./Audiences/AudienceCondition";

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

                        const userOrdersActivitySchema = await bOps.ucpschemas.getAll().then(schemas => schemas.find(s => s.name == 'Orders'));
                        const userActivityIndicators = await bOps.activityIndicators.getAll().then(a => a.find(ind => (config.activityIndicators.includes(ind.name))));
                        // haven't taken into account if more than one activity indicator... if bpConfig changes //TODO
                        if (!userActivityIndicators) {
                            alignedActivityIndicatorPromise = bOps.activityIndicators.create({
                                ...boilerplateActivityIndicator,
                                schemaId: userOrdersActivitySchema.id,
                            });
                        } else {
                            const fieldDiffs = Object.entries(boilerplateActivityIndicator).find(f => !Object.entries(userActivityIndicators).includes(f));

                            alignedActivityIndicatorPromise = !fieldDiffs.length ?
                                Promise.resolve(alignedActivityIndicatorPromise)
                                : bOps.activityIndicators.for(userActivityIndicators.id).update({
                                    ...boilerplateActivityIndicator,
                                    schemaId: userOrdersActivitySchema.id,
                                });
                        }
                        const alignedActivityIndicator = await alignedActivityIndicatorPromise;
                        console.log('~~~~~~~ aligned Activity Indicator:', alignedActivityIndicator)
                    },
                },

                segments: {
                    async align() {

                        let alignedSegmentPromise: Promise<Segment>;

                        console.log('~~~~~~~ aligning segment')
                        const userVIPSegment = await bOps.segments.getAll().then(segments => segments.find(s => s.name == 'VIP'));
                        console.log(userVIPSegment, VIPSegment)

                        if (userVIPSegment) {
                            // TODO: i want to implement an actual comparison but really struggling
                            // let fields = ['operator', 'operand', 'field']
                            // let numberMatches = 0
                            // let i = 0
                            // while(i <= 2) {
                            //     console.log('zzzz', userVIPSegment.values[i].condition[fields[i]], VIPSegment.values[i].condition[fields[i]], 'zzzz') wonnt work with operand and field because ther are objects..
                            //     if ((userVIPSegment.values[i].condition == VIPSegment.values[i].condition) && (userVIPSegment.values[i].value == VIPSegment.values[i].value)) {
                            //         console.log('matches')
                            //         numberMatches += 1
                            //         console.log(numberMatches)
                            //
                            //     }
                            //     i += 1
                            // }
                            // console.log(numberMatches)
                            // if(numberMatches === 3){
                            //     console.log('resolve')
                            //     await Promise.resolve(alignedSegmentPromise)
                            // } else {
                            alignedSegmentPromise = bOps.segments.for(userVIPSegment.id).update({
                                ...VIPSegment
                            })
                            // }
                        } else {
                            alignedSegmentPromise = bOps.segments.create({
                                ...VIPSegment
                            })
                        }
                        const alignedSegment = await alignedSegmentPromise
                        console.log('~~~~~~ segment is aligned!', alignedSegment)
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
                audiences: {
                    async align() {
                        console.log('~~~~~~~ aligning Audiences')
                        let boilerAudience;
                        const view = await bOps.views.getAll().then(views => views.find(v => v.type == "Marketing"));
                        const vOps = bOps.views.for(view.id);

                        const userAudience = await vOps.audiences.getAll().then(audiences => audiences.find(a => a.name == "My Campaign Audience"))

                        if (userAudience) {
                            console.log(userAudience)
                            boilerAudience = await vOps.audiences.for(userAudience.id).update({...CampaignAudience as any}) //TODO: dont do this. but getting errors that I dont know how to deal with.
                        } else {
                            boilerAudience = await vOps.audiences.create({...CampaignAudience as any, viewId: view.id}) //TODO: dont do this.
                        }

                        console.log('~~~~~ Audience aligned!', boilerAudience)
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


