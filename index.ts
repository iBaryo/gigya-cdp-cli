#!/usr/bin/env node

import {JSONSchema7} from "json-schema";
import {terminal} from "terminal-kit";
import {
    Cancel,
    Continue,
    End,
    errorAnd,
    isFlowSymbol,
    Repeat,
    requestNumber,
    requestText,
    requestTextStep,
    Restart,
    showMenu,
    showYesOrNo,
    TerminalApp
} from "./terminal";
import {defaultSchemaPropFakers, fakify} from "json-schema-fakify";
import {getFakedEvents, getFakerCategories, getFakers, getFields, JSONSchemaFieldFaker} from "./utils/schema";
import {asyncBulkMap, createDelay} from "async-bulk-map";
import {initStore} from "./secure-store";
import {
    Application,
    asCDPError,
    availableEnvs,
    BusinessUnit,
    CDP,
    CDPErrorResponse,
    DataCenter,
    Env,
    Event,
    isCDPError,
    ProfileFieldName,
    SchemaType,
    View,
    Workspace
} from "./gigya-cdp-sdk";
import FakerStatic = Faker.FakerStatic;
import {detectProxy} from "./utils/proxy";
import {EventMapping} from "./gigya-cdp-sdk/entities/Event/EventMapping";
import {EventMappingsResponse} from "./gigya-cdp-sdk/CDPEntitiesApi";

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
    view: View,
    identifier: ProfileFieldName;
    shouldEditSchema: boolean;
    fakifiedEventSchema: JSONSchema7;
    customersNum: number;
    eventsNum: number;
    batchSize: number;
    delay: number;
}

const sdkOptions: Partial<typeof CDP.DefaultOptions> = {
    // ignoreCertError: true,
    // verboseLog: true,
};

