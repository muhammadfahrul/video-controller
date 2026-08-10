import type { RoomBilling, Transaction } from '../types';

export type RoomStatusLabel = 'OFFLINE' | 'AKTIF' | 'UNPAID' | 'BERSIHKAN' | 'SUDAH DIBERSIHKAN' | 'ONLINE';

export interface RoomStatusInfo {
  label: RoomStatusLabel;
  color: string;
  borderColor: string;
  iconColor: string;
  badgeColor: string;
}

const CLEANING_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const CLEANED_THRESHOLD = 60 * 60 * 1000; // 60 minutes

const STATUS_STYLES: Record<RoomStatusLabel, Omit<RoomStatusInfo, 'label'>> = {
  OFFLINE: { color: 'red', borderColor: 'border-l-red-500', iconColor: 'text-red-400 bg-red-500/20', badgeColor: 'bg-red-500/20 text-red-400' },
  AKTIF: { color: 'blue', borderColor: 'border-l-blue-500', iconColor: 'text-blue-400 bg-blue-500/20', badgeColor: 'bg-blue-500/20 text-blue-400' },
  UNPAID: { color: 'orange', borderColor: 'border-l-orange-500', iconColor: 'text-orange-400 bg-orange-500/20', badgeColor: 'bg-orange-500/20 text-orange-400' },
  BERSIHKAN: { color: 'yellow', borderColor: 'border-l-yellow-500', iconColor: 'text-yellow-400 bg-yellow-500/20', badgeColor: 'bg-yellow-500/20 text-yellow-400' },
  'SUDAH DIBERSIHKAN': { color: 'cyan', borderColor: 'border-l-cyan-500', iconColor: 'text-cyan-400 bg-cyan-500/20', badgeColor: 'bg-cyan-500/20 text-cyan-400' },
  ONLINE: { color: 'gray', borderColor: 'border-l-gray-500', iconColor: 'text-gray-400 bg-gray-500/20', badgeColor: 'bg-gray-500/20 text-gray-400' },
};

function withStyle(label: RoomStatusLabel): RoomStatusInfo {
  return { label, ...STATUS_STYLES[label] };
}

// Cleaning status derived from paid transactions (normal flow: deactivate -> unpaid
// transaction -> payment confirmed -> BERSIHKAN, timed from paidAt).
function getPaidCleaningStatus(roomTransactions: Transaction[]): RoomStatusLabel | null {
  const latestTransaction = roomTransactions[0];
  const lastPaid = latestTransaction && latestTransaction.paidAt > 0;
  if (!lastPaid || !latestTransaction) return null;

  const allPaidCleaned = roomTransactions
    .filter(t => t.paidAt > 0)
    .every(t => t.cleanedAt && t.cleanedAt > 0);
  if (allPaidCleaned) return 'SUDAH DIBERSIHKAN';

  const timeSincePaid = Date.now() - latestTransaction.paidAt;
  if (timeSincePaid < CLEANING_THRESHOLD) return 'BERSIHKAN';
  if (timeSincePaid < CLEANED_THRESHOLD) return 'SUDAH DIBERSIHKAN';
  return null; // Back to ONLINE after > 60 min
}

// Cleaning status for a room vacated via Move Room, which has no transaction of its
// own to time from - uses roomBilling.needsCleaning/lastTransactionEndTime instead,
// with the same thresholds as the paid-transaction flow.
function getMovedOutCleaningStatus(roomBilling: RoomBilling): RoomStatusLabel | null {
  if (!roomBilling.needsCleaning || !roomBilling.lastTransactionEndTime) return null;
  const timeSinceMoved = Date.now() - roomBilling.lastTransactionEndTime;
  if (timeSinceMoved < CLEANING_THRESHOLD) return 'BERSIHKAN';
  if (timeSinceMoved < CLEANED_THRESHOLD) return 'SUDAH DIBERSIHKAN';
  return null; // Back to ONLINE after > 60 min
}

// Determine room status. Priority: OFFLINE > AKTIF > UNPAID > BERSIHKAN (0-30 min) >
// SUDAH DIBERSIHKAN (30-60 min) > ONLINE (>60 min).
export function getRoomStatus(roomBilling: RoomBilling, transactions: Transaction[]): RoomStatusInfo {
  if (!roomBilling.isConnected) return withStyle('OFFLINE');
  if (roomBilling.isActive) return withStyle('AKTIF');

  const roomKey = roomBilling.roomId.toLowerCase();
  const roomNameKey = roomBilling.roomName.toLowerCase();
  const roomTransactions = transactions.filter(t =>
    t.roomId.toLowerCase() === roomKey || t.roomName.toLowerCase() === roomNameKey
  );
  const hasUnpaid = roomTransactions.some(t => t.paidAt === 0);
  if (hasUnpaid) return withStyle('UNPAID');

  // getMovedOutCleaningStatus must be checked first: roomBilling.needsCleaning is
  // only ever true right after a Move Room deactivation (server sets it in that
  // one path and clears it on activation/mark-cleaned - see server's
  // CASHIER_DEACTIVATE_ROOM/CASHIER_ACTIVATE_ROOM/CASHIER_MARK_ROOM_CLEANED
  // handlers), so it's authoritative whenever set. A Move Room deactivation
  // deliberately records no transaction for the source room (the transaction is
  // recorded once, later, at the target room), so getPaidCleaningStatus would
  // otherwise be evaluated against a stale, unrelated PREVIOUS transaction (e.g.
  // an earlier customer's payment) and could wrongly short-circuit straight to
  // 'SUDAH DIBERSIHKAN' instead of 'BERSIHKAN' immediately after a move.
  const cleaningStatus = getMovedOutCleaningStatus(roomBilling) ?? getPaidCleaningStatus(roomTransactions);
  if (cleaningStatus) return withStyle(cleaningStatus);

  return withStyle('ONLINE');
}
