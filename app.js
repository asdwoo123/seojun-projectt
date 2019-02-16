const opcua = require('node-opcua');
const async = require('async');
const SocketIO = require('socket.io');
const express = require('express');

const client = new opcua.OPCUAClient();
const endpointUrl = `opc.tcp://192.168.0.134:4840`;
const app = express();

let the_subscription, the_session, io;

async.series([
    // 서버와 연결
    function(callback) {
        client.connect(endpointUrl, (err) => {
            if (err) {
                console.log('cannot connect to endpoint:', endpointUrl);
            } else {
                console.log('connected !');
            }
            callback(err);
        });
    },
    // 세션 생성
    function(callback) {
        client.createSession(null, (err, session) => {
            if (!err) {
                the_session = session;
            }
            callback(err);
        });
    },
    function(callback) {
        the_subscription = new opcua.ClientSubscription(the_session, {
            requestedPublishingInterval: 500,
            requestedMaxKeepAliveCount: 2000,
            requestedLifetimeCount: 6000,
            maxNotificationsPerPublish: 1000,
            publishingEnabled: true,
            priority: 10
        });
        the_subscription.on('started', () => {
            console.log('subscription started');
        });

        const server = app.listen('3000', () => {
            console.log('웹 서버가 시작되었습니다.');
        });

        io = SocketIO(server, { path: '/socket.io' });
        io.on('connection', (socket) => {

        });

        monitorWork('ns=3;s="ocyl_1_HP"', 'ocyl_1_HP');
        monitorWork('ns=3;s="ocyl_1_WP"', 'ocyl_1_WP');
        monitorWork('ns=3;s="ocyl_2_HP"', 'ocyl_2_HP');
        monitorWork('ns=3;s="ocyl_2_WP"', 'ocyl_2_WP');
        monitorWork('ns=3;s="ocyl_3_HP"', 'ocyl_3_HP');
        monitorWork('ns=3;s="ocyl_3_WP"', 'ocyl_3_WP');
        monitorWork('ns=3;s="ocyl_4_WP"', 'ocyl_4_WP');
        monitorWork('ns=3;s="ocyl_4_WP"', 'ocyl_4_WP');
        monitorWork('ns=3;s="C_Total"', 'C_Total');
        monitorWork('ns=3;s="C_OK"', 'C_OK');
        monitorWork('ns=3;s="C_NOK"', 'C_NOK');

    },

    function(callback) {
        the_session.close((err) => {
            if (err) {
                console.log('session closed error');
            }
            callback();
        });
    }
], (err) => {
    if (err) {
        console.log('failure', err);
    } else {
        console.log('done!');
    }
    client.disconnect(() => {});
}
);


function monitorWork(nodeId, browseName) {
    const monitoredItem = the_subscription.monitor({
        nodeId: `${nodeId}`,
        attributeId: 13
    }, {
        samplingInterval: 100,
        discardOldest: true,
        queueSize: 100
    });
    monitoredItem.on('changed', (dataValue) => {
        let dataV = dataValue.value.value;
        if (`${browseName}` === 'BalluffSignalLightB7') dataV = dataValue.value.value.toString(16);
        console.log(dataV);
        io.sockets.emit(`${browseName}`, {
            value: dataV,
            timestamp: dataValue.serverTimestamp,
            nodeId: `${nodeId}`
        });
    });
}
