import {Payload} from "../../gigya-cdp-sdk/entities/common";
import {config} from "../BoilerplateConfig";
import {MatchingRule} from "../../gigya-cdp-sdk/entities/MatchingRule";
import {BusinessUnitId} from "../../gigya-cdp-sdk/entities";

const {commonIdentifier} = config;

export const matchingRule: Partial<MatchingRule> = {
    attributeName: commonIdentifier,
    name: commonIdentifier,
    ucpResolutionPolicy: "merge",
};
