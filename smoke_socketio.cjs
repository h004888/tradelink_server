// Test socket.io realtime chat end-to-end
const { io } = require('socket.io-client');
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); }
      });
    });
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // Login both users
  const l1 = await req('POST', '/api/v1/auth/login', { email: 'smoke2@test.com', password: 'pw12345' });
  const l2 = await req('POST', '/api/v1/auth/login', { email: 'smoke3@test.com', password: 'pw12345' });
  if (l1.status !== 200 || l2.status !== 200) { console.log('login FAIL', l1.status, l2.status); process.exit(1); }
  const token1 = l1.body.data.token;
  const token2 = l2.body.data.token;
  console.log('logged in both users');

  // Get user1 id
  const me1 = await req('GET', '/api/v1/auth/me', null, token1);
  const user1Id = me1.body.data._id;

  // Init conversation
  const init = await req('POST', '/api/v1/conversations/init', { otherUserId: user1Id, listingId: '6a4fd480d97de0a83925612b' }, token2);
  if (init.status !== 200) { console.log('init FAIL', init.status, init.body); process.exit(1); }
  const convId = init.body.data._id;
  console.log('conv:', convId);

  // Connect 2 socket clients
  const sock1 = io('http://localhost:3000', { auth: { token: token1 }, transports: ['websocket', 'polling'] });
  const sock2 = io('http://localhost:3000', { auth: { token: token2 }, transports: ['websocket', 'polling'] });

  let received1 = null, received2 = null;
  sock1.on('connect', () => { console.log('sock1 connected'); sock1.emit('join', convId); });
  sock2.on('connect', () => { console.log('sock2 connected'); sock2.emit('join', convId); });
  sock1.on('message:new', (m) => { console.log('sock1 got message:', m.text); received1 = m; sock1.disconnect(); });
  sock2.on('message:new', (m) => { console.log('sock2 got message:', m.text); received2 = m; sock2.disconnect(); });

  sock1.on('connect_error', (err) => console.log('sock1 err:', err.message));
  sock2.on('connect_error', (err) => console.log('sock2 err:', err.message));

  // Wait for both to be joined
  await new Promise((r) => setTimeout(r, 1500));

  // User2 sends message via socket
  sock2.emit('send', { conversationId: convId, text: 'Hello via socket!', isOffer: false }, (ack) => {
    console.log('send ack:', ack?.success, ack?.data?.text);
  });

  // Wait for broadcast
  await new Promise((r) => setTimeout(r, 1500));

  console.log('--- summary ---');
  console.log('user1 received:', received1?.text);
  console.log('user2 received:', received2?.text);
  if (received1 && received2) console.log('✓ realtime broadcast OK');
  else console.log('✗ FAIL');
  process.exit(received1 && received2 ? 0 : 1);
})();
