import {terminal} from "terminal-kit";

export function showMenu<T>(title: string, items: T[], keyFn: (i: T) => string = String): Promise<T> {
    terminal.cyan(title);
    if (!items.length) {
        terminal.red(`\n<empty>\n`);
    }
    return terminal.gridMenu(items.map(keyFn), {exitOnUnexpectedKey: true}).promise.then(res => {
        if (res.selectedIndex == undefined) {
            terminal.grey(`\n<cancel>\n`);
            return undefined;
        }

        terminal.green(`selected: ${res.selectedText}\n`);
        return items[res.selectedIndex];
    });
}

export async function requestNumber(title: string, def?: number): Promise<number> {
    const defText = def == undefined ? '' : ` (default: ${def}`;
    const inputText = `${title}${defText}`;
    while (true) {
        terminal.cyan(inputText);
        const res = parseInt(
            (await terminal.inputField({}).promise)
            || def?.toString()
        );

        if (!isNaN(res))
            return res;
        else
            terminal.red(`invalid number`);
    }
}
