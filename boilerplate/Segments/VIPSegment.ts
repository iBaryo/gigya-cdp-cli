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
                type: "activityIndicator",
                field: "Purchase Sum",
                condition: {
                    operand: {
                        type: "double",
                        value: 1000.0
                    },
                    operator: "greaterThan"
                }
            },
            value: "Gold"
        },
        {
            condition: {
                type: "activityIndicator",
                field: "Purchase Sum",
                condition: {
                    conditions: [
                        {
                            operand: {
                                type: "double",
                                value: 500.0
                            },
                            operator: "greaterThan"
                        },
                        {
                            operand: {
                                type: "double",
                                value: 1000.0
                            },
                            operator: "lessThan"
                        }
                    ],
                    operator: "and"
                }
            },
            value: "Silver"
        },
        {
            condition: {
                type: "activityIndicator",
                field: "Purchase Sum",
                condition: {
                    conditions: [
                        {
                            operand: {
                                type: "double",
                                value: 300.0
                            },
                            operator: "greaterThan"
                        },
                        {
                            operand: {
                                type: "double",
                                value: 500.0
                            },
                            operator: "lessThan"
                        }
                    ],
                    operator: "and"
                }
            },
            value: "Bronze"
        }
    ]
}
