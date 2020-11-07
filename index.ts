#!/usr/bin/env node

import {terminal} from "terminal-kit";
import {availableEnvs, CDP, DataCenter, Env} from "./SDK";
import {
    Cancel,
    Continue,
    End,
    errorAnd,
    Repeat,
    requestNumber,
    requestText,
    requestTextStep,
    Restart,
    showMenu,
    showYesOrNo,
    TerminalApp
} from "./terminal";
import {JSONSchema7} from "json-schema";
import {defaultSchemaPropFakers, fakify} from "json-schema-fakify";
import {
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
import {Application, BusinessUnit, Event, Workspace} from "./SDK/entities";

interface AppContext {
    dataCenter: DataCenter;
    env: Env;
    login: { retries: number };
    sdk: CDP;
    BUs: BusinessUnit[];
    ws: Workspace;
    wsFilter: string;
    bu: BusinessUnit;
    app: Application;
    event: Event,
    shouldEditSchema: boolean;
    fakifiedEventSchema: JSONSchema7;
    customersNum: number;
    eventsNum: number;
    batchSize: number;
    delay: number;
}

type Creds = { userKey: string; secret: string; };
const sdkOptions: Partial<typeof CDP.DefaultOptions> = {
    // ignoreCertError: true,
    // verboseLog: true,
    // proxy: 'http://127.0.0.1:8888'
};


const fieldFakersStore = initStore<typeof defaultSchemaPropFakers>('./defaultSchemaFakers.json');

(async () => {
    terminal.bgMagenta.black('Welcome to CDP CLI!\n');
    terminal('\n');
    await new TerminalApp<AppContext>({login: {retries: 3}}).show([
        ['dataCenter', async context => showMenu(`pick a datacenter:`, Object.keys(availableEnvs) as DataCenter[])],
        ['env', async context => showMenu(`pick env:`, availableEnvs[context.dataCenter])],
        ['sdk', async context => {
            const sStore = initStore<Creds>(`./${context.dataCenter.split('-')[0]}.creds.json`);
            const hasExistingCreds = sStore.exists();
            let creds: Creds;
            if (hasExistingCreds) {
                const pw = await requestText(`password:`);
                if (pw == Cancel)
                    return Cancel;

                creds = sStore.get(pw);
                if (creds) {
                    terminal.green('correct!\n');
                } else {
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
                    requestTextStep(`secret`)
                ]);

                if (res == Cancel)
                    return Cancel;

                creds = res;
            }

            terminal.cyan(`authenticating...`);

            // TODO: remove forceSimple
            // TODO: replace in typed ts-rest-client
            const sdk = new CDP({...creds, forceSimple: true}, {
                ...sdkOptions,
                dataCenter: context.dataCenter,
                env: context.env
            });

            const res = await sdk.get<AppContext['BUs']>(`businessunits`);
            if (res.errorCode) {
                sStore.clear();
                console.log(res);
                return errorAnd(Restart, `invalid credentials.\n`);
            }

            if (!res.length) {
                sStore.clear();
                return errorAnd(Restart, `no permissions for any business unit`);
            }

            terminal.green(`valid credentials!`);
            terminal('\n');
            context.setGlobally('BUs', res)

            if (!hasExistingCreds) {
                await showYesOrNo(`remember?`, 'y', {
                    y: () => requestText(`new password:`).then(pw => typeof pw != 'symbol' ? sStore.set(creds, pw) : null).then(() => Continue)
                });
            }

            return sdk;
        }],
        ['wsFilter', async context => requestText(`workspace filter (optional):`, false)],
        ['ws', async context => {
            terminal.cyan(`loading...\n`);
            const wss = await Promise.all(context.BUs.map(bUnit =>
                context.sdk.get<Workspace>(`workspaces/${bUnit.workspaceId}`)))
                .then(res =>
                    !context.wsFilter ?
                        res
                        : res.filter(ws => ws.name.toLowerCase().includes(context.wsFilter)));

            if (!wss.length)
                return errorAnd(Cancel, `no available workspaces\n`);

            const x = await showMenu(`select workspace:`, wss, ws => ws.name).then(async ws => {
                if (typeof ws == 'symbol')
                    return ws;

                terminal.cyan(`fetching permissions...\n`);

                // TODO: set of all required permissions
                if (await context.sdk.hasPermissions(ws.id, 'businessunits/{businessUnitId}/applications/{applicationId}/dataevents/{dataEventId}/event')) {
                    terminal.yellow('missing permissions for ingest.\n')
                }

                terminal('\n');

                return ws;
            });
        }],
        ['bu', async context => {
            return showMenu(`select business unit:`, context.BUs, bu => bu.name);
        }],
        ['app', async context => {
            const apps = await context.sdk.get<Application[]>(`businessunits/${context.bu.id}/applications`);
            return showMenu(`select application:`, apps, app => app.name);
        }],
        ['event', async context => {
            const events = await context.sdk.get<Event[]>(`businessunits/${context.bu.id}/applications/${context.app.id}/dataevents`);
            return showMenu(`select event:`, events, event => event.name);
        }],
        ['fakifiedEventSchema', async context => {
            let {schema} =
                await context.sdk.get<Event>(`businessunits/${context.bu.id}/applications/${context.app.id}/dataevents/${context.event.id}`);
            if (!schema) {
                console.log(context.event);
                return errorAnd(Cancel, `corrupted event with no schema\n`);
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
                terminal.cyan(`event schema:\n`);
                terminal['table']([
                    ['Field', 'Faker', 'Identifer'],
                    ...fields.map(f => [f.fieldPath, f.faker || '(None)', f.isIdentifier ? 'V' : ''])
                ], {
                    hasBorder: true,
                    // contentHasMarkup: true ,
                    borderChars: 'lightRounded',
                    borderAttr: {color: 'blue'},
                    textAttr: {bgColor: 'default'},
                    // firstCellTextAttr: { bgColor: 'blue' } ,
                    firstRowTextAttr: {bgColor: 'yellow'},
                    // firstColumnTextAttr: { bgColor: 'red' } ,
                    width: 60,
                    fit: true   // Activate all expand/shrink + wordWrap
                });

                type FieldEditContext = {
                    field: JSONSchemaFieldFaker;
                    isIdentifer: boolean;
                    fakerCategory: keyof FakerStatic;
                    faker: string;
                };

                await showYesOrNo(`would you like to augment schema fields?`, 'n', {
                    n: async () => shouldEditSchema = false,
                    y: async () => new TerminalApp<FieldEditContext>().show([
                        ['field', ctx => showMenu(`select a field:`, fields, f => f.fieldPath)],
                        ['isIdentifer', ctx => showYesOrNo(`is it an identifier?`, 'n', async res => res)],
                        ['fakerCategory', ctx => showMenu(`select a faker category:`, getFakerCategories())],
                        ['faker', ctx => showMenu(`select a faker:`, getFakers(ctx.fakerCategory))],
                        [async ctx => {
                            ctx.field.schema.faker = `${ctx.fakerCategory}.${ctx.faker}`;
                            ctx.field.schema.isIdentifier = ctx.isIdentifer;
                            terminal.green(`~~ field: ${ctx.field.fieldPath}, faker: ${ctx.field.faker}, identifier: ${ctx.field.isIdentifier}\n\n`);
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
                    `businessunits/${context.bu.id}/applications/${context.app.id}/dataevents/${context.event.id}/event`, event).catch();
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
        .then(() => terminal.bgMagenta.black('Thanks for using CDP CLI!').noFormat('\n'))
        .then(() => process.exit());
})();
