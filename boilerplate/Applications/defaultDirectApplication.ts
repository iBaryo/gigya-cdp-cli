import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Application} from "../../gigya-cdp-sdk/entities/Application";

export const defaultDirectApplication: Payload<Application> = {
    type: 'Direct',
    enabled: true,
    logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
    name: "Direct Test Application",
    description: "R&D test application for creating customers",
    businessUnitId: ''
};
