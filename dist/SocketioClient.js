"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.EVENTS = exports.STATUS = exports.SOCKET_EVENTS = void 0;

var _events = _interopRequireDefault(require("events"));

var _socket = _interopRequireDefault(require("socket.io-client"));

var _promisifySocket = require("@kindpanda/promisify-socket");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const SOCKET_EVENTS = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECTING: 'reconnecting',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed'
});
exports.SOCKET_EVENTS = SOCKET_EVENTS;
const STATUS = Object.freeze({
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected'
});
exports.STATUS = STATUS;
const EVENTS = Object.freeze({
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  STATUS_CHANGED: 'STATUS_CHANGED'
});
exports.EVENTS = EVENTS;
const DEFAULT_SOCKET_OPTIONS = {
  autoConnect: false,
  timeout: 5000,
  transports: ['websocket'],
  reconnection: true
};

class SocketioClient extends _events.default {
  constructor(options) {
    super();
    const {
      serverAddress,
      logger = console,
      socketOptions = DEFAULT_SOCKET_OPTIONS,
      timeout = 5000
    } = options;
    this.defaultTimeout = timeout;
    this.logger = logger;
    this.serverAddress = serverAddress;
    this.socketOptions = { ...DEFAULT_SOCKET_OPTIONS,
      ...socketOptions
    };
    this.status = STATUS.DISCONNECTED;
    this.socket;
    this.initSocket();
  }

  setStatus(status) {
    if (!Object.values(STATUS).includes(status)) {
      this.logger.error('Invalid status', {
        status
      });
      throw new Error('invalid status');
    }

    if (this.status !== status) {
      const previous = this.status;
      this.logger.debug('Status changed', {
        previous,
        to: status
      });
      this.status = status;
      const eventKey = Object.keys(STATUS).reduce((res, statusKey) => !res && status === STATUS[statusKey] ? statusKey : res, '');
      this.emit(EVENTS[eventKey]);
      this.emit(EVENTS.STATUS_CHANGED, {
        previous,
        to: status
      });
    }
  }

  initSocket() {
    if (this.socket) {
      return false;
    }

    this.socket = _socket.default.connect(this.serverAddress, this.socketOptions);
    this.socket = (0, _promisifySocket.promisifySocket)(this.socket);
    this.emit(EVENTS.SOCKET_INITIALIZED);
    [SOCKET_EVENTS.CONNECT, SOCKET_EVENTS.RECONNECT].forEach(event => this.socket.on(event, () => {
      this.logger.info('Socket is connected', {
        event
      });
      this.setStatus(STATUS.CONNECTED);
    }));
    this.socket.on(SOCKET_EVENTS.RECONNECTING, () => {
      this.logger.info('Socket is reconnecting');
      this.setStatus(STATUS.CONNECTING);
    });
    [SOCKET_EVENTS.RECONNECT_ERROR, SOCKET_EVENTS.RECONNECT_FAILED, SOCKET_EVENTS.DISCONNECT].forEach(event => this.socket.on(event, () => {
      this.logger.info('Socket is disconnected', {
        event
      });
      this.setStatus(STATUS.DISCONNECTED);
    }));
    this.logger.debug('socket initialized');
    return true;
  }

  connect() {
    if (this.isDisconnected()) {
      this.logger.debug('connect the socket');
      this.setStatus(STATUS.CONNECTING);
      this.socket.connect();
      return true;
    }

    return false;
  }

  disconnect() {
    if (this.isConnected() || this.socket) {
      this.logger.debug('disconnect the socket');
      this.socket.disconnect();
    }
  }

  isConnected() {
    return this.status === STATUS.CONNECTED;
  }

  isConnecting() {
    return this.status === STATUS.CONNECTING;
  }

  isDisconnected() {
    return this.status === STATUS.DISCONNECTED;
  }

  async wait(duration = 500) {
    this.logger.debug('wait', {
      duration
    });
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  async start({
    timeout = this.defaultTimeout
  } = {}) {
    const options = {
      timeout
    };
    const logger = this.logger.context({
      action: 'start',
      options
    });

    if (this.isConnected()) {
      logger.debug('already connected');
      return true;
    }

    if (this.isConnecting()) {
      logger.debug('already connecting, wait');
      return this.wait(timeout).then(() => this.start(options));
    }

    logger.info('Starting connection');
    return Promise.race([new Promise(resolve => {
      this.socket.once(SOCKET_EVENTS.CONNECT, () => resolve(true));
      this.connect();
    }), new Promise((resolve, reject) => setTimeout(() => {
      if (!this.isConnected()) {
        // this.setStatus(STATUS.DISCONNECTED);
        reject('Socket connection timed out');
      }
    }, timeout))]);
  }

  async stop({
    timeout = this.defaultTimeout
  } = {}) {
    const options = {
      timeout
    };

    if (this.isDisconnected() || !this.socket) {
      return true;
    }

    if (this.isConnecting()) {
      await this.wait();
      return this.stop(options);
    }

    this.logger.debug('Disconnect socket', {
      timeout
    });
    return Promise.race([new Promise(resolve => {
      this.once(SOCKET_EVENTS.DISCONNECT, () => resolve(true));
      this.disconnect();
    }), new Promise((resolve, reject) => setTimeout(() => reject('Connection timed out'), timeout))]);
  }

}

SocketioClient.SOCKET_EVENTS = SOCKET_EVENTS;
SocketioClient.STATUS = STATUS;
SocketioClient.EVENTS = EVENTS;
SocketioClient.DEFAULT_SOCKET_OPTIONS = DEFAULT_SOCKET_OPTIONS;
var _default = SocketioClient;
exports.default = _default;