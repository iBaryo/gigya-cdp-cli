import {Audience} from "../../gigya-cdp-sdk/entities/Audience";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {PurposeName} from "../purposes/purposes";

export const CampaignAudience: Payload<Audience> = {
    name: "My Campaign Audience",
    enabled: true,
    purposeIds: ['basic', 'marketing'] as PurposeName[],
    description: "Customers who are female, older than 18 and are in 'Gold' VIP segment",
    query: {
        operator: "and",
        conditions: [
            {
                operator: 'and',
                conditions: [
                    {
                        type: 'profile',
                        fieldCondition: {
                            field: 'gender',
                            condition: {
                                operand: {
                                    type: 'string',
                                    value: 'female'
                                },
                                operator: 'equal'
                            }
                        }
                    },
                    {
                        type: 'profile',
                        fieldCondition: {
                            field: 'birthdate',
                            condition: {
                                operand: {
                                    type: 'date',
                                    value: getDateEighteenYearsAgo().toISOString()
                                },
                                operator: 'before'
                            }
                        },
                    }
                ]
            },
            {
                type: 'segment',
                name: 'VIP',
                values: ['Gold']
            }
        ]
    }
}

function getDateEighteenYearsAgo() {
    const timestampEighteenYearsAgo = new Date().setFullYear(new Date().getFullYear() - 18)
    return new Date(timestampEighteenYearsAgo)
}
