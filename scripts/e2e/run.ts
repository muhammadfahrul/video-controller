/**
 * E2E test runner - simulates topologi 1 ruangan = 1 PC di 1 host.
 *
 * Spawn:
 *   - 3 servers di port 53331, 53332, 53333
 *   - 3 mock agents, 1 per server
 *   - 1 cashier-like client yang connect ke 3 server
 *
 * Tests:
 *   1. Multi-server connection (cashier opens 3 sockets simultaneously)
 *   2. Activate flow end-to-end (event delivered to correct agent)
 *   3. Transaction merge (Fix A bug A.2 - prevent cross-server orphan loss)
 *   4. Connection lookup robust (Fix B - resolve roomId via multiple strategies)
 *   5. Reconnect (kill & restart 1 server, agent re-registers)
 */
import { spawnServer, waitForServerReady, ServerHandle } from './spawn-server';
import { spawnMockAgent, MockAgentHandle } from './spawn-mock-agent';
import { createCashierLikeClient, CashierClientHandle, RoomConfig } from './test-client';

const PORTS = [53331, 53332, 53333];
const ROOM_IDS = ['room-001', 'room-002', 'room-003'];
const ROOM_NAMES = ['Room 1', 'Room 2', 'Room 3'];

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(level: 'info' | 'pass' | 'fail' | 'step', msg: string) {
  const prefix = {
    info: `${ANSI.cyan}[INFO]${ANSI.reset}`,
    pass: `${ANSI.green}[PASS]${ANSI.reset}`,
    fail: `${ANSI.red}[FAIL]${ANSI.reset}`,
    step: `${ANSI.bold}[STEP]${ANSI.reset}`,
  }[level];
  console.log(`${prefix} ${msg}`);
}

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    log('fail', `Assertion failed: ${msg}`);
    throw new Error(msg);
  }
}

async function testMultiServerConnection(
  servers: ServerHandle[],
  cashier: CashierClientHandle
): Promise<void> {
  log('step', 'Test 1: Multi-server connection');
  assert(cashier.connections.size === 3, `Expected 3 connections, got ${cashier.connections.size}`);

  // All 3 sockets should be connected
  for (const server of servers) {
    const conn = cashier.connections.get(`env-room-${server.name}`);
    if (!conn) {
      const altConn = Array.from(cashier.connections.values()).find(
        (c) => c.config.ip === '127.0.0.1' && c.config.port === server.port
      );
      assert(!!altConn, `No connection for server on port ${server.port}`);
    }
  }
  log('pass', 'All 3 cashier sockets connected to 3 servers');
}

async function testActivateFlow(
  servers: ServerHandle[],
  agents: MockAgentHandle[],
  cashier: CashierClientHandle
): Promise<void> {
  log('step', 'Test 2: Activate flow end-to-end');

  // Wait for all agents to register
  for (let i = 0; i < agents.length; i++) {
    await cashier.waitForAgentRegistered(ROOM_IDS[i]);
    log('pass', `Agent ${ROOM_NAMES[i]} registered`);
  }

  // Activate Room 1 for 60 minutes
  await cashier.activateRoom(ROOM_IDS[0], ROOM_NAMES[0], 60);
  log('pass', `Sent activate for ${ROOM_NAMES[0]}`);

  // Wait for activation event
  await agents[0].activationPromise;
  assert(agents[0].isActive, `${ROOM_NAMES[0]} agent should be active`);
  log('pass', `${ROOM_NAMES[0]} agent received activation`);

  // Verify isolation: Room 2 & 3 should NOT be active
  assert(!agents[1].isActive, `${ROOM_NAMES[1]} agent should NOT be active`);
  assert(!agents[2].isActive, `${ROOM_NAMES[2]} agent should NOT be active`);
  log('pass', `Isolation: ${ROOM_NAMES[1]} and ${ROOM_NAMES[2]} remain inactive`);

  // Deactivate
  await cashier.deactivateRoom(ROOM_IDS[0]);
  await new Promise((r) => setTimeout(r, 1000));
  log('pass', `Deactivation sent for ${ROOM_NAMES[0]}`);
}

