import {terminal} from "terminal-kit";

export const Cancel = Symbol('cancel current step');
export const Repeat = Symbol('repeat current step');
export const Continue = Symbol('continue normally to the next step');
export const Skip = Symbol('skip next step');
export const End = Symbol('end app');

export type StepResult<T> = T | void | Symbol;

export interface TerminalCmp<T> {
    show(): Promise<StepResult<T>>;
}

export type Step<T, R = any> = (context: T) => Promise<StepResult<R>>;
type ContextlessStep<CTX> = [step: Step<CTX, CTX[keyof CTX]>];
type ContextStep<CTX extends object> = [ctxKey: keyof CTX, ...step: ContextlessStep<CTX>];
type AppStep<CTX extends object> = ContextStep<CTX> | ContextlessStep<CTX>;

export class TerminalApp<CTX extends object> implements TerminalCmp<object> {
    constructor(public config = {endMsg: ``}) {
    }

    public async show(steps?: Array<AppStep<CTX>>) {
        if (!steps?.length ?? true)
            return {};

        const stepResults = steps.map(() => undefined);
        const getContext = (upTo?: number) => stepResults.slice(0, upTo).reduce((res, cur) => ({...res, ...cur}), {} as CTX);

        for (let i = 0; i < steps.length; ++i) {
            let [contextKey, step] = (steps[i].length == 1 ? ['', steps[i][0]] : steps[i]) as ContextStep<CTX>;

            const res = await step(getContext(i));

            switch (res) {
                case Cancel:
                    i -= 2;
                    if (i < 0)
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
                case Continue:
                    break;
                default:
                    if (contextKey)
                        stepResults[i] = {[contextKey]: res};
                    break;
            }
        }

        return getContext();
    }
}

export async function PrintAndEnd(title: string) {
    terminal.green(title);
    return End;
}
export async function errorAndEnd(title: string) {
    terminal.red(title);
    return End;
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
export function showYesOrNo<T>(title: string, defaultAnswer: YesNoAnswer,   results: { [k in YesNoAnswer]?: () => Promise<StepResult<T>> }) {
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
        return results[r ? 'y' : 'n']?.();
    });
}

export function requestTextStep<T extends string>(field: T) {
    return [field, async () => requestText(`${field}:`)] as ContextStep<{[k in T]: any}>;
}

export async function requestText(title: string) {
    terminal.cyan(title);
    const res = await terminal.inputField({}).promise;
    terminal('\n');
    if (res === undefined)
        return Cancel;
    return res;
}

export async function requestNumber(title: string, def?: number) {
    const defText = def === undefined ? '' : ` (default: ${def})`;
    const inputText = `${title}${defText}`;
    while (true) {
        const res = await requestText(inputText);
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
