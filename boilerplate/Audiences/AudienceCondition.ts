import {Audience} from "../../gigya-cdp-sdk/entities/Audience";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {AudienceCondition, ViewId} from "../../gigya-cdp-sdk/entities";

export const CampaignAudience: Payload<Audience> = {
    viewId: "" as ViewId,
    name: "My Campaign Audience",
    enabled: true,
    purposeIds: [],
    query: {
        operator: "and",
        conditions: [
            {
                type: 'profile',
                fieldCondition: {
                    operator: 'and',
                    conditions: [
                        {
                            field: 'age', // but we don't have age
                            condition: {
                                operator: 'greaterThan',
                                operand: {
                                    type: 'double',
                                    value: 18
                                }
                            }
                            // {
                            //     field: 'birthdate',
                            //     condition: {
                            //         operator: 'before',
                            //         operand: {
                            //             type: 'string',
                            //             value: new Date().setFullYear(new Date().getFullYear() - 18) but this is: 1038739299847
                            //         }
                            //     }
                        },
                        {
                            field: "gender",
                            condition: {
                                operator: 'equal',
                                operand: {
                                    type: 'string',
                                    value: 'female'
                                }
                            }
                        }
                    ]
                }
            },
            {
                type: 'segment',
                name: 'VIP',
                values: ['Gold']
            }
        ]
    }
}
