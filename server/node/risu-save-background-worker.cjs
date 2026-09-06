'use strict';

const { parentPort } = require('worker_threads');
const { encodeRisuSaveLegacy } = require('./utils.cjs');

parentPort.once('message', (value) => {
    try {
        const encoded = encodeRisuSaveLegacy(value);

        parentPort.postMessage({
            ok: true,
            encoded,
        }, [encoded.buffer]);
    } catch (error) {
        parentPort.postMessage({
            ok: false,
            error: error?.stack || String(error),
        });
    }
});
