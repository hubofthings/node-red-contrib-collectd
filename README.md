node-red-contrib-collectd
=========================

A [Node-RED](http://nodered.org) node to send metrics to [Collectd](https://collectd.org/).

Install
-------

Run the following command in the root directory of your Node-RED install:

    npm install node-red-contrib-collectd

This node makes use of the Collectd [plain text protocol](https://collectd.org/wiki/index.php/Plain_text_protocol#PUTVAL) provided by the [`unixsock` plugin](https://collectd.org/documentation/manpages/collectd.conf.5.shtml#plugin_unixsock).  Simply enable the `unixsock` plugin in your `collectd.conf`:

    LoadPlugin unixsock
    <Plugin unixsock>
        SocketFile "/var/run/collectd-unixsock"
        SocketPerms "0666"
        DeleteSocket true
    </Plugin>

The `SocketPerms` value ensures that any account on the system has write permissions to the socket file, but you can use `SocketGroup` to restrict permissions to a specific group.  Just be sure the account running Node-RED has permissions to write to the socket file!

Usage
-----

This node can be connected to the output of any node, and will publish `msg.payload` to a Collectd instance running on the local machine.  It will use `msg.timestamp` if set, otherwise the value `N` will be sent to Collectd, which is interpreted as "now".

The button to the right of the node will toggle console logging of Collectd requests/replies on and off.

TODO
----

  - Add support for [sending data to a remote instance of Collectd](https://collectd.org/documentation/manpages/collectd.conf.5.shtml#plugin_network)
  - Add support for [native Collectd types](https://collectd.org/documentation/manpages/types.db.5.shtml)
