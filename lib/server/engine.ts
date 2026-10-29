/* Safe, controlled analysis engine.
 * Supports a useful subset of SQL and of pandas. Nothing is eval'd; there is no access to
 * the filesystem, network or process. Inputs are length-limited. */

export type Cell = string | number | null;
export type Row = Record<string, Cell>;
export type Table = { name: string; columns: string[]; rows: Row[] };
export type Result = { kind: "table"; columns: string[]; rows: Cell[][]; total: number; note?: string } | { kind: "text"; text: string };

const MAX_ROWS = 200;
export class AnalysisError extends Error {}
function fail(m: string): never {
  throw new AnalysisError(m);
}

/* ============================ SQL ============================ */
function splitTop(s: string, delim: string | RegExp): string[] {
  const out: string[] = [];
  let depth = 0, q: string | null = null, last = 0;
  const isRe = delim instanceof RegExp;
  const re = isRe ? new RegExp("^(?:" + (delim as RegExp).source + ")", "i") : null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0) {
      if (!isRe && c === delim) { out.push(s.slice(last, i)); last = i + 1; }
      else if (re) {
        const m = re.exec(s.slice(i));
        if (m && (i === 0 || /\s/.test(s[i - 1]))) { out.push(s.slice(last, i)); last = i + m[0].length; i = last - 1; }
      }
    }
  }
  out.push(s.slice(last));
  return out.map((x) => x.trim()).filter((x) => x.length);
}

function literal(tok: string): Cell {
  const t = tok.trim();
  let m = /^'(.*)'$/s.exec(t) || /^"(.*)"$/s.exec(t);
  if (m) return m[1];
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^null$/i.test(t)) return null;
  return fail(`Cannot read value: ${tok}`);
}

type Pred = (r: Row) => boolean;
function condition(src: string, cols: string[]): Pred {
  let t = src.trim();
  while (t.startsWith("(") && t.endsWith(")")) t = t.slice(1, -1).trim();
  const col = (c: string) => {
    const k = cols.find((x) => x.toLowerCase() === c.toLowerCase());
    return k ?? fail(`no such column: ${c}`);
  };
  let m = /^(\w+)\s+is\s+(not\s+)?null$/i.exec(t);
  if (m) { const c = col(m[1]); const neg = !!m[2]; return (r) => (r[c] === null) !== neg; }
  m = /^(\w+)\s+(not\s+)?like\s+(.+)$/i.exec(t);
  if (m) {
    const c = col(m[1]); const neg = !!m[2]; const pat = String(literal(m[3]));
    const re = new RegExp("^" + pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
    return (r) => re.test(String(r[c] ?? "")) !== neg;
  }
  m = /^(\w+)\s+(not\s+)?in\s*\((.+)\)$/i.exec(t);
  if (m) {
    const c = col(m[1]); const neg = !!m[2];
    const vals = splitTop(m[3], ",").map(literal).map((v) => (typeof v === "string" ? v.toLowerCase() : v));
    return (r) => { const v = r[c]; return vals.includes(typeof v === "string" ? v.toLowerCase() : v) !== neg; };
  }
  m = /^(\w+)\s*(>=|<=|<>|!=|=|>|<)\s*(.+)$/.exec(t);
  if (m) {
    const c = col(m[1]); const op = m[2];
    const rhsTok = m[3].trim();
    const rhsIsCol = /^\w+$/.test(rhsTok) && cols.some((x) => x.toLowerCase() === rhsTok.toLowerCase()) && !/^\d/.test(rhsTok);
    const lit = rhsIsCol ? null : literal(rhsTok);
    const rc = rhsIsCol ? col(rhsTok) : "";
    return (r) => {
      let a = r[c]; let b = rhsIsCol ? r[rc] : lit;
      if (a === null || b === null) return op === "!=" || op === "<>" ? a !== b : op === "=" ? a === b : false;
      if (typeof a === "string" && typeof b === "string") { a = a.toLowerCase(); b = b.toLowerCase(); }
      if (typeof a !== typeof b) { a = String(a); b = String(b); }
      switch (op) {
        case "=": return a === b;
        case "!=": case "<>": return a !== b;
        case ">": return a > b;
        case "<": return a < b;
        case ">=": return a >= b;
        default: return a <= b;
      }
    };
  }
  return fail(`Cannot understand condition: ${src}`);
}

function wherePred(src: string, cols: string[]): Pred {
  const fixed = src.replace(/(\w+)\s+between\s+(.+?)\s+and\s+(.+?)(?=\s+and\s+|\s+or\s+|$)/gi, "$1 >= $2 and $1 <= $3");
  const ors = splitTop(fixed, /or\s/).map((o) => splitTop(o, /and\s/).map((a) => condition(a, cols)));
  return (r) => ors.some((ands) => ands.every((p) => p(r)));
}

function parseClauses(sql: string) {
  const s = sql.replace(/\s+/g, " ").trim().replace(/;$/, "");
  const low = s.toLowerCase();
  const kws = ["select", "from", "where", "group by", "order by", "limit", "having", "join"];
  const pos: { kw: string; i: number }[] = [];
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"') { q = ch; continue; }
    if (i > 0 && /\w/.test(s[i - 1])) continue;
    for (const k of kws) {
      if (low.startsWith(k, i) && !/\w/.test(low[i + k.length] ?? " ")) { pos.push({ kw: k, i }); i += k.length - 1; break; }
    }
  }
  if (!pos.length || pos[0].kw !== "select") fail("Query must start with SELECT");
  const out: Record<string, string> = {};
  pos.forEach((p, idx) => {
    const end = idx + 1 < pos.length ? pos[idx + 1].i : s.length;
    if (out[p.kw] !== undefined) fail(`Duplicate ${p.kw.toUpperCase()} clause`);
    out[p.kw] = s.slice(p.i + p.kw.length, end).trim();
  });
  if (out["having"] !== undefined || out["join"] !== undefined) fail("HAVING and JOIN are not available in this workspace. Use a subquery-free approach: filter, then group.");
  if (!out["from"]) fail("Missing FROM clause");
  return out;
}

