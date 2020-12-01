import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Segment} from "../../gigya-cdp-sdk/entities/Segment";

export type SegmentName = 'VIP'

export const VIPSegment: Payload<Segment> = {
    description: 'VIP Customers',
    name: "VIP" as SegmentName,
    enabled: true,
    values: [
        {
            condition: {
                field: {
                    name: 'Purchase Sum',
                    type: 'activityIndicator'
                },
                operator: 'greaterThan',
                operand: {
                    type: 'double',
                    value: 1000
                }
            },
            value: 'Gold'
        },
        {
            condition: {

                operator: 'and',
                conditions: [
                    {
                        field: {
                            name: 'Purchase Sum',
                            type: 'activityIndicator'
                        },
                        operator: 'greaterThan',
                        operand: {
                            type: 'double',
                            value: 500
                        }
                    },
                    {
                        field: {
                            name: 'Purchase Sum',
                            type: 'activityIndicator'
                        },
                        operator: 'lessThan',
                        operand: {
                            type: 'double',
                            value: 1000
                        }
                    },
                ],
            },
            value: 'Silver'
        },
        {
            condition: {
                operator: 'and',
                conditions: [
                    {
                        field: {
                            name: 'Purchase Sum',
                            type: 'activityIndicator'
                        },
                        operator: 'greaterThan',
                        operand: {
                            type: 'double',
                            value: 300
                        }
                    },
                    {
                        field: {
                            name: 'Purchase Sum',
                            type: 'activityIndicator'
                        },
                        operator: 'lessThan',
                        operand: {
                            type: 'double',
                            value: 500
                        }
                    },
                ],
            },
            value: 'Bronze'
        }
    ]
}
