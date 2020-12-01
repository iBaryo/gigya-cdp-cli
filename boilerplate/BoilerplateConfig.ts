 export const config = {
    commonIdentifier: 'masterDataId',
    purposes: ['basic', 'marketing'],
    activityIndicators: ['Purchase Sum'],
     directEvents: ['purchase', 'page-view']
} as const;
export type Purpose = typeof config.purposes[0];
export type ActivityIndicator = typeof config.activityIndicators[0]
