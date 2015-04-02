/*
The MIT License (MIT)

Copyright (c) 2015 Geoffrey Arnold

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

module.exports = function(RED) {
    'use strict';
    var net = require('net');
    var os = require('os');

    function CollectdNode(n) {
        RED.nodes.createNode(this, n);
        this.metricName = n.metricName;
        this.metricHost = n.metricHost || os.hostname();
        this.metricType = n.metricType || 'gauge';
        this.socketFile = n.socketFile || '/var/run/collectd-unixsock';
        this.consoleLog = n.consoleLog || false;

        var node = this;
        var collectd = net.createConnection(this.socketFile);

        collectd.on('connect', function() {
            node.log('Connected to socket file [' + node.socketFile + ']');
        });

        collectd.on('data', function(buffer) {
            if (node.consoleLog) {
                node.log(buffer.toString('utf8'));
            }
        });

        this.on('input', function(msg) {
            var timestamp = msg.timestamp || 'N';
            var value = Number(msg.payload);

            if (isNaN(value)) {
                node.warn('Payload is NaN [' + msg.payload + ']');
            } else {
                var putval = 'PUTVAL "' + node.metricHost + '/node_red/' + node.metricType + '-' + node.metricName + '" ' + timestamp + ':' + value;
                if (node.consoleLog) {
                    node.log(putval);
                }

                collectd.write(putval + '\n', 'utf8');
            }
        });

        this.on('close', function() {
            node.log('Disconnecting from socket file');
            collectd.end();
        });
    }
    RED.nodes.registerType('collectd', CollectdNode);

    RED.httpAdmin.post('/collectd/:id/consoleLog', RED.auth.needsPermission('collectd.consoleLog'), function(req, res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node !== null && typeof node !== 'undefined') {
            node.consoleLog = !node.consoleLog;
            res.send(200);
        } else {
            res.send(404);
        }
    });
}
