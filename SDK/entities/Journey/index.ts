import {Entity} from "../common";
import {JourneyStep, JourneyStepId} from "./JourneySteps";
//import {JourneyCondition} from "./Condition/EntityCondition";

export interface Index extends Entity {
    // viewId: Id;
    steps: JourneyStep[];
    //trigger: JourneyCondition;
    then: JourneyStepId[];
}