(async () => {
    terminal.bgMagenta.black('Welcome to CDP CLI!\n');
    terminal('\n');

    sdkOptions.proxy = await detectProxy({hostname: '127.0.0.1', port: 8888}).then(proxy => {
        if (proxy)
            terminal.yellow(`proxy detected at: ${proxy}\n`);
        return proxy;
    });

    await new TerminalApp<AppContext>({login: {retries: 3}}).show([
        ['dataCenter', async context => showMenu(`pick a datacenter:`, Object.keys(availableEnvs) as DataCenter[])],
        ['env', async context => showMenu(`pick env:`, availableEnvs[context.dataCenter])],
        ['sdk', async context => {
            type Creds = { userKey: string; secret: string; };
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

            const sdk = new CDP(creds, {
                ...sdkOptions,
                dataCenter: context.dataCenter,
                env: context.env
            });

            const res = await sdk.api.businessunits.getAll().catch(asCDPError);
            if (isCDPError(res)) {
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
        ['ws', async (context): Promise<Symbol | Workspace> => {
            terminal.cyan(`loading...\n`);
            const wsIds = Array.from(new Set(context.BUs.map(bUnit => bUnit.workspaceId)));
            const wss = await Promise.all(wsIds.map(wsId => context.sdk.api.workspaces.for(wsId).get())).then(res =>
                !context.wsFilter ?
                    res
                    : res.filter(ws => ws.name.toLowerCase().includes(context.wsFilter.toLowerCase())));

            if (!wss.length)
                return errorAnd(Cancel, `no available workspaces\n`);

            return showMenu(`select workspace:`, wss, ws => ws.name).then(async ws => {
                if (isFlowSymbol(ws)) {
                    return ws;
                } else {
                    terminal.cyan(`fetching permissions...\n`);

                    // TODO: set of all required permissions
                    if (await context.sdk.hasPermissions(ws.id, 'businessunits/{businessUnitId}/applications/{applicationId}/dataevents/{dataEventId}/event')) {
                        terminal.yellow('missing permissions for ingest.\n')
                    }

                    terminal('\n');

                    return ws;
                }
            });
        }],
        ['bu', async context => {
            return showMenu(`select business unit:`, context.BUs.filter(bu => bu.workspaceId == context.ws.id), bu => bu.name);
        }],
        ['app', async context => {
            const apps = await context.sdk.api.businessunits.for(context.bu.id).applications.getAll();
            return showMenu(`select application:`, apps, app => app.name);
        }],
        ['event', async context => {
            const events = await context.sdk.api.businessunits.for(context.bu.id).applications.for(context.app.id).dataevents.getAll();
            return showMenu(`select event:`, events, event => event.name);
        }],
        ['fakifiedEventSchema', async context => {
            let {schema} =
                await context.sdk.api.businessunits.for(context.bu.id).applications.for(context.app.id).dataevents.for(context.event.id).get();

            if (!schema) {
                console.log(context.event);
                return errorAnd(Cancel, `corrupted event with no schema\n`);
            } else if (typeof schema == 'string') {
                schema = JSON.parse(schema) as JSONSchema7;
            }

            const fieldFakersStore = initStore<typeof defaultSchemaPropFakers>('./defaultSchemaFakers.json');
            const fieldFakers = fieldFakersStore.exists() ? fieldFakersStore.get() : {};
            Object.assign(defaultSchemaPropFakers, fieldFakers);

            const fakified = fakify(schema); // TODO: fakify to support full faker name (with category)

            const fields = getFields(fakified);
            // fields.

            let shouldEditSchema = true;
            while (shouldEditSchema) {
                terminal.cyan(`event schema:\n`);
                terminal['table']([
                    [
                        'Field',
                        'Faker',
                        'Pattern'
                    ],
                    ...fields.map(f => [
                        f.fieldPath,
                        f.faker || '(None)',
                        f.schema.type == 'string' && f.schema.pattern ? f.schema.pattern : ''
                    ])
                ], {
                    hasBorder: true,
                    // contentHasMarkup: true ,
                    borderChars: 'lightRounded',
                    borderAttr: {color: 'blue'},
                    textAttr: {bgColor: 'default'},
                    // firstCellTextAttr: { bgColor: 'blue' } ,
                    firstRowTextAttr: {bgColor: 'blue', color: 'black'},
                    // firstColumnTextAttr: { bgColor: 'red' } ,
                    width: 60,
                    fit: true   // Activate all expand/shrink + wordWrap
                });

                const categories: Array<'pattern' | keyof FakerStatic> = ['pattern', ...getFakerCategories()];

                type FieldEditContext = {
                    field: JSONSchemaFieldFaker;
                    category: (typeof categories)[0];
                    augment: string | undefined;
                };

                await showYesOrNo(`would you like to augment schema fields?`, 'n', {
                    n: async () => shouldEditSchema = false,
                    y: async () => new TerminalApp<FieldEditContext>().show([
                        ['field', ctx => showMenu(`select a field:`, fields, f => f.fieldPath)],
                        ['category', ctx => showMenu(`select a faker category:`, categories)],
                        ['augment', (ctx): Promise<Symbol | string | undefined> => {
                            if (ctx.category == 'pattern')
                                return requestText('pattern (regex):', false).then(format => !format ? undefined : format);
                            else
                                return showMenu(`select a faker:`, getFakers(ctx.category));
                        }],
                        [async ctx => {
                            if (ctx.category == 'pattern')
                                ctx.field.schema.pattern = ctx.augment;
                            else
                                ctx.field.faker = `${ctx.category}.${ctx.augment}`;

                            terminal.green(`~~ field: ${ctx.field.fieldPath}:\n`, JSON.stringify(ctx.field.schema, undefined, 4), '\n');
                            fieldFakers[ctx.field.fieldName] = ctx.augment as any;
                        }]
                    ])
                });
            }

            if (Object.entries(fieldFakers).length) {
                fieldFakersStore.set(fieldFakers)
            }

            return fakified;
        }],
        ['view', async context => {
            const views =
                await context.sdk.api.businessunits.for(context.bu.id).views.getAll();

            return showMenu(`pick a view:`, views, v => v.name);
        }],
        ['identifier', async (context): Promise<ProfileFieldName | Symbol> => {
            const buOps = context.sdk.api.businessunits.for(context.bu.id);
            const viewOps = buOps.views.for(context.view.id);
            const [priorities, mRules] = await Promise.all([viewOps.matchRulesPriority.get(), viewOps.matchRules.getAll()]);
            const identifiers = priorities.rules.map(mRuleId => mRules.find(mRule => mRule.id == mRuleId)?.attributeName).filter(Boolean);

            // match all matching rules to their field (fields have different matching rules)
            const profileSchema = await buOps.ucpschemas.getAll().then(
                schemas => schemas.find(s => s.schemaType == SchemaType.Profile));


            //TODO: fix this according to new mappings in sdk
            const profileMappings = await context.sdk.api.businessunits.for(context.bu.id).applications.for(context.app.id).dataevents.for(context.event.id).mappings.get({
                sourceId: context.event.id,
                targetId: profileSchema.id
            }).then((m: EventMappingsResponse ) => m.mappings  || []); //TODO: this is a little hack for now because of inconsistency with the back



            // filter only the mappings to the profile schema && to a targetField that is an identifier and take the source field //TODO: UPDATE THIS --- (PUT IT BACK WITH UPDATED MAPPINGS)
            const eventIdentifierFields = profileMappings.map(m => {
                const identifierIndex = identifiers.indexOf(m.targetField);
                return {
                    eventFieldPath: m.sourceField as ProfileFieldName,
                    identifier: identifiers[identifierIndex],
                    priority: identifierIndex + 1
                };
            }).filter(i => !!i.identifier);

            eventIdentifierFields.sort((a, b) => a.priority - b.priority)

            terminal['table']([ //TODO: UPDATE THIS (PUT IT BACK WITH UPDATED MAPPINGS)
                ['Event Field', 'To Identifier'],
                ...eventIdentifierFields.map(f => [f.eventFieldPath, `${f.identifier} (priority: ${f.priority})` || '(None)'])
            ], {
                hasBorder: true,
                // contentHasMarkup: true ,
                borderChars: 'lightRounded',
                borderAttr: {color: 'blue'},
                textAttr: {bgColor: 'default'},
                // firstCellTextAttr: { bgColor: 'blue' } ,
                firstRowTextAttr: {bgColor: 'blue', color: 'black'},
                // firstColumnTextAttr: { bgColor: 'red' } ,
                width: 60,
                fit: true   // Activate all expand/shrink + wordWrap
            });

            return showMenu(`pick an identifier:`, eventIdentifierFields, f => `${f.eventFieldPath} (-> ${f.identifier})`).then(selected => {
                if (isFlowSymbol(selected))
                    return selected;

                // const unselected = eventIdentifierFields.filter(field => selected != field).map(f => f.eventFieldPath); --- was already commented

                return selected.eventFieldPath;
            });
        }],
        ['customersNum', async context => {
            return requestNumber(`number of different customers:`, 1);
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

            const fakeEvents = await getFakedEvents(context.identifier, context.fakifiedEventSchema, context.eventsNum, context.customersNum);
            const eventApi = context.sdk.api
                .businessunits.for(context.bu.id)
                .applications.for(context.app.id)
                .dataevents.for(context.event.id).event;

            function ingest(event: object) {
                console.log(event);
                return eventApi.create(event).catch(asCDPError);
            }

            let ingestResponses: Array<Partial<CDPErrorResponse>>;
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
})
();
