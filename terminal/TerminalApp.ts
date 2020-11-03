import {terminal} from "terminal-kit";

export const Cancel = Symbol('cancel current step');
export const Repeat = Symbol('repeat current step');
export const Continue = Symbol('continue normally to the next step');
export const Skip = Symbol('skip next step');
export const End = Symbol('end app');
export const Restart = Symbol('restart app');

interface TerminalCmp<T> {
    show(): Promise<StepResult<T>>;
}

type FlowContext<CTX extends object> = CTX & {
    setGlobally: <K extends keyof CTX>(key: K, val: CTX[K]) => CTX[K]
};

// a context-change can be either for a specific field or change multiple properties or none at all.
type ContextChange<CTX extends object> = CTX[keyof CTX] | Partial<CTX> | void;

// a step can either change the flow, do nothing or return something (like changing the flow).
type StepResult<R extends ContextChange<object>|any> = R | void | Symbol;

// a step starts with a context and returns a step result to change the context or manipulate the flow.
type Step<CTX extends object, R extends ContextChange<CTX> = ContextChange<CTX>> =
    (context: FlowContext<CTX>) => Promise<StepResult<R>>;

// general context step can change partial part of the context (or not).
type GeneralContextStep<CTX extends object> = [step: Step<CTX, Partial<CTX> | void>];

// a specific prop step changes that prop in the context.
type ContextPropStep<CTX extends object, K extends keyof CTX> = [ctxProp: K, step: Step<CTX, CTX[K]>];

// an app step can be either general or for a prop
type AppStep<CTX extends object, K extends ((keyof CTX) | unknown) = never> =
    K extends keyof CTX ? ContextPropStep<CTX, K> : GeneralContextStep<CTX>;

// Terminal app for managing the flow using steps:
export class TerminalApp<CTX extends object> implements TerminalCmp<CTX> {
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

// flow/terminal utilities:

export async function PrintAndEnd(title: string) {
    terminal.green(title);
    return End;
}

export async function errorAnd(res: Symbol, title: string) {
    terminal.red(title);
    return res;
}

export function showMenu<T>(title: string, items: T[], keyFn: (i: T) => string = String) {
    terminal.cyan(title);
    if (!items.length) {
        terminal.red(`\n<empty>\n`);
        return Promise.resolve(Cancel);
    }
    return terminal.gridMenu(items.map(keyFn), {exitOnUnexpectedKey: true}).promise.then(res => {
        if (res.selectedIndex == undefined) {
            terminal.grey(`\n<cancel>\n`);
            return Cancel;
        }

        terminal.green(`selected: ${res.selectedText}\n`);
        return items[res.selectedIndex];
    });
}

export type YesNoAnswer = 'n' | 'y';

export function showYesOrNo<T>(title: string, defaultAnswer: YesNoAnswer, results: ((res: boolean) => Promise<StepResult<T>>) | { [k in YesNoAnswer]?: () => Promise<StepResult<T>> }) {
    const answers = {
        _default: defaultAnswer,
        yes: ['y', 'y' == defaultAnswer ? 'ENTER' : ''] as const,
        no: ['n', 'n' == defaultAnswer ? 'ENTER' : ''] as const,
        toString() {
            return [
                'y',
                'n'
            ].map(a => this._default == a ? a.toUpperCase() : a).join('|');
        }
    };
    terminal.cyan(`${title} (${answers.toString()})`);
    return terminal.yesOrNo(answers).promise.then(r => {
        terminal('\n');
        return typeof results == 'function' ? results(r) : results[r ? 'y' : 'n']?.();
    });
}

export function requestTextStep<K extends string>(field: K) {
    return [field, async () => requestText(`${field}:`)] as ContextPropStep<{ [key in K]: any }, K>;
}

export async function requestText(title: string, required = true) {
    while (true) {
        terminal.cyan(title);
        const res = await terminal.inputField({}).promise;
        terminal('\n');
        if (res === undefined) {
            return Cancel;
        } else if (res) {
            return res;
        } else if (!required) {
            return '';
        } else {
            terminal.red('must enter a value\n');
        }
    }
}

export async function requestNumber(title: string, def?: number) {
    const defText = def === undefined ? '' : ` (default: ${def})`;
    const inputText = `${title}${defText}`;
    while (true) {
        const res = await requestText(inputText, def === undefined);
        if (res === Cancel)
            return Cancel;

        const number = parseInt(res || def?.toString());

        if (isNaN(number)) {
            terminal.red(`invalid number`);
        } else {
            return number;
        }
    }
}
