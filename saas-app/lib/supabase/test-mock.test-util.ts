// Minimal Supabase client mock for unit tests.
// Not a `.test.ts` so Vitest's glob ignores it.
//
// Usage:
//   const { client, calls, getCallsFor } = makeSupabaseMock({
//     sites: { select: () => ({ data: site, error: null }) },
//     gsc_page_metrics: { select: () => ({ data: rows, error: null }) },
//     analysis_runs: {
//       insert: () => ({ data: { id: "run-1", ...run }, error: null }),
//       update: () => ({ data: completedRun, error: null }),
//     },
//     findings: { insert: () => ({ error: null }) },
//     // ...
//   });

import { vi } from "vitest";

export interface ChainCall {
  method: string;
  args: unknown[];
}

export type Responder = (
  chain: ChainCall[],
) => { data?: unknown; error?: unknown; count?: number } | Promise<{ data?: unknown; error?: unknown; count?: number }>;

export interface TableSetup {
  select?: Responder;
  insert?: Responder;
  update?: Responder;
  delete?: Responder;
}

export interface MockClient {
  client: { from: (name: string) => unknown; auth?: unknown };
  calls: Array<{ table: string; op: "select" | "insert" | "update" | "delete"; chain: ChainCall[] }>;
  getCallsFor(table: string): Array<{ op: string; chain: ChainCall[] }>;
}

export function makeSupabaseMock(tables: Record<string, TableSetup>): MockClient {
  const calls: MockClient["calls"] = [];

  function buildBuilder(tableName: string) {
    const chain: ChainCall[] = [];
    let opType: "select" | "insert" | "update" | "delete" = "select";

    const builder: Record<string, unknown> = {};
    const chainMethods = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "in",
      "order",
      "limit",
      "lt",
      "gt",
      "gte",
      "lte",
      "neq",
      "match",
      "is",
      "not",
      "or",
      "range",
    ];

    for (const m of chainMethods) {
      builder[m] = vi.fn((...args: unknown[]) => {
        chain.push({ method: m, args });
        if (m === "insert") opType = "insert";
        else if (m === "update") opType = "update";
        else if (m === "delete") opType = "delete";
        return builder;
      });
    }

    const terminate = async () => {
      const table = tables[tableName];
      if (!table) {
        return {
          data: null,
          error: { message: `Mock: unhandled table "${tableName}"` },
        };
      }
      const responder = table[opType];
      if (!responder) {
        return {
          data: null,
          error: { message: `Mock: no ${opType} responder for "${tableName}"` },
        };
      }
      calls.push({ table: tableName, op: opType, chain: [...chain] });
      return responder([...chain]);
    };

    builder.single = vi.fn(() => {
      chain.push({ method: "single", args: [] });
      return terminate();
    });
    builder.maybeSingle = vi.fn(() => {
      chain.push({ method: "maybeSingle", args: [] });
      return terminate();
    });
    // Make the builder thenable so `await supabase.from(...).select(...).eq(...)` resolves.
    builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      terminate().then(resolve, reject);

    return builder;
  }

  const client = {
    from: vi.fn((name: string) => buildBuilder(name)),
  };

  return {
    client,
    calls,
    getCallsFor: (table: string) => calls.filter((c) => c.table === table),
  };
}
