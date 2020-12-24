import {CDP} from "./gigya-cdp-sdk";
import {createBoilerplate} from "./boilerplate";
import {config} from "./boilerplate/BoilerplateConfig";

const sdk = new CDP({
    userKey: 'AESG3I4qtOir',
    secret: 'Ab5l98IIshk1Hc+YZMf4SxaJr9E3Jgm2',
    forceSimple: true,
}, {
    dataCenter: 'eu5',
    env: 'st1',
    // ignoreCertError: true,
    // proxy: 'http://127.0.0.1:8888'
});

const buID = '4_AyqTulmBo4at16AYvwr7wQ'; // production for demo

(async () => {
    // const bOps = sdk.api.businessunits.for(buID);
    // const bu = await bOps.get().then(x => x)
    // const view = await bOps.views.getAll().then(views => views.find(v => v.type == "Marketing"));
    // const vOps = bOps.views.for(view.id);

    const boilerplate = createBoilerplate(sdk).for(buID);
    await boilerplate.alignAll();
    await boilerplate.ingestFakeEvents(3, config.directEventNames);

})().then(console.log);