type SelItem = { label: string; agg?: string; col?: string; distinct?: boolean; star?: boolean };
function parseSelect(src: string, cols: string[]): SelItem[] {
  const col = (c: string) => cols.find((x) => x.toLowerCase() === c.toLowerCase()) ?? fail(`no such column: ${c}`);
  return splitTop(src, ",").map((raw) => {
    let alias: string | undefined;
    let body = raw;
    const am = /^(.*?)\s+as\s+(\w+)$/i.exec(raw);
    if (am) { body = am[1]; alias = am[2]; }
    if (body === "*") return { label: "*", star: true };
    const ag = /^(count|sum|avg|min|max)\s*\(\s*(distinct\s+)?(\*|\w+)\s*\)$/i.exec(body);
    if (ag) {
      const fn = ag[1].toLowerCase();
      const c = ag[3] === "*" ? "*" : col(ag[3]);
      if (c === "*" && fn !== "count") fail(`${fn.toUpperCase()}(*) is not valid`);
      return { label: alias ?? `${fn}(${c === "*" ? "*" : c})`, agg: fn, col: c, distinct: !!ag[2] };
    }
    if (!/^\w+$/.test(body)) fail(`Cannot understand select item: ${raw}`);
    const c = col(body);
    return { label: alias ?? c, col: c };
  });
}

