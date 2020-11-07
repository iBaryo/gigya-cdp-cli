import {AppStep, ContextPropStep, FlowContext} from "./common";

export const Cancel = Symbol('cancel current step');
export const Repeat = Symbol('repeat current step');
export const Continue = Symbol('continue normally to the next step');
export const Skip = Symbol('skip next step');
export const End = Symbol('end app');
export const Restart = Symbol('restart app');

export function isFlowSymbol(x: any): x is Symbol {
    return [
        Cancel,
        Repeat,
        Continue,
        Skip,
        End,
        Restart
    ].includes(x);
}

// Terminal app for managing the flow using steps:
export class TerminalApp<CTX extends object> {
    constructor(public initialContext: Partial<CTX> = {}) {
    }

    public async show(steps?: Array<AppStep<CTX, (keyof CTX) | Function>>) {
        if (!steps?.length ?? true)
            return {};

        const stepResults = steps.map(() => undefined);

        const getContext = (upTo?: number) => [
            this.initialContext,
            ...stepResults.slice(0, upTo)
        ].reduce((res, cur) => ({...res, ...cur}), {
            setGlobally: (key, val) => this.initialContext[key] = val
        } as FlowContext<CTX>);

        for (let i = 0; i < steps.length; ++i) {
            let [contextKey, step] = (steps[i].length == 1 ? ['', steps[i][0]] : steps[i]) as ContextPropStep<CTX, keyof CTX>;

            const res = await step(getContext(i));

            switch (res) {
                case Cancel:
                    i -= 2;
                    if (i < -1)
                        return Cancel;
                    break;
                case End:
                    return Cancel;
                case Repeat:
                    i--;
                    break;
                case Skip:
                    i++;
                    break;
                case Restart:
                    i = -1;
                    break;
                case Continue:
                    break;
                default:
                    stepResults[i] = contextKey ? {[contextKey]: res} : res;
                    break;
            }
        }

        return getContext();
    }
}