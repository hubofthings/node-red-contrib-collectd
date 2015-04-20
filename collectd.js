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

    function CollectdConfigNode(n) {
        RED.nodes.createNode(this, n);
        this.metricHost = n.metricHost || os.hostname();
        this.socketFile = n.socketFile || '/var/run/collectd-unixsock';
        this.consoleLog = n.consoleLog || false; // TODO make configurable

        this.socket = net.createConnection(this.socketFile);

        var node = this;

        this.socket.on('connect', function() {
            node.log('Connected to socket file [' + node.socketFile + ']');
        });

        this.socket.on('data', function(buffer) {
            if (node.consoleLog) {
                node.log(buffer.toString('utf8'));
            }
        });

        this.on('close', function() {
            node.log('Disconnecting from socket file');
            node.socket.end();
        });

        this.putval = function(metricType, metricName, timestamp, value) {
            var putval = 'PUTVAL "' + node.metricHost + '/node_red/' + metricType + '-' + metricName + '" ' + timestamp + ':' + value;
            if (node.consoleLog) {
                node.log(putval);
            }

            node.socket.write(putval + '\n', 'utf8');
        };
    }
    RED.nodes.registerType('collectd-config', CollectdConfigNode);

    function CollectdNode(n) {
        RED.nodes.createNode(this, n);
        this.collectd = RED.nodes.getNode(n.collectd);
        this.metricName = n.metricName;
        this.metricType = n.metricType || 'gauge';

        var node = this;

        this.on('input', function(msg) {
            var timestamp = msg.timestamp || 'N';
            var value = Number(msg.payload || 0);

            if (isNaN(value)) {
                node.warn('Payload is NaN [' + msg.payload + ']');
            } else if (node.collectd) {
                node.collectd.putval(node.metricType, node.metricName, timestamp, value);
            } else {
                node.error('Collectd node is not configured');
            }
        });
    }
    RED.nodes.registerType('collectd', CollectdNode);
}
