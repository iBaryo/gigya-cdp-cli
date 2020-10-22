import {terminal} from "terminal-kit";
import {CDP} from "./SDK";
import {Application, Event} from "./SDK/interfaces";
import {
    Cancel, Continue, End,
    errorAndEnd, Repeat,
    requestNumber,
    requestText,
    requestTextStep, Restart,
    showMenu,
    showYesOrNo,
    TerminalApp
} from "./terminal/TerminalApp";
import {JSONSchema7} from "json-schema";
import {defaultSchemaPropFakers, fakify} from "json-schema-fakify";
import {createArray, getFakerCategories, getFakers, getFields, JSONSchemaFieldFaker, resolveFake} from "./utils/schema";
import {asyncBulkMap, createDelay} from "async-bulk-map";
import {initStore} from "./secure-store";
import {CredentialsType} from "./SDK/Signers";
import FakerStatic = Faker.FakerStatic;

interface AppContext {
    login: { retries: number };
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
const sdkOptions: Partial<typeof CDP.DefaultOptions> = {
    dataCenter: 'il1-cdp-prod',
    ignoreCertError: true,
    // verboseLog: true,
    proxy: 'http://127.0.0.1:8888'
};


const sStore = initStore<Creds>('./creds.json');
const fieldFakersStore = initStore<typeof defaultSchemaPropFakers>('./defaultSchemaFakers.json');

(async () => {
    terminal.bgMagenta.black('Welcome to CDP CLI!\n');
    terminal('\n');
    await new TerminalApp<AppContext>({login: {retries: 3}}).show([
        ['sdk', async context => {
            let creds: Creds;
            if (sStore.exists()) {
                const pw = await requestText(`password:`);
                if (pw == Cancel)
                    return Cancel;

                creds = sStore.get(pw);
                if (!creds) {
                    terminal.red(`wrong password. ${--context.login.retries} retries left.\n`)
                    if (context.login.retries > 0) {
                        return Repeat;
                    } else {
                        sStore.clear();
                        return End;
                    }
                }
            } else {
                const res = await new TerminalApp<Creds>().show([
                    requestTextStep(`userKey`),
                    requestTextStep(`secret`),
                    [async context => {
                        terminal.cyan(`authenticating...`);
                        const sdk = new CDP({...context, forceSimple: true}, sdkOptions);
                        const res = await sdk.get(`workspaces`);
                        if (res.errorCode) {
                            console.log(res);
                            terminal.red(`invalid credentials.\n`)
                            return End;
                        }

                        terminal.green(`valid credentials!`);
                        terminal('\n');

                        return showYesOrNo(`remember?`, 'y', {
                            y: () => requestText(`new password:`).then(pw => typeof pw != 'symbol' ? sStore.set(context, pw) : null).then(() => Continue)
                        });
                    }]
                ]);

                if (res == Cancel)
                    return Cancel;

                creds = res;
            }

            // TODO: remove forceSimple
            // TODO: replace in typed ts-rest-client
            return new CDP({...creds, forceSimple: true}, sdkOptions);
        }],
        ['ws', async context => {
            const wss = await context.sdk.get<Array<{ id: string; name: string; }>>(`workspaces`);
            if (!wss.length)

                return errorAndEnd(`no available workspaces`);

            return showMenu(`select workspace:`, wss, ws => ws.name)
                .then(async r => {
                    if (typeof r == 'object') {
                        terminal.cyan(`fetching permissions...\n`);
                        const acl = await context.sdk.getACL(r['partnerId'] || r.id)
                            .then((r: any) => r.eACL?.['_api'] ?? {});

                        if (!acl['/api/workspaces/{workspaceId}/ingests']) { // TODO: set of all required permissions
                            terminal.yellow('missing permissions for ingest.\n')
                        }

                        terminal('\n');
                    }

                    return r;
                });
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
            let {schema} = await context.sdk.get<{ schema: string | JSONSchema7 }>(`workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications/${context.app.id}/dataevents/${context.event.id}`);
            if (!schema) {
                console.log(context.event);
                return errorAndEnd(`corrupted event with no schema\n`);
            }

            if (typeof schema == 'string') {
                schema = JSON.parse(schema) as JSONSchema7;
            }

            const fieldFakers = fieldFakersStore.exists() ? fieldFakersStore.get() : {};
            Object.assign(defaultSchemaPropFakers, fieldFakers);
            const fakified = fakify(schema); // TODO: fakify to support full faker name (with category)

            const fields = getFields(fakified);
            let shouldEditSchema = true;
            while (shouldEditSchema) {
                terminal.cyan(`event schema:\n`); // TODO: change to terminal's table
                fields.forEach(f => {
                    terminal.white(f);
                    terminal('\n');
                });

                await showYesOrNo(`would you like to change fakers for schema fields?`, 'n', {
                    n: async () => shouldEditSchema = false,
                    y: async () => new TerminalApp<{ field: JSONSchemaFieldFaker; fakerCategory: keyof FakerStatic; faker: string; }>().show([
                        ['field', ctx => showMenu(`select a field:`, fields)],
                        ['fakerCategory', ctx => showMenu(`select a faker category:`, getFakerCategories())],
                        ['faker', ctx => showMenu(`select a faker:`, getFakers(ctx.fakerCategory))],
                        [async ctx => {
                            ctx.field.schema.faker = `${ctx.fakerCategory}.${ctx.faker}`;
                            terminal.green(`~~ faked field: ${ctx.field.toString()}\n\n`);
                            fieldFakers[ctx.field.fieldName] = ctx.faker as any;
                        }]
                    ])
                });
            }

            if (Object.entries(fieldFakers).length) {
                fieldFakersStore.set(fieldFakers)
            }

            return fakified;
        }],
        ['eventsNum', async context => {
            return requestNumber(`number of events to send:`, 10);
        }],
        ['batchSize', async context => {
            return requestNumber(`events per batch:`, Math.min(50, context.eventsNum));
        }],
        ['delay', async context => {
            if (context.eventsNum <= context.batchSize)
                return 0;
            else
                return requestNumber('delay between batches in ms:', 1000)
        }],
        [async context => {
            console.log('faked schema:', context.fakifiedEventSchema);
            const fakeEvents = await Promise.all(createArray(context.eventsNum, () => resolveFake(context.fakifiedEventSchema)));

            function ingest(event: object) {
                console.log(event);
                return context.sdk.post(
                    `workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications/${context.app.id}/dataevents/${context.event.id}/event`, event).catch();
            }

            let ingestResponses: Array<{ errorCode?: number }>;
            if (!context.delay) {
                terminal.cyan(`Ingesting ${context.eventsNum} fake events\n`);
                ingestResponses = await Promise.all(fakeEvents.map(ingest));
            } else {
                const progressBar = terminal.progressBar({
                    width: 80,
                    title: `Ingesting ${context.eventsNum} fake events (${context.batchSize} batches):`,
                    eta: true,
                    percent: true,
                    items: fakeEvents.length / context.batchSize
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
                    },
                    afterAll: res => {
                        progressBar.stop();
                    }
                });
            }

            const failed = ingestResponses.filter(r => r.errorCode);

            if (!failed.length) {
                terminal.green(`all ingest requests passed successfully!\n`);
            } else {
                terminal.yellow(`${failed.length} failed out of ${ingestResponses.length} requests (${failed.length / ingestResponses.length * 100}%)\n`);
                await showYesOrNo('log failed?', 'y', {
                    y: async () => {
                        console.log(failed);
                    }
                })
            }
        }]
    ])
        .then(() => terminal.bgMagenta.black('Thanks for using CDP CLI!').noFormat('\n'));
})();
