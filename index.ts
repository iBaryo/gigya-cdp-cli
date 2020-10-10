import {terminal} from "terminal-kit";
import {CDP} from "./SDK";
import {Application, Event} from "./SDK/interfaces";
import {
    Cancel, Continue, End,
    errorAndEnd,
    requestNumber,
    requestText,
    requestTextStep,
    showMenu,
    showYesOrNo,
    TerminalApp
} from "./terminal/TerminalApp";
import {JSONSchema7} from "json-schema";
import {fakify} from "json-schema-fakify";
import {createArray, getFakers, getFields, JSONSchemaFieldFaker} from "./utils/schema";
import * as jsf from "json-schema-faker";
import {asyncBulkMap, createDelay} from "async-bulk-map";
import {init} from "./secure-store";
import {CredentialsType} from "./SDK/Signers";

interface AppContext {
    sdk: CDP;
    ws: { id: string; name: string; };
    bu: { id: string; name: string; };
    app: { id: string; name: string; };
    event: { id: string; name: string; schema: JSONSchema7; },
    shouldEditSchema: boolean;
    fakifiedEventSchema: JSONSchema7;
    eventsNum: number;
    batchSize: number;
    delay: number;
    sentEvents: any[];
}

type Creds = { userKey: string; secret: string; };
const sStore = init<Creds>('./creds.json');

(async () => {
    terminal.bgMagenta.black('Welcome to CDP CLI!\n');
    terminal('\n');
    await new TerminalApp<AppContext>().show([
        ['sdk', async () => {
            let creds: Creds;
            if (sStore.exists()) {
                const pw = await requestText(`password:`);
                if (pw == Cancel)
                    return Cancel;

                creds = sStore.get(pw);
                if (!creds) {
                    return errorAndEnd(`wrong password\n`);
                }

            } else {
                const res = await new TerminalApp<Creds>().show([
                    requestTextStep(`userKey`),
                    requestTextStep(`secret`),
                    [async context => {
                        terminal.cyan(`verifying...`);
                        const res = await new CDP({...context, forceSimple: true}).get(`workspaces`);
                        if (res.errorCode) {
                            console.log(res);
                            terminal.red(`invalid credentials.\n`)
                            return End;
                        }

                        terminal.green(`valid credentials!`);
                        terminal('\n');
                        return showYesOrNo(`remember?`, 'y', {
                            y: () => requestText(`new password:`).then(pw => sStore.set(context, pw)).then(() => Continue)
                        });
                    }]
                ]);

                if (res == Cancel)
                    return Cancel;

                creds = res;
            }

            return new CDP({...creds, forceSimple: true});
        }],
        ['ws', async context => {
            const wss = await context.sdk.get<Array<{ id: string; name: string; }>>(`workspaces`);
            if (!wss.length)
                return errorAndEnd(`no available workspaces`);

            return showMenu(`select workspace:`, wss, ws => ws.name);
        }],
        ['bu', async (context) => {
            const bUnits = await context.sdk.get<Array<{ id: string; name: string; }>>(`workspaces/${context.ws.id}/businessunits`);
            return showMenu(`select business unit:`, bUnits, bu => bu.name);
        }],
        ['app', async context => {
            const apps = await context.sdk.get<Application[]>(`workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications`);
            return showMenu(`select application:`, apps, app => app.name);
        }],
        ['event', async context => {
            const events = await context.sdk.get<Event[]>(`workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications/${context.app.id}/dataevents`);
            return showMenu(`select event:`, events, event => event.name);
        }],
        ['fakifiedEventSchema', async context => {
            if (!context.event.schema) {
                console.log(context.event);
                return errorAndEnd(`corrupted event with no schema\n`);
            }

            const fakified = fakify(context.event.schema);
            const fields = getFields(fakified);

            let shouldEditSchema = true;
            while (shouldEditSchema) {
                fields.forEach(f => {
                    terminal.white(f);
                    terminal('\n');
                });

                await showYesOrNo(`would you like to change fakers for schema fields?`, 'n', {
                    n: async () => shouldEditSchema = false,
                    y: async () => new TerminalApp<{ field: JSONSchemaFieldFaker; faker: string; }>().show([
                        ['field', ctx => showMenu(`select a field:`, fields)],
                        ['faker', ctx => showMenu(`select a faker:`, getFakers())],
                        [async ctx => {
                            ctx.field.schema.faker = ctx.faker;
                            terminal.green(`done: ${ctx.field.toString()}`)
                        }]
                    ])
                });
            }

            return fakified;
        }],
        ['eventsNum', async context => {
            return requestNumber(`number of events to send:`, 10);
        }],
        ['batchSize', async context => {
            return requestNumber(`events per batch:`, 50).then(batchSize =>
                batchSize == Cancel ? Cancel : context.eventsNum <= batchSize ? 0 : batchSize);
        }],
        ['delay', async context => {
            if (!context.batchSize)
                return 0;
            else
                return requestNumber('delay between batches in ms:', 1000)
        }],
        [async context => {
            const fakeEvents = createArray(context.eventsNum, () => jsf.generate(context.fakifiedEventSchema));

            function ingest(event: object) {
                return context.sdk.post(
                    `workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications/${context.app.id}/dataevents/${context.event.id}`,
                    event).catch();
            }

            let ingestResponses: Array<{ errorCode?: number }>;
            if (!context.batchSize) {
                terminal.cyan(`Ingesting ${context.eventsNum} fake events`);
                ingestResponses = await Promise.all(fakeEvents.map(ingest));
            } else {
                const progressBar = terminal.progressBar({
                    width: 80,
                    title: `Ingesting ${context.eventsNum} fake events (${context.batchSize} batches):`,
                    eta: true,
                    percent: true,
                    items: context.batchSize
                });

                let i = 1;
                ingestResponses = await asyncBulkMap(fakeEvents, context.batchSize, {
                    beforeBulk: (bulk, bulkIndex) => {
                        progressBar.startItem(`batch #${i}`);
                    },
                    map: ingest,
                    afterBulk: bulkRes => {
                        progressBar.itemDone(`batch #${i++}`);
                        return createDelay(context.delay)();
                    }
                });
            }

            const failed = ingestResponses.filter(r => r.errorCode);

            if (!failed.length) {
                terminal.green(`all ingest requests passed successfully!\n`);
            } else {
                terminal.yellow(`${failed.length} failed out of ${ingestResponses.length} requests (${failed.length / ingestResponses.length * 100})\n`);
                await showYesOrNo('log failed?', 'y', {
                    n: async () => {
                    },
                    y: async () => {
                        terminal.white(failed);
                    }
                })
            }
        }]
    ])
        .then(() => terminal.bgMagenta.black('Thanks for using CDP CLI!\n'));
})();

