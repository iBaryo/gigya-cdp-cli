import {PurposeName} from "./purposes/purposes";

export const config = {
    commonIdentifier: 'masterDataId',
    purposes: ['basic', 'marketing'] as PurposeName[],
    activityIndicators: ['Purchase Sum'],
    activities: ['Orders', 'Page-Views']
}; // why as const --- it had as const here????
export type Purpose = typeof config.purposes[0];
export type ActivityIndicator = typeof config.activityIndicators[0]