function cmpCells(a: Cell, b: Cell) {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function runSQL(sql: string, tbl: Table): Result {
  if (sql.length > 1500) fail("Query too long");
  const cl = parseClauses(sql);
  const from = cl["from"].replace(/\s+/g, "");
  if (from.toLowerCase() !== tbl.name.toLowerCase()) fail(`no such table: ${cl["from"]}. Available here: ${tbl.name}`);
  const cols = tbl.columns;
  const items = parseSelect(cl["select"], cols);
  let rows = tbl.rows;
  if (cl["where"]) { const p = wherePred(cl["where"], cols); rows = rows.filter(p); }
  const hasAgg = items.some((i) => i.agg);
  const groupCols = cl["group by"]
    ? splitTop(cl["group by"], ",").map((g) => {
        if (/^\d+$/.test(g)) { const it = items[Number(g) - 1]; if (!it?.col) fail("bad GROUP BY position"); return it!.col!; }
        const hit = items.find((i) => i.label.toLowerCase() === g.toLowerCase() && i.col);
        if (hit) return hit.col!;
        return cols.find((x) => x.toLowerCase() === g.toLowerCase()) ?? fail(`no such column: ${g}`);
      })
    : [];
  const order = cl["order by"]
    ? splitTop(cl["order by"], ",").map((o) => {
        const m = /^(.*?)(?:\s+(asc|desc))?$/i.exec(o)!;
        return { key: m[1].trim().toLowerCase().replace(/\s+/g, ""), desc: (m[2] ?? "").toLowerCase() === "desc" };
      })
    : [];
  const limit = cl["limit"] !== undefined ? Number(cl["limit"]) : undefined;
  if (limit !== undefined && !(limit >= 0)) fail("LIMIT must be a number");

  let outCols: string[];
  let out: Cell[][];
  if (hasAgg || groupCols.length) {
    for (const it of items) if (it.star) fail("Cannot use * with aggregates");
    for (const it of items) if (!it.agg && !groupCols.includes(it.col!)) fail(`Column ${it.col} must appear in GROUP BY or inside an aggregate`);
    const groups = new Map<string, Row[]>();
    if (!groupCols.length) groups.set("", rows);
    else for (const r of rows) { const k = groupCols.map((g) => String(r[g])).join("\u0001"); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
    outCols = items.map((i) => i.label);
    out = [...groups.values()].map((g) =>
      items.map((it) => {
        if (!it.agg) return g[0]?.[it.col!] ?? null;
        if (it.agg === "count") {
          if (it.col === "*") return g.length;
          const v = g.map((r) => r[it.col!]).filter((x) => x !== null);
          return it.distinct ? new Set(v).size : v.length;
        }
        let v = g.map((r) => r[it.col!]).filter((x) => x !== null);
        if (it.distinct) v = [...new Set(v)];
        if (it.agg === "min" || it.agg === "max") {
          if (!v.length) return null;
          return v.reduce((a, b) => ((cmpCells(a, b) <= 0) === (it.agg === "min") ? a : b));
        }
        const nums = v.map(Number).filter((n) => !Number.isNaN(n));
        if (!nums.length) return null;
        const sum = nums.reduce((a, b) => a + b, 0);
        return it.agg === "sum" ? sum : Math.round((sum / nums.length) * 100) / 100;
      }),
    );
    if (order.length) {
      const idxs = order.map((o) => {
        const i = outCols.findIndex((c) => c.toLowerCase().replace(/\s+/g, "") === o.key);
        return i >= 0 ? i : fail(`Cannot ORDER BY ${o.key}: use a selected column or alias`);
      });
      out.sort((a, b) => { for (let k = 0; k < idxs.length; k++) { const c = cmpCells(a[idxs[k]], b[idxs[k]]); if (c) return order[k].desc ? -c : c; } return 0; });
    }
  } else {
    if (order.length) {
      const keys = order.map((o) => cols.find((c) => c.toLowerCase() === o.key) ?? items.find((i) => i.label.toLowerCase() === o.key)?.col ?? fail(`no such column: ${o.key}`));
      rows = rows.slice().sort((a, b) => { for (let k = 0; k < keys.length; k++) { const c = cmpCells(a[keys[k]], b[keys[k]]); if (c) return order[k].desc ? -c : c; } return 0; });
    }
    const sel = items.flatMap((i) => (i.star ? cols.map((c) => ({ label: c, col: c })) : [i]));
    outCols = sel.map((i) => i.label);
    out = rows.map((r) => sel.map((i) => r[i.col!]));
  }
  if (limit !== undefined) out = out.slice(0, limit);
  return table(outCols, out);
}

function table(columns: string[], rows: Cell[][]): Result {
  return { kind: "table", columns, rows: rows.slice(0, MAX_ROWS), total: rows.length, note: rows.length > MAX_ROWS ? `Showing first ${MAX_ROWS} of ${rows.length} rows. Add LIMIT or filters to narrow the result.` : undefined };
}

/* ============================ pandas-lite ============================ */
type Tok = { t: "id" | "num" | "str" | "op"; v: string };
function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /\w/.test(src[j])) j++; toks.push({ t: "id", v: src.slice(i, j) }); i = j; continue; }
    if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] ?? ""))) { let j = i; while (j < src.length && /[\d._]/.test(src[j])) j++; toks.push({ t: "num", v: src.slice(i, j).replace(/_/g, "") }); i = j; continue; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < src.length && src[j] !== c) j++; if (j >= src.length) fail("Unterminated string"); toks.push({ t: "str", v: src.slice(i + 1, j) }); i = j + 1; continue; }
    const two = src.slice(i, i + 2);
    if (["==", "!=", ">=", "<="].includes(two)) { toks.push({ t: "op", v: two }); i += 2; continue; }
    if ("()[].,=&|~<>:-+*".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    fail(`Unexpected character: ${c}`);
  }
  return toks;
}

