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

    function LocalCollectdClient(node) {
        var socket = net.createConnection(node.socketFile);

        socket.on('connect', function() {
            node.log('Connected to socket file [' + node.socketFile + ']');
        });

        socket.on('data', function(buffer) {
            if (node.consoleLog) {
                node.log(buffer.toString('utf8'));
            }
        });

        this.close = function() {
            node.log('Disconnecting from socket file');
            socket.end();
        };

        this.putval = function(metricType, metricName, timestamp, value) {
            var putval = 'PUTVAL "' + node.metricHost + '/node_red/' + metricType + '-' + metricName + '" ' + timestamp + ':' + value;
            if (node.consoleLog) {
                node.log(putval);
            }

            socket.write(putval + '\n', 'utf8');
        };
    }

    function RemoteCollectdClient(node) {
        var socket = require('dgram').createSocket('udp4');

        var collectjs = require('collectjs');
        var bridge = collectjs.create({
            host: node.metricHost
        });

        this.close = function() {
            socket.close();
        };

        this.putval = function(metricType, metricName, timestamp, value) {
            var packet = bridge.packet({
                plugin: 'node_red',
                type: metricType,
                values: [{
                    type: metricName, // TODO ???
                    value: value
                }]
            });

            client.send(packet, 0, packet.length, node.collectdPort, node.collectdHost, function() {});
        };
    }

    function CollectdConfigNode(config) {
        RED.nodes.createNode(this, config);
        this.metricHost = config.metricHost || os.hostname(); // TODO rename to `source`?
        this.socketFile = config.socketFile || '/var/run/collectd-unixsock';
        this.consoleLog = config.consoleLog || true; // TODO make configurable
        this.collectdHost = config.collectdHost || 'localhost';
        this.collectdPort = config.collectdPort || 25826;

        this.client = new LocalCollectdClient(this);

        var node = this;

        this.on('close', function() {
            node.client.close();
        });
    }
    RED.nodes.registerType('collectd-config', CollectdConfigNode);

    function CollectdNode(config) {
        RED.nodes.createNode(this, config);
        this.collectd = RED.nodes.getNode(config.collectd);
        this.metricName = config.metricName;
        this.metricType = config.metricType || 'gauge';

        var node = this;

        this.on('input', function(msg) {
            var timestamp = msg.timestamp || 'N';
            var value = Number(msg.payload || 0);

            if (isNaN(value)) {
                node.warn('Payload is NaN [' + msg.payload + ']');
            } else if (node.collectd) {
                node.collectd.client.putval(node.metricType, node.metricName, timestamp, value);
            } else {
                node.error('Collectd node is not configured');
            }
        });
    }
    RED.nodes.registerType('collectd', CollectdNode);
}
