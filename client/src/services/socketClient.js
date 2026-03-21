import { io } from "socket.io-client";

let _socket = null;
let _socketUrl = "";
let _authSignature = "__public__";

export const getSocket = (url) => {
  if (!_socket || _socketUrl !== url) {
    if (_socket) {
      _socket.disconnect();
    }

    _socket = io(url, { autoConnect: false });
    _socketUrl = url;
    _authSignature = "__public__";
  }

  return _socket;
};

export const connectSocket = (url, options = {}) => {
  const socket = getSocket(url);
  const hasAuth = Object.prototype.hasOwnProperty.call(options, "auth");
  const nextAuth = hasAuth ? options.auth || {} : socket.auth || {};
  const nextAuthSignature = JSON.stringify(nextAuth);

  if (hasAuth && nextAuthSignature !== _authSignature) {
    _authSignature = nextAuthSignature;
    socket.auth = nextAuth;

    if (socket.connected) {
      socket.disconnect();
    }
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (_socket?.connected) {
    _socket.disconnect();
  }

  if (_socket) {
    _socket.auth = {};
  }

  _authSignature = "__public__";
};
