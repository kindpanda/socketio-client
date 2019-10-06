# Socketio-client

Simple wrapper around npm socketio-client for easy use

## Install

```
npm install @kindpanda/socketio-client
```

## Usage

```js
import SocketioClient from '@kindpanda/socketio-client';

const logger = console;
const serverAddress = '...';
const socketOptions = {
  autoConnect: false,
  timeout: 5000,
  transports: ['websocket'],
  reconnection: true,
};

const client = new SocketioClient({ serverAddress, logger, socketOptions });

client.on(SocketioClient.EVENTS.STATUS_CHANGED, () => {...});
client.on(SocketioClient.EVENTS.CONNECTING, () => {...});
client.on(SocketioClient.EVENTS.CONNECTED, () => {...});
client.on(SocketioClient.EVENTS.DISCONNECTED, () => {...});

client.start();
client.stop();

```
