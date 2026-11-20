/**
 * Stand-in for `convex/react` in the static demo (selected with the `demo` Vite mode, see vite.config.js).
 * The components keep calling useQuery / useMutation / useAction exactly as before; the calls are answered
 * by the in-browser engine instead of a Convex deployment.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { getFunctionName } from 'convex/server';
import { HANDLERS } from './engine';
import { db } from './store';

// The live action waits for the AI model (10-30 s). A short pause keeps the "analysing" state visible.
const ACTION_DELAY_MS = 1600;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function handlerFor(reference) {
  const name = getFunctionName(reference);
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`"${name}" is not available in the static demo`);
  return handler;
}

export class ConvexReactClient {
  constructor(address) {
    this.address = address;
  }
  query = async (reference, args) => handlerFor(reference)(args ?? {});
  mutation = async (reference, args) => handlerFor(reference)(args ?? {});
  action = async (reference, args) => {
    await sleep(ACTION_DELAY_MS);
    return handlerFor(reference)(args ?? {});
  };
  close = async () => {};
}

const client = new ConvexReactClient('static-demo');

export function ConvexProvider({ children }) {
  return children;
}

export const useConvex = () => client;

/** Re-reads the "database" whenever it changes, like a live Convex query. Returns undefined for "skip". */
export function useQuery(reference, args) {
  const version = useSyncExternalStore(db.subscribe, db.getVersion);
  const name = getFunctionName(reference);
  const key = args === 'skip' ? null : JSON.stringify(args ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (key === null ? undefined : handlerFor(reference)(JSON.parse(key))), [name, key, version]);
}

export function useMutation(reference) {
  const name = getFunctionName(reference);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(async (args) => handlerFor(reference)(args ?? {}), [name]);
}

export function useAction(reference) {
  const name = getFunctionName(reference);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(async (args) => client.action(reference, args), [name]);
}
