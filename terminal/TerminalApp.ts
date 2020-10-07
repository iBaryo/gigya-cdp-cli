import {terminal} from "terminal-kit";

export const Cancel = Symbol('cancel current step');
export const Repeat = Symbol('repeat current step');
export const Skip = Symbol('skip next step');
export const End = Symbol('end app');

export type StepResult<T> = T | undefined | Symbol;

export interface TerminalCmp<T> {
    show(): Promise<StepResult<T>>;
}

export type Step<T, R = any> = TerminalCmp<R> | ((context: T) => Promise<TerminalCmp<R>>);

type AppStep<CTX extends object> = [ctxKey: keyof CTX, step: Step<CTX, CTX[keyof CTX]>];

export class TerminalApp<CTX extends object> implements TerminalCmp<object> {
    constructor(public config = {endMsg: ``}) {
    }

    public async show(steps?: Array<AppStep<CTX>>) {
        if (!steps?.length ?? true)
            return {};

        const stepResults = steps.map(() => undefined);
        const getContext = (upTo?: number) => stepResults.slice(0, upTo).reduce((res, cur) => ({...res, ...cur}), {} as CTX);

        for (let i = 0; i >= 0 && i < steps.length; ++i) {
            let [contextKey, step] = steps[i];

            if (typeof step == 'function') {
                step = await step(getContext(i));
            }

            const res = await step.show();

            switch (res) {
                case undefined:
                case Cancel:
                    i -= 2;
                    break;
                case Repeat:
                    i--;
                    break;
                case Skip:
                    i++;
                    break;
                case End:
                    return getContext();
                default:
                    stepResults[i] = {[contextKey]: res};
                    break;
            }
        }

        return getContext();
    }
}

export class PrintAndEnd implements TerminalCmp<typeof End> {
    constructor(public title: string) {
    }

    public async show() {
        terminal.green(this.title);
        return End;
    }
}

export class ErrorAndEnd implements TerminalCmp<typeof End> {
    constructor(public title: string) {
    }

    public async show() {
        terminal.red(this.title);
        return End;
    }
}

export class Menu<T extends object> implements TerminalCmp<T> {
    constructor(public title: string, public items: T[], public keyFn: (i: T) => string = String) {
    }

    public show() {
        terminal.cyan(this.title);
        if (!this.items.length) {
            terminal.red(`\n<empty>\n`);
            return Promise.resolve(undefined);
        }
        return terminal.gridMenu(this.items.map(this.keyFn), {exitOnUnexpectedKey: true}).promise.then(res => {
            if (res.selectedIndex == undefined) {
                terminal.grey(`\n<cancel>\n`);
                return undefined;
            }

            terminal.green(`selected: ${res.selectedText}\n`);
            return this.items[res.selectedIndex];
        });
    }
}

export type YesNoAnswer = 'n' | 'y';

export class YesOrNo<T> implements TerminalCmp<T> {
    constructor(public title: string, public results: { [k in YesNoAnswer]: StepResult<T> }, public defaultAnswer: YesNoAnswer) {
    }

    private availableAnswers() {
        return {
            _default: this.defaultAnswer,
            yes: ['y', 'y' == this.defaultAnswer ? 'ENTER' : ''] as const,
            no: ['n', 'n' == this.defaultAnswer ? 'ENTER' : ''] as const,
            toString() {
                [
                    'y',
                    'n'
                ].map(a => this._default == a ? a.toUpperCase() : a).join('|');
            }
        };
    }

    show() {
        const answers = this.availableAnswers();
        terminal.cyan(`${this.title} (${answers.toString()})`);
        return terminal.yesOrNo(answers).promise.then(r => this.results[r ? 'y' : 'n']);
    }
}

export class RequestNumber implements TerminalCmp<number> {
    constructor(public title: string, public def?: number) {
    }

    public async show() {
        const defText = this.def === undefined ? '' : ` (default: ${this.def})`;
        const inputText = `${this.title}${defText}`;
        while (true) {
            terminal.cyan(inputText);
            const res = await terminal.inputField({}).promise;
            terminal('\n');
            if (res === undefined)
                return;

            const number = parseInt(res || this.def?.toString());

            if (isNaN(number)) {
                terminal.red(`invalid number`);
            } else {
                return number;
            }
        }
    }
}