type Df = { t: "df"; cols: string[]; rows: Row[] };
type Series = { t: "series"; name: string; values: Cell[]; labels?: Cell[][]; labelNames?: string[] };
type Val =
  | Df | Series
  | { t: "mask"; b: boolean[] }
  | { t: "scalar"; v: Cell | string }
  | { t: "list"; items: Cell[] }
  | { t: "gb"; df: Df; keys: string[]; col?: string }
  | { t: "str"; s: Series };

class Parser {
  p = 0;
  constructor(private toks: Tok[], private env: Record<string, Val>) {}
  peek(o = 0) { return this.toks[this.p + o]; }
  isOp(v: string, o = 0) { const t = this.peek(o); return !!t && t.t === "op" && t.v === v; }
  eat(v: string) { if (!this.isOp(v)) fail(`Expected '${v}'`); this.p++; }
  done() { return this.p >= this.toks.length; }

  parseExpr(): Val { return this.or(); }
  or(): Val { let l = this.and(); while (this.isOp("|")) { this.p++; const r = this.and(); l = mask(l, r, (a, b) => a || b); } return l; }
  and(): Val { let l = this.cmp(); while (this.isOp("&")) { this.p++; const r = this.cmp(); l = mask(l, r, (a, b) => a && b); } return l; }
  cmp(): Val {
    const l = this.unary();
    const t = this.peek();
    if (t && t.t === "op" && ["==", "!=", ">=", "<=", ">", "<"].includes(t.v)) {
      this.p++;
      const r = this.unary();
      return compare(l, t.v, r);
    }
    return l;
  }
  unary(): Val {
    if (this.isOp("~")) { this.p++; const v = this.unary(); if (v.t !== "mask") fail("~ needs a boolean mask"); return { t: "mask", b: v.b.map((x) => !x) }; }
    if (this.isOp("-")) { this.p++; const v = this.unary(); if (v.t !== "scalar" || typeof v.v !== "number") fail("Bad negative"); return { t: "scalar", v: -v.v }; }
    return this.postfix();
  }
  args(): { pos: Val[]; kw: Record<string, Val> } {
    const pos: Val[] = []; const kw: Record<string, Val> = {};
    this.eat("(");
    while (!this.isOp(")")) {
      if (this.peek()?.t === "id" && this.isOp("=", 1)) { const k = this.peek().v; this.p += 2; kw[k] = this.parseExpr(); }
      else pos.push(this.parseExpr());
      if (this.isOp(",")) this.p++; else break;
    }
    this.eat(")");
    return { pos, kw };
  }
  primary(): Val {
    const t = this.peek();
    if (!t) return fail("Unexpected end of expression");
    if (t.t === "num") { this.p++; return { t: "scalar", v: Number(t.v) }; }
    if (t.t === "str") { this.p++; return { t: "scalar", v: t.v }; }
    if (t.t === "id") {
      this.p++;
      if (t.v === "True" || t.v === "False") return { t: "scalar", v: t.v === "True" ? 1 : 0 };
      if (t.v === "None") return { t: "scalar", v: null };
      if (["len", "round", "sorted", "list", "set", "int", "float", "str", "sum", "max", "min", "abs"].includes(t.v) && this.isOp("(")) {
        const a = this.args();
        return builtin(t.v, a.pos);
      }
      const v = this.env[t.v];
      if (!v) fail(`NameError: name '${t.v}' is not defined`);
      return v;
    }
    if (this.isOp("(")) { this.p++; const v = this.parseExpr(); this.eat(")"); return v; }
    if (this.isOp("[")) {
      this.p++; const items: Cell[] = [];
      while (!this.isOp("]")) { const v = this.parseExpr(); if (v.t !== "scalar") fail("Lists may only hold values"); items.push(v.v as Cell); if (this.isOp(",")) this.p++; else break; }
      this.eat("]"); return { t: "list", items };
    }
    return fail(`Unexpected token: ${t.v}`);
  }
  postfix(): Val {
    let v = this.primary();
    for (;;) {
      if (this.isOp(".")) {
        this.p++;
        const name = this.peek(); if (!name || name.t !== "id") fail("Expected a name after '.'");
        this.p++;
        if (this.isOp("(")) { const a = this.args(); v = method(v, name.v, a.pos, a.kw); }
        else v = attr(v, name.v);
      } else if (this.isOp("[")) {
        this.p++;
        const idx = this.parseExpr();
        if (this.isOp(":")) fail("Slicing is not supported; use .head() or .tail()");
        this.eat("]");
        v = index(v, idx);
      } else break;
    }
    return v;
  }
}

