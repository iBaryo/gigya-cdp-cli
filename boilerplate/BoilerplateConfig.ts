import {PurposeName} from "./purposes/purposes";

export const config = {
    workspaceId: '', // set this on script that runs when you initiate sdk & call createBoilerplate **
    commonIdentifier: 'masterDataId',
    commonIdentifierFaker: 'random.uuid',
    purposes: ['basic', 'marketing'] as PurposeName[],
    activityIndicators: ['Purchase Sum'],
    activities: ['Orders', 'Page-Views'],
    directEventNames: ['onPurchase', 'onPageView']
};
export type Purpose = typeof config.purposes[0];
export type ActivityIndicator = typeof config.activityIndicators[0]
export type DirectEventName = typeof config.directEventNames[0]


// ** looks like the below:

// config.workspaceId = '13108767';
// createBoilerplate(sdk).for('4_Gg6YEJye9VWNcVe4w9ogMw').alignAll();