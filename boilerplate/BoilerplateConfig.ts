import {PurposeName} from "./purposes/purposes";

export const config = {
    workspaceId: '19834500',
    commonIdentifier: 'masterDataId',
    purposes: ['basic', 'marketing'] as PurposeName[],
    activityIndicators: ['Purchase Sum'],
    activities: ['Orders', 'Page-Views'],
    directEventNames: ['onPurchase', 'onPageView']
};
export type Purpose = typeof config.purposes[0];
export type ActivityIndicator = typeof config.activityIndicators[0]
export type DirectEventName = typeof config.directEventNames[0]
