export const socketOptions = {
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 5,
  timeout: 10000,
  withCredentials: true,
  autoConnect: false,
};

export const connectSocketAfterMount = (socket) => {
  if (!socket) return () => {};

  const connectTimer = window.setTimeout(() => {
    if (!socket.connected) socket.connect();
  }, 0);

  return () => {
    window.clearTimeout(connectTimer);
    socket.disconnect();
  };
};
