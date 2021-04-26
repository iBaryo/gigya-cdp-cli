import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {ActivityIndicator} from "../../gigya-cdp-sdk/entities/ActivityIndicator";
import {SchemaId} from "../../gigya-cdp-sdk/entities";

export type ActivityIndicatorName = 'purchaseSum'

// @ts-ignore
export const purchaseSum: Payload<ActivityIndicator> = {
    calculationMethod: {
        field: "price",
        method: "sum"
    },
    dateRange: {
        method: "allTime"
    },
    name: "Purchase Sum",
    enabled: false,
    schemaId: "" as SchemaId,
    condition: {},
    description: 'Sum of Purchases'
}