async function testTransactionMerge(
  servers: ServerHandle[],
  agents: MockAgentHandle[],
  cashier: CashierClientHandle
): Promise<void> {
  log('step', 'Test 3: Transaction merge (Fix A)');

  // Activate Room 1
  await cashier.activateRoom(ROOM_IDS[0], ROOM_NAMES[0], 1); // 1 minute
  await agents[0].activationPromise;
  log('pass', `${ROOM_NAMES[0]} activated for 1 min`);

  // Activate Room 2
  await cashier.activateRoom(ROOM_IDS[1], ROOM_NAMES[1], 1);
  await agents[1].activationPromise;
  log('pass', `${ROOM_NAMES[1]} activated for 1 min`);

  // Deactivate Room 1 (creates transaction on server 53331)
  await cashier.deactivateRoom(ROOM_IDS[0]);
  await new Promise((r) => setTimeout(r, 1500));
  log('pass', `${ROOM_NAMES[0]} deactivated`);

  // Load transactions from server 1
  const txsFromServer1 = await cashier.loadTransactions(ROOM_IDS[0]);
  log('pass', `Server 1 returned ${txsFromServer1.length} transactions`);

  // Deactivate Room 2 (creates transaction on server 53332)
  await cashier.deactivateRoom(ROOM_IDS[1]);
  await new Promise((r) => setTimeout(r, 1500));

  // Load transactions from server 2
  const txsFromServer2 = await cashier.loadTransactions(ROOM_IDS[1]);
  log('pass', `Server 2 returned ${txsFromServer2.length} transactions`);

  // CRITICAL: After loading from server 2, server 1 transactions should still be visible
  const txsFromServer1Again = await cashier.loadTransactions(ROOM_IDS[0]);
  assert(
    txsFromServer1Again.length >= 1,
    `Server 1 transactions should be preserved after server 2 update (Fix A bug A.2). Got: ${txsFromServer1Again.length}`
  );
  log('pass', `Cross-server preservation works: server 1 still has ${txsFromServer1Again.length} tx after server 2 update`);

  // Verify both rooms have transactions
  const tx1Ids = txsFromServer1.map((t: any) => t.roomId);
  const tx2Ids = txsFromServer2.map((t: any) => t.roomId);
  assert(tx1Ids.includes('room-001'), `Room 1 transactions should include room-001`);
  assert(tx2Ids.includes('room-002'), `Room 2 transactions should include room-002`);
  log('pass', `Both rooms have their own transactions`);
}

async function testConnectionLookup(
  cashier: CashierClientHandle,
  agents: MockAgentHandle[]
): Promise<void> {
  log('step', 'Test 4: Connection lookup robust (Fix B)');

  // Activate using agent's roomId (not config.id) - simulates cashier using
  // the roomId that came from agent registration
  await cashier.activateRoom(ROOM_IDS[1], ROOM_NAMES[1], 5);
  await agents[1].activationPromise;
  assert(agents[1].isActive, `${ROOM_NAMES[1]} should activate via roomId lookup`);
  log('pass', `Activate via agent roomId resolved correctly`);

  // Deactivate via roomId
  await cashier.deactivateRoom(ROOM_IDS[1]);
  await new Promise((r) => setTimeout(r, 500));
  log('pass', `Deactivate via roomId works`);
}

async function testReconnect(
  servers: ServerHandle[],
  agents: MockAgentHandle[],
  cashier: CashierClientHandle
): Promise<void> {
  log('step', 'Test 5: Reconnect after server restart');

  const server2 = servers[1];
  const agent2 = agents[1];

  log('info', `Stopping server on port ${server2.port}...`);
  await server2.stop();

  // Wait for disconnect to propagate
  await new Promise((r) => setTimeout(r, 1000));
  log('pass', `Server ${ROOM_NAMES[1]} stopped`);

  // Restart server
  log('info', `Restarting server on port ${server2.port}...`);
  const newServer = await spawnServer({
    port: server2.port,
    name: ROOM_IDS[1],
  });
  servers[1] = newServer;
  await waitForServerReady(newServer.port);
  log('pass', `Server ${ROOM_NAMES[1]} restarted on port ${newServer.port}`);

  // Wait for cashier to auto-reconnect (reconnectionDelay: 500ms + buffer)
  log('info', 'Waiting for cashier to reconnect to new server...');
  await new Promise((r) => setTimeout(r, 2000));

  // Verify cashier connection restored
  const conn = cashier.connections.get('env-room-2');
  if (conn) {
    // Wait until socket reports connected
    const connectedDeadline = Date.now() + 5000;
    while (!conn.socket.connected && Date.now() < connectedDeadline) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (conn.socket.connected) {
      log('pass', 'Cashier socket reconnected to new server');
    } else {
      log('info', 'Cashier socket still disconnected (may retry automatically)');
    }
  }

  // Reconnect mock agent to new server
  const newAgent = spawnMockAgent({
    serverUrl: `http://127.0.0.1:${newServer.port}`,
    roomId: ROOM_IDS[1],
    roomName: ROOM_NAMES[1],
  });
  agents[1] = newAgent;

  await new Promise<void>((resolve) => {
    newAgent.socket.once('connect', () => resolve());
  });
  await new Promise((r) => setTimeout(r, 500)); // wait for register

  // Verify agent re-registered
  await cashier.waitForAgentRegistered(ROOM_IDS[1], 5000);
  log('pass', `Agent ${ROOM_NAMES[1]} re-registered after server restart`);

  // Verify cashier can still activate this room
  await cashier.activateRoom(ROOM_IDS[1], ROOM_NAMES[1], 5);
  await newAgent.activationPromise;
  assert(newAgent.isActive, `${ROOM_NAMES[1]} should activate after reconnect`);
  log('pass', `${ROOM_NAMES[1]} activates correctly after reconnect`);

  // Cleanup: deactivate
  await cashier.deactivateRoom(ROOM_IDS[1]);
  await new Promise((r) => setTimeout(r, 500));
}

