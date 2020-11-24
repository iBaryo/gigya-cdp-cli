export const config = {
    commonIdentifier: 'masterDataId',
    purposes: ['basic', 'marketing'],

} as const;
export type Purpose = typeof config.purposes[0];