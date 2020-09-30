import {Req} from "../request";

export interface ISigner {
    sign(request: Req): Req;
}
