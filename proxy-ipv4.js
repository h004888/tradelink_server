// Proxy TCP: listen IPv4 0.0.0.0:3000 → forward sang IPv6 ::1:3000 (backend)
// Giải quyết vấn đề backend chỉ listen IPv6, Android emulator cần IPv4.
const net = require('net');

const LISTEN_PORT = 3000;
// Listen IPv4 only (vì backend đã chiếm ::3000). Emulator dùng 10.0.2.2 (IPv4).
const LISTEN_HOST = '0.0.0.0';
const UPSTREAM_PORT = 3001;
const UPSTREAM_HOST = '127.0.0.1';

const proxy = net.createServer((client) => {
  const clientAddr = `${client.remoteAddress}:${client.remotePort}`;
  const upstream = net.connect(UPSTREAM_PORT, UPSTREAM_HOST, () => {
    // piped in handler below
  });
  upstream.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] upstream error ${clientAddr}: ${err.message}`);
    client.destroy();
  });
  client.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] client error ${clientAddr}: ${err.message}`);
    upstream.destroy();
  });
  client.pipe(upstream).pipe(client);
  console.log(`[${new Date().toISOString()}] OPEN ${clientAddr}`);
  client.on('close', () => {
    upstream.destroy();
    console.log(`[${new Date().toISOString()}] CLOSE ${clientAddr}`);
  });
});

proxy.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`Proxy IPv4 ${LISTEN_HOST}:${LISTEN_PORT} → IPv6 ${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
});