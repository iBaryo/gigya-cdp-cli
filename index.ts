import {terminal} from "terminal-kit";
import {CDP, DataCenter} from "./SDK";
import {Application, Event} from "./SDK/interfaces";
import {
    Cancel,
    Continue,
    End,
    Repeat,
    errorAndEnd,
    requestNumber,
    requestText,
    requestTextStep,
    showMenu,
    showYesOrNo,
    TerminalApp
} from "./terminal/TerminalApp";
import {JSONSchema7} from "json-schema";
import {defaultSchemaPropFakers, fakify} from "json-schema-fakify";
import {
    createArray,
    getFakedEvents,
    getFakerCategories,
    getFakers,
    getFields,
    getIdentifierFields,
    JSONSchemaFieldFaker
} from "./utils/schema";
import {asyncBulkMap, createDelay} from "async-bulk-map";
import {initStore} from "./secure-store";
import FakerStatic = Faker.FakerStatic;

interface AppContext {
    dataCenter: DataCenter;
    login: { retries: number };
    sdk: CDP;
    ws: { id: string; name: string; };
    bu: { id: string; name: string; };
    app: { id: string; name: string; };
    event: { id: string; name: string; schema: JSONSchema7; },
    shouldEditSchema: boolean;
    fakifiedEventSchema: JSONSchema7;
    customersNum: number;
    eventsNum: number;
    batchSize: number;
    delay: number;
    sentEvents: any[];
}

type Creds = { userKey: string; secret: string; };
const sdkOptions: Partial<typeof CDP.DefaultOptions> = {
    dataCenter: 'il1-cdp-st4',
    ignoreCertError: true,
    // verboseLog: true,
    proxy: 'http://127.0.0.1:8888'
};


const fieldFakersStore = initStore<typeof defaultSchemaPropFakers>('./defaultSchemaFakers.json');

(async () => {
    terminal.bgMagenta.black('Welcome to CDP CLI!\n');
    terminal('\n');
    await new TerminalApp<AppContext>({login: {retries: 3}}).show([
        ['dataCenter', async context => {
            return showMenu(`pick a datacenter:`, ['eu5', 'il1']).then(async dc => {
                if (dc == 'il1')
                    return await showMenu(`pick env:`, [
                        'prod',
                        ...createArray(8, n => `st${n + 1}`)
                    ] as DataCenter[]).then(env => typeof env == 'symbol' ? env : `il1-cdp-${env}` as DataCenter);
                else
                    return dc as Symbol | DataCenter;
            });
        }],
        ['sdk', async context => {
            const sStore = initStore<Creds>(`./${context.dataCenter.split('-')[0]}.creds.json`);

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
                    [async credentialsContext => {
                        terminal.cyan(`authenticating...`);
                        const sdk = new CDP({...credentialsContext, forceSimple: true}, {...sdkOptions, dataCenter: context.dataCenter});
                        const res = await sdk.get(`workspaces`);
                        if (res.errorCode) {
                            console.log(res);
                            terminal.red(`invalid credentials.\n`)
                            return End;
                        }

                        terminal.green(`valid credentials!`);
                        terminal('\n');

                        return showYesOrNo(`remember?`, 'y', {
                            y: () => requestText(`new password:`).then(pw => typeof pw != 'symbol' ? sStore.set(credentialsContext, pw) : null).then(() => Continue)
                        });
                    }]
                ]);

                if (res == Cancel)
                    return Cancel;

                creds = res;
            }

            // TODO: remove forceSimple
            // TODO: replace in typed ts-rest-client
            return new CDP({...creds, forceSimple: true}, {...sdkOptions, dataCenter: context.dataCenter});
        }],
        ['ws', async context => {
            const wss = await context.sdk.get<Array<{ id: string; name: string; }>>(`workspaces`);
            if (!wss.length)

                return errorAndEnd(`no available workspaces`);

            return showMenu(`select workspace:`, wss.filter(ws => ws.name.toLowerCase().includes('eliav')), ws => ws.name)
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
        ['bu', async context => {
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

                type FieldEditContext = { field: JSONSchemaFieldFaker; isIdentifer: boolean; fakerCategory: keyof FakerStatic; faker: string; };

                await showYesOrNo(`would you like to augment schema fields?`, 'n', {
                    n: async () => shouldEditSchema = false,
                    y: async () => new TerminalApp<FieldEditContext>().show([
                        ['field', ctx => showMenu(`select a field:`, fields)],
                        ['isIdentifer', ctx => showYesOrNo(`is it an identifier?`, 'n', async res => res)],
                        ['fakerCategory', ctx => showMenu(`select a faker category:`, getFakerCategories())],
                        ['faker', ctx => showMenu(`select a faker:`, getFakers(ctx.fakerCategory))],
                        [async ctx => {
                            ctx.field.schema.faker = `${ctx.fakerCategory}.${ctx.faker}`;
                            ctx.field.schema.isIdentifier = ctx.isIdentifer;
                            terminal.green(`~~ faked field: ${ctx.field.toString()}, identifier: ${ctx.field.isIdentifier}\n\n`);
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
        ['customersNum', async context => {
            if (getIdentifierFields(context.fakifiedEventSchema).length) {
                return requestNumber(`number of different customers:`, 1);
            } else {
                return 0;
            }
        }],
        ['eventsNum', async context => {
            if (context.customersNum) {
                return requestNumber(`number of events to send (per customer):`, 3);
            } else {
                return requestNumber(`number of events to send:`, 10);
            }
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

            const fakeEvents = await getFakedEvents(context.fakifiedEventSchema, context.eventsNum, context.customersNum);

            function ingest(event: object) {
                console.log(event);
                return context.sdk.post(
                    `workspaces/${context.ws.id}/businessunits/${context.bu.id}/applications/${context.app.id}/dataevents/${context.event.id}/event`, event).catch();
            }

            let ingestResponses: Array<{ errorCode?: number }>;
            if (!context.delay) {
                terminal.cyan(`Ingesting ${context.eventsNum * (Math.max(1, context.customersNum))} fake events\n`);
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