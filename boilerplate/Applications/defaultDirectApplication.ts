import {Event, EventType} from "../../gigya-cdp-sdk/entities/Event";
import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {Purpose} from "../BoilerplateConfig";
import {Application} from "../../gigya-cdp-sdk/entities/Application";

export const defaultDirectApplication: Payload<Application> = {
    type: 'Basic',
    enabled: true,
    logoUrl: "https://universe.eu5-st1.gigya.com/assets/img/connect-application.png",
    name: "Direct Test Application",
    securitySchemes: {},
    description: "R&D test application for creating customers",
    businessUnitId: ''
};
