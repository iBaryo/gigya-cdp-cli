import {CDP} from "../gigya-cdp-sdk";
import {BusinessUnitId} from "../gigya-cdp-sdk/entities";
import {DirectEventName} from "./Events/Direct";


export function createBoilerplate(sdk: CDP) {
    return {
        for(bUnitId: BusinessUnitId) {
            const bOps = sdk.api.businessunits.for(bUnitId);

            return {
                schemas: {
                    async alignProfile() {
                        // TODO: zoe
                        // complete missing fields
                    },
                    async alignActivities() {
                        // TODO: zoe
                        // complete missing activities & fields
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
                            get all connectors
                            for each cloud storage connector
                            create an application -
                                name according to connector's
                                enabled: false
                                mock all other fields
                                mock auth & config
                                create an event
                                    name: `new customers from ${app.name}`
                                    purposes: basic
                                    mock settings & config0
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

                    await this.applications.alignAll();
                    await this.audiences.align();
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