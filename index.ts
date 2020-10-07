import {Argv, argv} from "yargs";
import {terminal} from "terminal-kit";
import {CDP} from "./SDK";
import {Application, Event} from "./SDK/interfaces";
import {ErrorAndEnd, Menu, RequestNumber, TerminalApp} from "./terminal/TerminalApp";
import {JSONSchema7} from "json-schema";

export interface CliArgs {
    userKey: string,
    secret: string,
}

const {userKey, secret} = argv as Argv<CliArgs>['argv'];

const sdk = new CDP({userKey, secret, forceSimple: true});

interface AppContext {
    ws: { id: string; name: string; };
    bu: { id: string; name: string; };
    app: { id: string; name: string; };
    event: { id: string; name: string; schema: JSONSchema7; },
    shouldEditSchema: boolean;
    eventsNum: number;
    batchSize: number;
    sentEvents: any[];
}

(async () => {
    terminal.bgMagenta.black('Welcome to CDP CLI!\n');
    await new TerminalApp<AppContext>().show([
        ['ws', async () => {
            const wss = await sdk.get<Array<{ id: string; name: string; }>>(`workspaces`);
            if (!wss.length)
                return new ErrorAndEnd(`no available workspaces`);

            return new Menu(`select workspace:`, wss, ws => ws.name);
        }],
        ['bu', async (context) => {
            const bUnits = await sdk.get<Array<{ id: string; name: string; }>>(`workspaces/${context.ws.id}/businessunits`);
            return new Menu(`select business unit:`, bUnits, bu => bu.name);
        }],
        ['app', async context => {
            const apps = await sdk.get<Application[]>(`workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications`);
            return new Menu(`select application:`, apps, app => app.name);
        }],
        ['event', async context => {
            const events = await sdk.get<Event[]>(`workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications/${context.app.id}/dataevents`);
            return new Menu(`select event:`, events, event => event.name);
        }],
        // TODO: While Terminal component
        // ['shouldEditSchema', async context => {
        //     const fakified = fakify(context.event.schema);
        //     const fields = getFields(fakified);
        //
        //     let shouldEditSchema = true;
        //     while (shouldEditSchema) {
        //         fields.forEach(f => {
        //             terminal.white(f);
        //             terminal('\n');
        //         });
        //
        //         terminal.cyan(`would you like to change fakers for schema fields? (y|N)`);
        //         shouldEditSchema = await terminal.yesOrNo({yes: 'y', no: ['n', 'ENTER']}).promise;
        //
        //         if (shouldEditSchema) {
        //             const field = await showMenu(`select a field:`, fields);
        //             field.schema.faker = await showMenu(`select a faker:`, getFakers());
        //             terminal.green(`done: ${field.toString()}`)
        //         }
        //     }
        // }],
        ['eventsNum', async context => {
            return new RequestNumber(`number of events:`, 10);
        }],
        ['batchSize', async context => {
            return new RequestNumber(`batch size:`, 50);
        }],
        // TODO: Operation Terminal component
        // ['sentEvents', async context => {
        //     // const fakeEvents = createArray(quantity, () => jsf.generate(fakified));
        //     //
        //     // function ingest(event: object) {
        //     //     return sdk.post(
        //     //         `workspaces/${selectedWs.id}/businessunits/${selectedBUnit.id}/applications/${selectedApp.id}/dataevents/${selectedEvent.id}`,
        //     //         event).catch();
        //     // }
        //     //
        //     // let ingestResponses: Array<{ errCode?: number }>;
        //     // if (quantity >= batch) {
        //     //     ingestResponses = await Promise.all(fakeEvents.map(ingest));
        //     // } else {
        //     //     const delay = await requestNumber(`batch delay ms:`, 1000);
        //     //
        //     //     ingestResponses = await asyncBulkMap(fakeEvents, batch, {
        //     //         beforeBulk: logBulk,
        //     //         map: ingest,
        //     //         afterBulk: createDelay(delay)
        //     //     });
        //     // }
        //     return null;
        // }],
        // TODO: final step
        // ['sentEvents', async context => {
        //     //
        //     // const failed = ingestResponses.filter(r => r.errCode != 0);
        //     //
        //     // if (!failed.length) {
        //     //     terminal.green(`all ingest requests passed successfully!`);
        //     // } else {
        //     //     terminal.yellow(`${failed.length} failed out of ${ingestResponses.length} requests (${failed.length / ingestResponses.length * 100})`);
        //     //     terminal.white(`log failed? [Y|n]`);
        //     //     if (await terminal.yesOrNo({yes: ['y', 'ENTER'], no: 'n'}).promise) {
        //     //         terminal.white(failed);
        //     //     }
        //     // }
        //     return null;
        // }]
    ])
        .then(() => terminal.bgMagenta.black('Thanks for using CDP CLI!'));
})();