const scalar = (v: Val): Cell => (v.t === "scalar" ? (v.v as Cell) : fail("Expected a single value"));
function mask(a: Val, b: Val, f: (x: boolean, y: boolean) => boolean): Val {
  if (a.t !== "mask" || b.t !== "mask") fail("Combine conditions with parentheses, e.g. (df.a > 1) & (df.b < 2)");
  return { t: "mask", b: a.b.map((x, i) => f(x, b.b[i])) };
}
function compare(l: Val, op: string, r: Val): Val {
  const f = (a: Cell, b: Cell) => {
    if (a === null || b === null) return op === "!=" ? a !== b : op === "==" ? a === b : false;
    let x: Cell = a, y: Cell = b;
    if (typeof x === "string" && typeof y === "string") { x = x.toLowerCase(); y = y.toLowerCase(); }
    if (typeof x !== typeof y) { x = String(x); y = String(y); }
    switch (op) { case "==": return x === y; case "!=": return x !== y; case ">": return x > y; case "<": return x < y; case ">=": return x >= y; default: return x <= y; }
  };
  if (l.t === "series") return { t: "mask", b: l.values.map((v) => f(v, scalar(r))) };
  if (l.t === "scalar" && r.t === "scalar") return { t: "scalar", v: f(l.v as Cell, r.v as Cell) ? 1 : 0 };
  return fail("Comparison needs a column on the left, e.g. df.amount_inr >= 500000");
}
function builtin(name: string, a: Val[]): Val {
  const x = a[0];
  switch (name) {
    case "len": if (x.t === "df") return { t: "scalar", v: x.rows.length }; if (x.t === "series") return { t: "scalar", v: x.values.length }; if (x.t === "list") return { t: "scalar", v: x.items.length }; return fail("len() needs a table, column or list");
    case "round": return { t: "scalar", v: Math.round(Number(scalar(x)) * 10 ** Number(a[1] ? scalar(a[1]) : 0)) / 10 ** Number(a[1] ? scalar(a[1]) : 0) };
    case "int": return { t: "scalar", v: Math.trunc(Number(scalar(x))) };
    case "float": return { t: "scalar", v: Number(scalar(x)) };
    case "str": return { t: "scalar", v: String(scalar(x)) };
    case "abs": return { t: "scalar", v: Math.abs(Number(scalar(x))) };
    case "sorted": case "list": case "set": {
      const items = x.t === "series" ? x.values : x.t === "list" ? x.items : fail(`${name}() needs a column or list`);
      let out = name === "set" ? [...new Set(items)] : items.slice();
      if (name !== "list") out = out.sort(cmpCells);
      return { t: "list", items: out };
    }
    case "sum": case "max": case "min": {
      const items = x.t === "series" ? x.values : x.t === "list" ? x.items : fail(`${name}() needs a column or list`);
      return aggSeries({ t: "series", name: "", values: items }, name);
    }
  }
  return fail(`Unsupported function ${name}`);
}
function attr(v: Val, name: string): Val {
  if (v.t === "df") {
    if (name === "shape") return { t: "scalar", v: `(${v.rows.length}, ${v.cols.length})` };
    if (name === "columns") return { t: "list", items: v.cols };
    if (name === "size") return { t: "scalar", v: v.rows.length * v.cols.length };
    const c = v.cols.find((x) => x === name);
    if (c) return { t: "series", name: c, values: v.rows.map((r) => r[c]) };
    return fail(`AttributeError: table has no column '${name}'`);
  }
  if (v.t === "series" && name === "str") return { t: "str", s: v };
  if (v.t === "series" && name === "size") return { t: "scalar", v: v.values.length };
  if (v.t === "gb") { const c = v.df.cols.find((x) => x === name); if (c) return { ...v, col: c }; }
  return fail(`AttributeError: '${name}'`);
}
function index(v: Val, idx: Val): Val {
  if (v.t === "df") {
    if (idx.t === "mask") return { t: "df", cols: v.cols, rows: v.rows.filter((_, i) => (idx as { b: boolean[] }).b[i]) };
    if (idx.t === "scalar") { const c = String(idx.v); if (!v.cols.includes(c)) fail(`KeyError: '${c}'`); return { t: "series", name: c, values: v.rows.map((r) => r[c]) }; }
    if (idx.t === "list") { const cs = idx.items.map(String); for (const c of cs) if (!v.cols.includes(c)) fail(`KeyError: '${c}'`); return { t: "df", cols: cs, rows: v.rows.map((r) => Object.fromEntries(cs.map((c) => [c, r[c]]))) }; }
  }
  if (v.t === "gb" && idx.t === "scalar") { const c = String(idx.v); if (!v.df.cols.includes(c)) fail(`KeyError: '${c}'`); return { ...v, col: c }; }
  if (v.t === "scalar" && typeof v.v === "string" && v.v.startsWith("(") && idx.t === "scalar") { const parts = v.v.slice(1, -1).split(", "); return { t: "scalar", v: Number(parts[Number(idx.v)]) }; }
  if (v.t === "list" && idx.t === "scalar") return { t: "scalar", v: v.items[Number(idx.v)] ?? null };
  if (v.t === "series" && idx.t === "scalar") return { t: "scalar", v: v.values[Number(idx.v)] ?? null };
  return fail("Unsupported indexing expression");
}
function aggSeries(s: Series, fn: string): Val {
  const v = s.values.filter((x) => x !== null);
  switch (fn) {
    case "count": return { t: "scalar", v: v.length };
    case "size": return { t: "scalar", v: s.values.length };
    case "nunique": return { t: "scalar", v: new Set(v).size };
    case "sum": return { t: "scalar", v: v.map(Number).reduce((a, b) => a + (Number.isNaN(b) ? 0 : b), 0) };
    case "mean": return { t: "scalar", v: v.length ? Math.round((v.map(Number).reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null };
    case "max": return { t: "scalar", v: v.length ? v.reduce((a, b) => (cmpCells(a, b) >= 0 ? a : b)) : null };
    case "min": return { t: "scalar", v: v.length ? v.reduce((a, b) => (cmpCells(a, b) <= 0 ? a : b)) : null };
  }
  return fail(`Unsupported aggregate ${fn}`);
}
function strArg(v: Val | undefined, what: string) { return v ? String(scalar(v)) : fail(`${what} is required`); }
function sortDf(d: Df, by: string, asc: boolean): Df {
  if (!d.cols.includes(by)) fail(`KeyError: '${by}'`);
  return { ...d, rows: d.rows.slice().sort((a, b) => (asc ? 1 : -1) * cmpCells(a[by], b[by])) };
}
function method(v: Val, name: string, pos: Val[], kw: Record<string, Val>): Val {
  const n = (x?: Val, d = 5) => (x ? Number(scalar(x)) : d);
  if (v.t === "df") {
    switch (name) {
      case "head": return { ...v, rows: v.rows.slice(0, n(pos[0])) };
      case "tail": return { ...v, rows: v.rows.slice(-n(pos[0])) };
      case "copy": case "reset_index": case "dropna": return v;
      case "describe": {
        const nums = v.cols.filter((c) => v.rows.some((r) => typeof r[c] === "number"));
        const val = (c: string, st: string) => (aggSeries({ t: "series", name: c, values: v.rows.map((r) => r[c]) }, st) as { v: Cell }).v;
        return { t: "df", cols: ["stat", ...nums], rows: ["count", "mean", "min", "max"].map((st) => ({ stat: st, ...Object.fromEntries(nums.map((c) => [c, val(c, st)])) })) };
      }
      case "info": return { t: "scalar", v: `DataFrame: ${v.rows.length} rows, ${v.cols.length} columns\n` + v.cols.map((c) => `  ${c}: ${v.rows.some((r) => typeof r[c] === "number") ? "number" : "text"}`).join("\n") };
      case "groupby": {
        const k = pos[0]; const keys = k.t === "list" ? k.items.map(String) : [strArg(k, "groupby column")];
        for (const c of keys) if (!v.cols.includes(c)) fail(`KeyError: '${c}'`);
        return { t: "gb", df: v, keys };
      }
      case "sort_values": {
        const by = pos[0] ? strArg(pos[0], "column") : strArg(kw["by"], "by");
        const asc = kw["ascending"] ? Boolean(scalar(kw["ascending"])) : pos[1] ? Boolean(scalar(pos[1])) : true;
        return sortDf(v, by, asc);
      }
      case "nlargest": case "nsmallest": { const d = sortDf(v, strArg(pos[1], "column"), name === "nsmallest"); return { ...d, rows: d.rows.slice(0, n(pos[0])) }; }
      case "drop_duplicates": { const seen = new Set<string>(); return { ...v, rows: v.rows.filter((r) => { const k = JSON.stringify(v.cols.map((c) => r[c])); if (seen.has(k)) return false; seen.add(k); return true; }) }; }
      case "query": {
        const q = strArg(pos[0], "query string").replace(/==/g, "=").replace(/\band\b/g, " and ").replace(/&/g, " and ");
        return { ...v, rows: v.rows.filter(wherePred(q, v.cols)) };
      }
      case "nunique": return { t: "scalar", v: v.rows.length };
      case "count": return { t: "series", name: "count", values: v.cols.map((c) => v.rows.filter((r) => r[c] !== null).length), labels: v.cols.map((c) => [c]), labelNames: [""] };
    }
  }
  if (v.t === "series") {
    switch (name) {
      case "sum": case "mean": case "max": case "min": case "count": case "nunique": case "size": return aggSeries(v, name);
      case "unique": return { t: "list", items: [...new Set(v.values)] };
      case "head": return { ...v, values: v.values.slice(0, n(pos[0])), labels: v.labels?.slice(0, n(pos[0])) };
      case "tolist": return { t: "list", items: v.values };
      case "reset_index": return v;
      case "isin": { const l = pos[0]; if (l.t !== "list") fail("isin() needs a list"); const set = new Set((l as { items: Cell[] }).items.map((x) => (typeof x === "string" ? x.toLowerCase() : x))); return { t: "mask", b: v.values.map((x) => set.has(typeof x === "string" ? x.toLowerCase() : x)) }; }
      case "isnull": return { t: "mask", b: v.values.map((x) => x === null) };
      case "notnull": return { t: "mask", b: v.values.map((x) => x !== null) };
      case "value_counts": {
        const m = new Map<string, { k: Cell; c: number }>();
        for (const x of v.values) { const key = String(x); const e = m.get(key); if (e) e.c++; else m.set(key, { k: x, c: 1 }); }
        const arr = [...m.values()].sort((a, b) => b.c - a.c || cmpCells(a.k, b.k));
        return { t: "series", name: "count", values: arr.map((a) => a.c), labels: arr.map((a) => [a.k]), labelNames: [v.name] };
      }
      case "sort_values": {
        const asc = kw["ascending"] ? Boolean(scalar(kw["ascending"])) : true;
        const idx = v.values.map((x, i) => i).sort((a, b) => (asc ? 1 : -1) * cmpCells(v.values[a], v.values[b]));
        return { ...v, values: idx.map((i) => v.values[i]), labels: v.labels ? idx.map((i) => v.labels![i]) : undefined };
      }
      case "nlargest": case "nsmallest": {
        const idx = v.values.map((x, i) => i).sort((a, b) => (name === "nlargest" ? -1 : 1) * cmpCells(v.values[a], v.values[b])).slice(0, n(pos[0]));
        return { ...v, values: idx.map((i) => v.values[i]), labels: v.labels ? idx.map((i) => v.labels![i]) : undefined, labelNames: v.labelNames };
      }
    }
  }
  if (v.t === "str" && ["contains", "startswith", "endswith"].includes(name)) {
    const pat = strArg(pos[0], "pattern").toLowerCase();
    return { t: "mask", b: v.s.values.map((x) => { const s = String(x ?? "").toLowerCase(); return name === "contains" ? s.includes(pat) : name === "startswith" ? s.startsWith(pat) : s.endsWith(pat); }) };
  }
  if (v.t === "gb") {
    const fns = ["sum", "count", "mean", "max", "min", "size", "nunique"];
    const groups = new Map<string, Row[]>();
    for (const r of v.df.rows) { const k = v.keys.map((c) => String(r[c])).join("\u0001"); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
    const entries = [...groups.values()];
    const labels = entries.map((g) => v.keys.map((k) => g[0][k]));
    if (name === "size") return { t: "series", name: "size", values: entries.map((g) => g.length), labels, labelNames: v.keys };
    if (name === "agg" || name === "aggregate") {
      if (!v.col) fail("Select a column first, e.g. df.groupby('account_id')['amount_inr'].agg(['sum','count'])");
      const l = pos[0]; const list = l.t === "list" ? l.items.map(String) : [strArg(l, "function")];
      const cols = [...v.keys, ...list];
      return { t: "df", cols, rows: entries.map((g, i) => ({ ...Object.fromEntries(v.keys.map((k, j) => [k, labels[i][j]])), ...Object.fromEntries(list.map((f) => [f, (aggSeries({ t: "series", name: v.col!, values: g.map((r) => r[v.col!]) }, f) as { v: Cell }).v])) })) };
    }
    if (fns.includes(name)) {
      if (v.col) return { t: "series", name: v.col, values: entries.map((g) => (aggSeries({ t: "series", name: v.col!, values: g.map((r) => r[v.col!]) }, name) as { v: Cell }).v), labels, labelNames: v.keys };
      const nums = v.df.cols.filter((c) => !v.keys.includes(c) && v.df.rows.some((r) => typeof r[c] === "number"));
      return { t: "df", cols: [...v.keys, ...nums], rows: entries.map((g, i) => ({ ...Object.fromEntries(v.keys.map((k, j) => [k, labels[i][j]])), ...Object.fromEntries(nums.map((c) => [c, (aggSeries({ t: "series", name: c, values: g.map((r) => r[c]) }, name) as { v: Cell }).v])) })) };
    }
  }
  return fail(`AttributeError: unsupported method .${name}()`);
}

function show(v: Val): Result {
  switch (v.t) {
    case "df": return table(v.cols, v.rows.map((r) => v.cols.map((c) => r[c])));
    case "series": {
      const names = v.labelNames ?? ["index"];
      const rows = v.values.map((x, i) => [...(v.labels ? v.labels[i] : [i]), x]);
      return table([...names, v.name || "value"], rows);
    }
    case "scalar": return { kind: "text", text: String(v.v) };
    case "list": return { kind: "text", text: "[" + v.items.map((x) => (typeof x === "string" ? `'${x}'` : String(x))).join(", ") + "]" };
    case "mask": return { kind: "text", text: `boolean mask (${v.b.filter(Boolean).length} True of ${v.b.length})` };
    case "gb": return { kind: "text", text: "<GroupBy object> - add an aggregate such as .sum(), .count() or .size()" };
    default: return { kind: "text", text: "<object>" };
  }
}

export function runPython(code: string, tables: Table[], primary: Table): Result[] {
  if (code.length > 2500) fail("Cell too long");
  const env: Record<string, Val> = {};
  const toDf = (t: Table): Df => ({ t: "df", cols: t.columns, rows: t.rows });
  env["df"] = toDf(primary);
  for (const t of tables) env[t.name] = toDf(t);
  /* join physical lines into logical statements while brackets are open, as Python does */
  const lines: string[] = [];
  let buf = "", depth = 0;
  for (const raw of code.split(/\r?\n/)) {
    const l = raw.replace(/#.*$/, "").trim();
    if (!l && !depth) continue;
    buf = buf ? `${buf} ${l}` : l;
    let q: string | null = null;
    for (const ch of l) {
      if (q) { if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') q = ch;
      else if ("([{".includes(ch)) depth++;
      else if (")]}".includes(ch)) depth = Math.max(0, depth - 1);
    }
    if (!depth) { if (buf.trim()) lines.push(buf.trim()); buf = ""; }
  }
  if (buf.trim()) lines.push(buf.trim());
  if (lines.length > 25) fail("Too many lines in one cell");
  const out: Result[] = [];
  lines.forEach((line, idx) => {
    if (/^(import|from)\s/.test(line)) return;
    if (/^\w+\s*=\s*pd\.read_(csv|sql)/.test(line)) return;
    if (/^plt\./.test(line)) { out.push({ kind: "text", text: "(Charts render in the Charts tab of this workspace.)" }); return; }
    const am = /^([A-Za-z_]\w*)\s*=(?!=)\s*(.+)$/.exec(line);
    const exprSrc = am ? am[2] : line;
    const pm = /^print\s*\((.*)\)$/.exec(exprSrc);
    const toks = tokenize(pm ? pm[1] : exprSrc);
    const parser = new Parser(toks, env);
    const val = parser.parseExpr();
    if (!parser.done()) fail(`Unexpected token near '${parser.peek().v}'`);
    if (am) { env[am[1]] = val; return; }
    if (pm || idx === lines.length - 1) out.push(show(val));
  });
  if (!out.length) out.push({ kind: "text", text: "(no output - end the cell with an expression or print(...))" });
  return out;
}
