import "server-only";
const state = globalThis as unknown as { __mcMutationTail?: Promise<unknown> };
export function serializePost<T>(handler: (req: Request) => Promise<T>) {
  return (req: Request): Promise<T> => {
    const job = (state.__mcMutationTail ?? Promise.resolve()).then(() => handler(req));
    state.__mcMutationTail = job.catch(() => undefined);
    return job;
  };
}
