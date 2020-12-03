export const config = {
    commonIdentifier: 'masterDataId',
    purposes: ['basic', 'marketing'],
    activityIndicators: ['Purchase Sum'],
    directEvents: ['onPurchase', 'onPageView'],
    activities: ['Orders', 'Page-Views']
}; // why as const --- it had as const here????
export type Purpose = typeof config.purposes[0];
export type ActivityIndicator = typeof config.activityIndicators[0]