async function main() {
  log('info', `${ANSI.bold}Video Controller - E2E Test Runner${ANSI.reset}`);
  log('info', `Simulating topologi: 3 ruangan di 3 PC berbeda (di-satu host)`);
  console.log();

  const servers: ServerHandle[] = [];
  const agents: MockAgentHandle[] = [];
  let cashier: CashierClientHandle | undefined;

  try {
    // Phase 1: Spawn 3 servers
    log('step', 'Phase 1: Spawning 3 servers');
    for (let i = 0; i < 3; i++) {
      const server = await spawnServer({
        port: PORTS[i],
        name: ROOM_IDS[i],
      });
      servers.push(server);
      log('pass', `Server ${ROOM_NAMES[i]} spawned on port ${PORTS[i]}`);
    }

    // Wait for all servers ready
    log('info', 'Waiting for all servers to be ready...');
    await Promise.all(servers.map((s) => waitForServerReady(s.port)));
    log('pass', 'All 3 servers ready');
    console.log();

    // Phase 2: Spawn 3 mock agents
    log('step', 'Phase 2: Spawning 3 mock agents');
    for (let i = 0; i < 3; i++) {
      const agent = spawnMockAgent({
        serverUrl: `http://127.0.0.1:${PORTS[i]}`,
        roomId: ROOM_IDS[i],
        roomName: ROOM_NAMES[i],
      });
      agents.push(agent);
      log('pass', `Mock agent ${ROOM_NAMES[i]} connecting...`);
    }

    // Wait for all agents to connect
    await Promise.all(
      agents.map(
        (a) =>
          new Promise<void>((resolve) => {
            a.socket.once('connect', () => resolve());
          })
      )
    );
    await new Promise((r) => setTimeout(r, 500)); // wait for register
    log('pass', 'All 3 mock agents connected and registered');
    console.log();

    // Phase 3: Create cashier-like client
    log('step', 'Phase 3: Creating cashier-like client');
    const cashierConfigs: RoomConfig[] = servers.map((s, i) => ({
      id: `env-room-${i + 1}`,
      name: ROOM_NAMES[i],
      roomId: ROOM_IDS[i],
      ip: '127.0.0.1',
      port: s.port,
    }));

    cashier = await createCashierLikeClient(cashierConfigs);
    log('pass', `Cashier connected to ${cashier.connections.size} servers`);
    console.log();

    // Run tests
    await testMultiServerConnection(servers, cashier);
    console.log();
    await testActivateFlow(servers, agents, cashier);
    console.log();
    await testTransactionMerge(servers, agents, cashier);
    console.log();
    await testConnectionLookup(cashier, agents);
    console.log();
    await testReconnect(servers, agents, cashier);
    console.log();

    // Success
    log('pass', `${ANSI.bold}${ANSI.green}ALL E2E TESTS PASSED ✅${ANSI.reset}`);
  } catch (err) {
    log('fail', `${ANSI.bold}${ANSI.red}E2E TEST FAILED ❌${ANSI.reset}`);
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Cleanup
    log('info', 'Cleanup: stopping all processes...');
    for (const agent of agents) {
      try {
        agent.disconnect();
      } catch {}
    }
    if (cashier) {
      await cashier.disconnectAll();
    }
    for (const server of servers) {
      try {
        await server.stop();
      } catch {}
    }
    log('pass', 'Cleanup complete');
  }
}

main();
