"use strict";

var _http = require("http");

var _socket = _interopRequireDefault(require("socket.io"));

var _SocketioClient = _interopRequireDefault(require("./SocketioClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

jest.setTimeout(10000);
const noopLogger = {
  debug: () => {},
  log: () => {},
  info: () => {},
  error: () => {}
};
let httpServer;
let httpServerAddr;
let ioServer;
beforeAll(() => {
  httpServer = (0, _http.createServer)();
  httpServerAddr = httpServer.listen().address();
  ioServer = (0, _socket.default)(httpServer);
});
afterAll(async () => {
  await ioServer.close();
  await httpServer.close();
});
describe('Test server starts', () => {
  it('create a valid server', async () => {
    expect(typeof ioServer).toBe('object');
  });
});
describe('Socket status works', () => {
  it('it can connect and disconnect with good status', async () => {
    const client = new _SocketioClient.default({
      serverAddress: `http://[${httpServerAddr.address}]:${httpServerAddr.port}`,
      logger: noopLogger
    });
    expect(client.isConnected()).toBe(false);
    const connected = await Promise.race([new Promise(resolve => {
      client.on('connected', () => resolve(true));
      client.connect();
    }), new Promise(resolve => setTimeout(() => resolve(false), 100))]);
    expect(connected).toBe(true);
    expect(client.isConnected()).toBe(true);
    const disconnected = await Promise.race([new Promise(resolve => {
      client.on('disconnected', () => resolve(true));
      client.disconnect();
    }), new Promise(resolve => setTimeout(() => resolve(false), 100))]);
    expect(disconnected).toBe(true);
    expect(client.isConnected()).toBe(false);
    expect(client.isDisconnected()).toBe(true);
  });
});
describe('Client events works', () => {
  it('it emit event on status changes', async () => {
    const client = new _SocketioClient.default({
      serverAddress: `http://[${httpServerAddr.address}]:${httpServerAddr.port}`,
      logger: noopLogger
    });
    const connectedMock = jest.fn();
    const connectingMock = jest.fn();
    const disconnectedMock = jest.fn();
    const statusChangedMock = jest.fn();
    client.on(_SocketioClient.default.EVENTS.CONNECTED, connectedMock);
    client.on(_SocketioClient.default.EVENTS.CONNECTING, connectingMock);
    client.on(_SocketioClient.default.EVENTS.DISCONNECTED, disconnectedMock);
    client.on(_SocketioClient.default.EVENTS.STATUS_CHANGED, statusChangedMock); // Connect

    await Promise.race([new Promise(resolve => {
      client.on('connected', () => resolve(true));
      client.connect();
    }), new Promise(resolve => setTimeout(() => resolve(false), 100))]);
    expect(connectedMock.mock.calls.length).toBe(1);
    expect(connectingMock.mock.calls.length).toBe(1);
    expect(disconnectedMock.mock.calls.length).toBe(0);
    expect(statusChangedMock.mock.calls.length).toBe(2);
    expect(statusChangedMock.mock.calls[0][0]).toMatchObject({
      previous: _SocketioClient.default.STATUS.DISCONNECTED,
      to: _SocketioClient.default.STATUS.CONNECTING
    });
    expect(statusChangedMock.mock.calls[1][0]).toMatchObject({
      previous: _SocketioClient.default.STATUS.CONNECTING,
      to: _SocketioClient.default.STATUS.CONNECTED
    }); // Disconnect

    await Promise.race([new Promise(resolve => {
      client.on('disconnected', () => resolve(true));
      client.disconnect();
    }), new Promise(resolve => setTimeout(() => resolve(false), 100))]);
    expect(connectedMock.mock.calls.length).toBe(1);
    expect(connectingMock.mock.calls.length).toBe(1);
    expect(disconnectedMock.mock.calls.length).toBe(1);
    expect(statusChangedMock.mock.calls.length).toBe(3);
    expect(statusChangedMock.mock.calls[2][0]).toMatchObject({
      previous: _SocketioClient.default.STATUS.CONNECTED,
      to: _SocketioClient.default.STATUS.DISCONNECTED
    });
  });
});