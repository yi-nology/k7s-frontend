/**
 * Reconcile a `cluster-status` push into the connection lifecycle (Story 6.2):
 * a live cluster going unreachable flips the UI to disconnected, and recovery
 * flips it back — without a manual reconnect. Also clears stale metrics when
 * the metrics API disappears (`cpuPercent` goes null) so CPU/MEM fall back
 * to "—".
 *
 * The reconciliation is gated on the status's `context` matching the store's
 * current `connection.context` (when both are known). The TauriProvider's
 * `cluster-status` event is per-cluster, but a stale event from the previous
 * cluster could still land after the new cluster's `connect()` resolves. The
 * gate drops the stale event so a healthy cluster B doesn't briefly look
 * "error" / "unreachable" because cluster A went down.
 *
 * `status.context` is optional for backward compatibility with backends that
 * pre-date the context-tagging wire change: an untagged status is allowed
 * through (existing behavior preserved), and a tagged status with no
 * corresponding store context is allowed (the store context is null until the
 * first `connectTo()` resolves — covers the initial `cluster-status` emit
 * that fires before the connection is up).
 */

import type { ClusterStatus } from '../providers/types';
import type { AppState, ConnectionState } from '../store';

/**
 * The slice of `AppState` the reconciliation reads and writes.
 *
 * Decoupled from the full `useStore` so the function is unit-testable without
 * the React tree: a test can pass a hand-rolled `AppState` slice that records
 * what got written, instead of mutating the real Zustand singleton.
 */
export interface ClusterStatusState {
  connection: ConnectionState;
  setConnection: AppState['setConnection'];
  setClusterStatus: AppState['setClusterStatus'];
  setPodMetrics: AppState['setPodMetrics'];
  setNodeMetrics: AppState['setNodeMetrics'];
  resetData: AppState['resetData'];
}

/**
 * Apply a `cluster-status` push to the store. The four side effects — writing
 * the status, flipping the connection phase on a connectivity change, and
 * clearing the cached pod/node metrics on a metrics-server disappearance — are
 * all gated on the status belonging to the store's current context.
 *
 * A status tagged with a *foreign* context is not always stale: k7s-web runs
 * one backend connection per process, so another session's `connect` re-points
 * this tab's writes too. The epoch tells them apart — older than ours is late
 * baggage from the cluster this tab just left; newer is the backend having
 * moved on.
 */
export function reconcileClusterStatus(status: ClusterStatus, state: ClusterStatusState): void {
  const { connection, setConnection, setClusterStatus, setPodMetrics, setNodeMetrics, resetData } =
    state;

  // Foreign context. The gate is a no-op when either side is unknown (legacy
  // untagged status, or the store is in the pre-first-connect idle/connecting
  // state), so those flows are preserved.
  if (
    typeof status.context === 'string' &&
    connection.context != null &&
    status.context !== connection.context
  ) {
    // Newer epoch: the backend switched to this context after we connected
    // (another web session). Every write from this tab would now land on the
    // wrong cluster — say so and drop the stale view.
    if (
      connection.phase === 'connected' &&
      typeof status.epoch === 'number' &&
      typeof connection.epoch === 'number' &&
      status.epoch > connection.epoch
    ) {
      setConnection({
        phase: 'error',
        error: `集群连接已切换到 ${status.context}，请重新选择集群`,
      });
      resetData();
    }
    // Otherwise it is late baggage from the cluster this tab just left (older
    // epoch) or a backend that predates the field: keep dropping it.
    return;
  }

  setClusterStatus(status);

  if (connection.phase === 'connected' && !status.connected) {
    setConnection({ phase: 'error', error: 'cluster unreachable' });
  } else if (connection.phase === 'error' && status.connected) {
    setConnection({ phase: 'connected', error: undefined });
  }

  if (status.cpuPercent == null) {
    // metrics-server gone: drop cached usage so nothing stale lingers.
    setPodMetrics({});
    setNodeMetrics({});
  }
}
