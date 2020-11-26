import {CDP} from "../gigya-cdp-sdk";
import {BusinessUnitId, SchemaType} from "../gigya-cdp-sdk/entities";
import {DirectEventName} from "./Events/Direct";
import {JSONSchema7} from "json-schema";
import {profileSchema as boilerplateProfileSchema} from "./schemas/ProfileSchema";
import {activitySchemas as boilerplateActivitySchemas} from "./schemas/ActivitiesSchemas";

/*
       1. always extend, never delete
       2. log operations
       3. only update if there a change is required, e.g. if the current schema already contains the boilerplate schema then no need to update.
 */

export function createBoilerplate(sdk: CDP) {
    return {
        for(bUnitId: BusinessUnitId) {
            const bOps = sdk.api.businessunits.for(bUnitId);

            return {
                schemas: {
                    async alignProfile() {
                        let alignedProfile;
                        console.log("~~~~~~~~ aligning profile schema ~~~~~~~~")
                        console.log('~~~~~~~~ boilerplate profile schema:', boilerplateProfileSchema)

                        const userProfileSchema = await bOps.ucpschemas.getAll().then(schemas => schemas.find(s => s.schemaType == SchemaType.Profile))

                        if(userProfileSchema) {
                            const parsedProfile = JSON.parse(userProfileSchema.schema?.toString())
                            const profileFields = Object.keys(parsedProfile?.properties)
                            console.log('~~~~~~~~ your profile schema:', parsedProfile.properties)

                            const boilerplateProfileFields = Object.keys(boilerplateProfileSchema)
                            const fieldDiffs = boilerplateProfileFields.filter(f => !profileFields.includes(f))

                            if (fieldDiffs.length) {
                                console.log("~~~~~~ schema field diffs:", fieldDiffs)
                                alignedProfile = bOps.ucpschemas.for(userProfileSchema.id).update({
                                    enabled: userProfileSchema.enabled,
                                    name: "Profile",
                                    protectedFields: userProfileSchema.protectedFields,
                                    schema: JSON.stringify({...parsedProfile, properties:{...boilerplateProfileSchema, ...parsedProfile.properties}}) as JSONSchema7,
                                    schemaType: 0
                                }).then(updated => console.log('~~~~~ aligned profile:', updated))
                                // return alignedProfile
                            }
                        } else {
                            alignedProfile = bOps.ucpschemas.create({
                                enabled: false,
                                name: "Profile",
                                protectedFields: undefined,
                                schema: JSON.stringify(boilerplateProfileSchema) as JSONSchema7,
                                schemaType: 0
                            }).then(newProfile => console.log('~~~~~ aligned profile:', newProfile))
                            // return alignedProfile = boilerplateProfileSchema
                        }
                        console.log('~~~~~~~ profile aligned!')
                    },
                    async alignActivities() {
                        let alignedActivity;
                        const boilerplateActivities = Object.keys(boilerplateActivitySchemas)

                        for(let activity of boilerplateActivities) {
                            console.log(`~~~~~~ aligning ${activity} Activity`)

                            console.log(activity)
                            const userActivitySchema = await bOps.ucpschemas.getAll().then(schemas => schemas.find(s => s.name == activity))
                            if (userActivitySchema) {
                                // userActivities holds schema of activities in a JSON schema string.
                                // we need to check the properties against the boilerplate properties
                                const parsedUserActivity = JSON.parse(userActivitySchema.schema?.toString())
                                const userOrdersProperties = Object.keys(parsedUserActivity?.properties)
                                console.log(`your ${activity} schema:`, parsedUserActivity.properties)

                                const fieldDiffs = Object.keys(boilerplateActivitySchemas[activity].properties).filter(f => !userOrdersProperties.includes(f))

                                if (fieldDiffs.length) {
                                    console.log(`~~~~~~ ${activity} schema field diffs:`, fieldDiffs)
                                    return alignedActivity = bOps.ucpschemas.for(userActivitySchema.id).update({
                                        enabled: userActivitySchema.enabled,
                                        name: activity,
                                        protectedFields: userActivitySchema.protectedFields,
                                        schema: JSON.stringify({
                                            ...parsedUserActivity,
                                            properties: {...boilerplateActivitySchemas[activity], ...parsedUserActivity.properties}
                                        }) as JSONSchema7,
                                        schemaType: 1
                                    })
                                }
                            } else {
                                return alignedActivity = bOps.ucpschemas.create({
                                    enabled: false,
                                    name: activity,
                                    protectedFields: undefined,
                                    schema: JSON.stringify(boilerplateActivitySchemas[activity]) as JSONSchema7,
                                    schemaType: 1
                                }).then(res => console.log(res))
                            }
                                console.log(`~~~~~~~~aligned ${activity}`)
                        }
                    }
                },
                activityIndicators: {
                    async align() {
                        // TODO: zoe
                        // purchaseSum - sum of all orders.price activities
                    }
                },
                segments: {
                    async align() {
                        // TODO: zoe
                        // VIP - values: GOLD purchaseSum > 1000, SILVER purchaseSum > 500, BRONZE purchaseSum > 300
                    }
                },
                purposes: {
                    async align() {
                        // TODO: zoe
                        // basic - attributes: profile.firstName, profile.lastName, profile.primaryEmail
                        // marketing - attributes: segment.VIP, activityIndicator.purchaseSum
                    }
                },
                applications: {
                    async alignDirect() {
                        // TODO: zoe
                        /*
                            create direct application:
                                name: Test Application
                                desc: R&D test application for creating customers
                                enabled: true
                                create direct events according to boilerplate
                                    settings
                                    schema
                                    mapping
                                        to profile
                                            TO THE SAME IDENTIFIER
                                        to activities
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
//                         const view = await bOps.views.getAll().then(views => views.find(v => v.type == "Marketing"));
//                         const vOps = bOps.views.for(view.id);
// const boilerAudience = await vOps.audiences.create({
//     name: "My Campaign Audience",
//     enabled: "true",
//     purposeIds: [],
//     query: {
//         type: "profile",
//         fieldCondition: {
//             operator: "and",
//             conditions: [
//                 {
//                     field: "age",
//                     condition: {
//                         operator: "greaterThan",
//                         operand: {
//                             type: "number",
//                             value: 23
//                         }
//                     },
//                 {
//                     field: "gender",
//                     condition: {
//                         operator: "equal",
//                         operand: {
//                             type: "string",
//                             value: "female"
//                         }
//                     }
//                 },
//         },
//                     ],
//                     }
//                     },
//                         {
//                             type: "segment", name
//                         :
//                             "VIP",
//                                 value
//                         :
//                             "VIP"
//                         }
//   }
// })
                        // TODO: zoe
                        // in Marketing view
                        //  "My Campaign Audience" - all VIP GOLD females over 23 years old
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


