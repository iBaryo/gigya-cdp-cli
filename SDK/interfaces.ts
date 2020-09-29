import {JSONSchema7} from "json-schema";

export interface Application {
    id: string;
    name: string;
}

export interface Event {
    id: string;
    name: string;
    schema: JSONSchema7;
}
