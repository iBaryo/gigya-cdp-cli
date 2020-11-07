import {terminal} from "terminal-kit";
import {ContextPropStep, StepResult} from "./common";
import {Cancel, End} from "./TerminalApp";

export async function PrintAndEnd(title: string) {
    terminal.green(title);
    return End;
}

export async function errorAnd(res: Symbol, title: string) {
    terminal.red(title);
    return res;
}

export function showMenu<T>(title: string, items: T[], keyFn: (i: T) => string = String): Promise<T | Symbol> {
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
        return items[res.selectedIndex] as T;
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
