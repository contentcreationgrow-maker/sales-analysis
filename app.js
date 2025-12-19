/* SuperStore Interactive Dashboard
   - Client-side CSV parsing (PapaParse)
   - Interactive charts (Plotly)
   - Filters + insight engine
   - Exports: filtered CSV
*/

const $ = (id) => document.getElementById(id);

const els = {
  fileInput: $("fileInput"),
  statusText: $("statusText"),
  dataMeta: $("dataMeta"),
  kpiRow: $("kpiRow"),
  insights: $("insights"),

  btnReset: $("btnReset"),
  btnExport: $("btnExport"),
  btnTheme: $("btnTheme"),
  btnHelp: $("btnHelp"),
  helpModal: $("helpModal"),
  btnCloseHelp: $("btnCloseHelp"),

  fYear: $("fYear"),
  fRegion: $("fRegion"),
  fCategory: $("fCategory"),
  fSubCategory: $("fSubCategory"),
  fSegment: $("fSegment"),
  fShipMode: $("fShipMode"),
  fPaymentMode: $("fPaymentMode"),
  fReturnedOnly: $("fReturnedOnly"),
  fLossOnly: $("fLossOnly"),

  chMonthlySalesProfit: $("chMonthlySalesProfit"),
  chMonthlyMargin: $("chMonthlyMargin"),
  chCategoryMix: $("chCategoryMix"),
  chSubcatProfit: $("chSubcatProfit"),
  chRegionMarginReturns: $("chRegionMarginReturns"),
  chStateChoropleth: $("chStateChoropleth"),
  chDiscountProfit: $("chDiscountProfit"),
  chShipLead: $("chShipLead"),

  tblTopProducts: $("tblTopProducts"),
  tblLossProducts: $("tblLossProducts"),
  tblStates: $("tblStates"),
};

const state = {
  raw: [],
  filtered: [],
  columns: new Set(),
  meta: {
    rows: 0,
    dateMin: null,
    dateMax: null,
  },
  theme: "dark",
};

// --- Utilities ---
function safeNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDateSmart(v) {
  // Accepts: 2019-01-01, 1/1/2019, 01-01-2019, "2019-01-01 00:00:00", etc.
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  // Try native parse first
  const d0 = new Date(s);
  if (!Number.isNaN(d0.getTime())) return d0;

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function fmtMoney(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function fmtMoney2(x) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(1)}%`;
}

function monthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function quarterKey(d) {
  const y = d.getFullYear();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${y}Q${q}`;
}

function uniqSorted(arr) {
  return [...new Set(arr.filter((x) => x !== null && x !== undefined && String(x).trim() !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function selectedValues(selectEl) {
  return [...selectEl.selectedOptions].map((o) => o.value);
}

function setSelectOptions(selectEl, values, { includeAllHint = false } = {}) {
  selectEl.innerHTML = "";
  const opts = values.map((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    return o;
  });
  opts.forEach((o) => selectEl.appendChild(o));
  if (includeAllHint && values.length === 0) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "—";
    selectEl.appendChild(o);
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function groupSum(rows, keyFn, valFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === null || k === undefined) continue;
    const v = valFn(r);
    if (!Number.isFinite(v)) continue;
    m.set(k, (m.get(k) || 0) + v);
  }
  return m;
}

function groupAgg(rows, keyFn, aggFnInit) {
  // returns Map(key -> accumulator object)
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === null || k === undefined) continue;
    if (!m.has(k)) m.set(k, aggFnInit());
    m.get(k).push(r);
  }
  return m;
}

function hasCol(...cands) {
  for (const c of cands) if (state.columns.has(c)) return true;
  return false;
}

// --- US State name -> abbreviation (for choropleth) ---
const US_STATE_ABBR = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
};

// --- CSV Loading ---
function setLoading(msg) {
  els.statusText.textContent = msg;
}

function enableUI(enabled) {
  els.btnReset.disabled = !enabled;
  els.btnExport.disabled = !enabled;
}

function normalizeRow(r) {
  // Keep original fields as strings + parse useful fields
  // Expected columns: Order Date, Ship Date, Sales, Profit, Discount, Quantity, Returns
  const out = { ...r };

  // Track columns
  Object.keys(r).forEach((k) => state.columns.add(k));

  // Dates
  const od = parseDateSmart(r["Order Date"] ?? r["OrderDate"] ?? r["order_date"]);
  const sd = parseDateSmart(r["Ship Date"] ?? r["ShipDate"] ?? r["ship_date"]);
  out.__orderDate = od;
  out.__shipDate = sd;

  // Numerics
  out.__sales = safeNum(r["Sales"]);
  out.__profit = safeNum(r["Profit"]);
  out.__discount = safeNum(r["Discount"]);
  out.__quantity = safeNum(r["Quantity"]);

  // Returns flag
  const rv = r["Returns"];
  if (rv === null || rv === undefined) {
    out.__returned = 0;
  } else {
    const s = String(rv).trim().toLowerCase();
    out.__returned = ["1", "yes", "y", "true", "returned"].includes(s) ? 1 : 0;
    const n = safeNum(rv);
    if (n !== null && n > 0) out.__returned = 1;
  }

  // Derivatives
  out.__year = od ? od.getFullYear() : null;
  out.__month = od ? monthKey(od) : null;
  out.__quarter = od ? quarterKey(od) : null;
  out.__shipLeadDays = (od && sd) ? Math.round((sd - od) / (1000 * 60 * 60 * 24)) : null;

  // Order value requires Order ID; otherwise fallback per row
  out.__orderId = r["Order ID"] ?? r["OrderID"] ?? r["order_id"] ?? null;

  return out;
}

function loadCSVFile(file) {
  state.raw = [];
  state.filtered = [];
  state.columns = new Set();
  state.meta = { rows: 0, dateMin: null, dateMax: null };

  setLoading("Parsing CSV…");
  enableUI(false);

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: (results) => {
      const rows = results.data || [];
      const norm = rows.map(normalizeRow).filter((r) => r.__orderDate && Number.isFinite(r.__sales) && Number.isFinite(r.__profit));

      state.raw = norm;
      state.meta.rows = norm.length;

      const dates = norm.map((r) => r.__orderDate.getTime());
      if (dates.length) {
        const minT = Math.min(...dates);
        const maxT = Math.max(...dates);
        state.meta.dateMin = new Date(minT);
        state.meta.dateMax = new Date(maxT);
      }

      setLoading(`Loaded ${state.meta.rows.toLocaleString()} rows. Building dashboard…`);

      buildFilterOptions();
      applyFiltersAndRender();
      enableUI(true);

      setLoading("Ready. Use filters or click charts to explore.");
      renderMeta();
    },
    error: (err) => {
      setLoading(`Error reading CSV: ${err?.message || err}`);
    },
  });
}

function renderMeta() {
  const dm = state.meta.dateMin ? state.meta.dateMin.toISOString().slice(0, 10) : "—";
  const dx = state.meta.dateMax ? state.meta.dateMax.toISOString().slice(0, 10) : "—";
  els.dataMeta.textContent = `Rows: ${state.meta.rows.toLocaleString()} • Range: ${dm} → ${dx}`;
}

// --- Filters ---
function buildFilterOptions() {
  const r = state.raw;

  const years = uniqSorted(r.map((x) => x.__year)).map(String);
  const regions = uniqSorted(r.map((x) => x["Region"]));
  const cats = uniqSorted(r.map((x) => x["Category"]));
  const subcats = uniqSorted(r.map((x) => x["Sub-Category"]));
  const segs = uniqSorted(r.map((x) => x["Segment"]));
  const ships = uniqSorted(r.map((x) => x["Ship Mode"]));
  const pays = uniqSorted(r.map((x) => x["Payment Mode"]));

  setSelectOptions(els.fYear, years);
  setSelectOptions(els.fRegion, regions);
  setSelectOptions(els.fCategory, cats);
  setSelectOptions(els.fSubCategory, subcats);
  setSelectOptions(els.fSegment, segs);
  setSelectOptions(els.fShipMode, ships);
  setSelectOptions(els.fPaymentMode, pays);
}

function applyFilters() {
  const years = new Set(selectedValues(els.fYear));
  const regions = new Set(selectedValues(els.fRegion));
  const cats = new Set(selectedValues(els.fCategory));
  const subcats = new Set(selectedValues(els.fSubCategory));
  const segs = new Set(selectedValues(els.fSegment));
  const ships = new Set(selectedValues(els.fShipMode));
  const pays = new Set(selectedValues(els.fPaymentMode));

  const returnedOnly = els.fReturnedOnly.checked;
  const lossOnly = els.fLossOnly.checked;

  const pass = (set, v) => (set.size === 0 ? true : set.has(String(v)));

  state.filtered = state.raw.filter((r) => {
    if (!pass(years, r.__year)) return false;
    if (regions.size && !regions.has(String(r["Region"]))) return false;
    if (cats.size && !cats.has(String(r["Category"]))) return false;
    if (subcats.size && !subcats.has(String(r["Sub-Category"]))) return false;
    if (segs.size && !segs.has(String(r["Segment"]))) return false;
    if (ships.size && !ships.has(String(r["Ship Mode"]))) return false;
    if (pays.size && !pays.has(String(r["Payment Mode"]))) return false;
    if (returnedOnly && r.__returned !== 1) return false;
    if (lossOnly && !(r.__profit < 0)) return false;
    return true;
  });
}

// --- KPI + Insights ---
function computeKPIs(rows) {
  const sales = rows.reduce((a, r) => a + (r.__sales || 0), 0);
  const profit = rows.reduce((a, r) => a + (r.__profit || 0), 0);
  const margin = sales ? (profit / sales) * 100 : NaN;

  const orderIds = rows.map((r) => r.__orderId).filter(Boolean);
  const uniqueOrders = new Set(orderIds);
  const orders = uniqueOrders.size ? uniqueOrders.size : rows.length;

  // AOV: mean order sales if Order ID exists
  let aov = NaN;
  if (uniqueOrders.size) {
    const orderSales = new Map();
    for (const r of rows) {
      const id = r.__orderId;
      if (!id) continue;
      orderSales.set(id, (orderSales.get(id) || 0) + (r.__sales || 0));
    }
    const vals = [...orderSales.values()];
    aov = vals.length ? vals.reduce((a, x) => a + x, 0) / vals.length : NaN;
  }

  const returnsRate = rows.length ? (rows.reduce((a, r) => a + (r.__returned || 0), 0) / rows.length) * 100 : NaN;

  // loss-making orders
  let lossOrdersPct = NaN;
  if (uniqueOrders.size) {
    const orderProfit = new Map();
    for (const r of rows) {
      const id = r.__orderId;
      if (!id) continue;
      orderProfit.set(id, (orderProfit.get(id) || 0) + (r.__profit || 0));
    }
    const profits = [...orderProfit.values()];
    const lossOrders = profits.filter((p) => p < 0).length;
    lossOrdersPct = profits.length ? (lossOrders / profits.length) * 100 : NaN;
  }

  // ship lead avg
  const leadVals = rows.map((r) => r.__shipLeadDays).filter((x) => Number.isFinite(x));
  const avgLead = leadVals.length ? leadVals.reduce((a, x) => a + x, 0) / leadVals.length : NaN;

  return { sales, profit, margin, orders, aov, returnsRate, lossOrdersPct, avgLead };
}

function renderKPIs(k) {
  const items = [
    { label: "Total Sales", value: fmtMoney(k.sales), hint: "Sum of Sales" },
    { label: "Total Profit", value: fmtMoney(k.profit), hint: "Sum of Profit" },
    { label: "Profit Margin", value: fmtPct(k.margin), hint: "Profit / Sales" },
    { label: "Orders", value: fmtMoney(k.orders), hint: "Unique Order ID" },
    { label: "Return Rate", value: fmtPct(k.returnsRate), hint: "Returned line-items" },
    { label: "AOV", value: fmtMoney(k.aov), hint: "Avg Order Value" },
  ];

  els.kpiRow.innerHTML = items
    .map(
      (x) => `
        <div class="kpi">
          <div class="kpiLabel">${escapeHtml(x.label)}</div>
          <div class="kpiValue">${escapeHtml(x.value)}</div>
          <div class="kpiHint">${escapeHtml(x.hint)}</div>
        </div>
      `
    )
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function insightEngine(rows) {
  const k = computeKPIs(rows);

  // Year-over-year margin change (if multiple years)
  const years = uniqSorted(rows.map((r) => r.__year));
  const yoy = [];
  if (years.length >= 2) {
    const byYear = new Map();
    for (const y of years) byYear.set(y, { sales: 0, profit: 0, rows: 0 });
    for (const r of rows) {
      const b = byYear.get(r.__year);
      b.sales += r.__sales || 0;
      b.profit += r.__profit || 0;
      b.rows += 1;
    }
    for (let i = 1; i < years.length; i++) {
      const y0 = years[i - 1], y1 = years[i];
      const a = byYear.get(y0), b = byYear.get(y1);
      const m0 = a.sales ? (a.profit / a.sales) * 100 : NaN;
      const m1 = b.sales ? (b.profit / b.sales) * 100 : NaN;
      const sGrowth = a.sales ? ((b.sales - a.sales) / a.sales) * 100 : NaN;
      yoy.push({ y0, y1, m0, m1, sGrowth, pGrowth: a.profit ? ((b.profit - a.profit) / a.profit) * 100 : NaN });
    }
  }

  // Lowest margin category
  let catWorst = null;
  if (hasCol("Category")) {
    const catAgg = new Map();
    for (const r of rows) {
      const c = r["Category"];
      if (!c) continue;
      if (!catAgg.has(c)) catAgg.set(c, { sales: 0, profit: 0 });
      const a = catAgg.get(c);
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
    }
    const list = [...catAgg.entries()].map(([c, a]) => ({
      c,
      sales: a.sales,
      profit: a.profit,
      margin: a.sales ? (a.profit / a.sales) * 100 : NaN,
    }));
    list.sort((x, y) => x.margin - y.margin);
    catWorst = list[0] || null;
  }

  // Worst sub-category by profit
  let subWorst = null;
  if (hasCol("Sub-Category")) {
    const subAgg = new Map();
    for (const r of rows) {
      const s = r["Sub-Category"];
      if (!s) continue;
      if (!subAgg.has(s)) subAgg.set(s, { sales: 0, profit: 0 });
      const a = subAgg.get(s);
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
    }
    const list = [...subAgg.entries()].map(([s, a]) => ({
      s,
      sales: a.sales,
      profit: a.profit,
      margin: a.sales ? (a.profit / a.sales) * 100 : NaN,
    }));
    list.sort((x, y) => x.profit - y.profit);
    subWorst = list[0] || null;
  }

  // Region with highest returns
  let regionReturns = null;
  if (hasCol("Region")) {
    const regAgg = new Map();
    for (const r of rows) {
      const g = r["Region"];
      if (!g) continue;
      if (!regAgg.has(g)) regAgg.set(g, { n: 0, ret: 0, sales: 0, profit: 0 });
      const a = regAgg.get(g);
      a.n += 1;
      a.ret += r.__returned || 0;
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
    }
    const list = [...regAgg.entries()].map(([g, a]) => ({
      g,
      returnRate: a.n ? (a.ret / a.n) * 100 : NaN,
      margin: a.sales ? (a.profit / a.sales) * 100 : NaN,
    }));
    list.sort((x, y) => (y.returnRate || 0) - (x.returnRate || 0));
    regionReturns = list[0] || null;
  }

  // Best / worst months by margin (top sales month too)
  const byMonth = new Map();
  for (const r of rows) {
    if (!r.__month) continue;
    if (!byMonth.has(r.__month)) byMonth.set(r.__month, { sales: 0, profit: 0 });
    const a = byMonth.get(r.__month);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
  }
  const monthList = [...byMonth.entries()].map(([m, a]) => ({
    m,
    sales: a.sales,
    profit: a.profit,
    margin: a.sales ? (a.profit / a.sales) * 100 : NaN,
  }));
  monthList.sort((x, y) => (y.sales || 0) - (x.sales || 0));
  const topSalesMonth = monthList[0] || null;

  const worstMarginMonth = [...monthList].sort((a, b) => (a.margin || 0) - (b.margin || 0))[0] || null;

  // Profit concentration (top 1% lines)
  const profits = rows.map((r) => r.__profit || 0).sort((a, b) => b - a);
  const totalProfit = profits.reduce((a, x) => a + x, 0);
  const top1n = Math.max(1, Math.floor(profits.length * 0.01));
  const top5n = Math.max(1, Math.floor(profits.length * 0.05));
  const top1share = totalProfit ? (profits.slice(0, top1n).reduce((a, x) => a + x, 0) / totalProfit) * 100 : NaN;
  const top5share = totalProfit ? (profits.slice(0, top5n).reduce((a, x) => a + x, 0) / totalProfit) * 100 : NaN;

  const insights = [];

  // Insight 1: headline economics
  insights.push(
    `<strong>Economics:</strong> Margin is <strong>${fmtPct(k.margin)}</strong> with total profit <strong>${fmtMoney(k.profit)}</strong> on sales <strong>${fmtMoney(k.sales)}</strong>.`
  );

  // Insight 2: YoY
  if (yoy.length) {
    const t = yoy[yoy.length - 1];
    const deltaM = Number.isFinite(t.m0) && Number.isFinite(t.m1) ? (t.m1 - t.m0) : NaN;
    insights.push(
      `<strong>YoY:</strong> ${t.y0} → ${t.y1}: Sales ${fmtPct(t.sGrowth)}; Profit ${fmtPct(t.pGrowth)}; Margin ${fmtPct(t.m0)} → ${fmtPct(t.m1)} (${Number.isFinite(deltaM) ? deltaM.toFixed(1) : "—"} pp).`
    );
  }

  // Insight 3: category drag
  if (catWorst) {
    insights.push(
      `<strong>Category drag:</strong> Lowest margin is <strong>${escapeHtml(catWorst.c)}</strong> at <strong>${fmtPct(catWorst.margin)}</strong>.`
    );
  }

  // Insight 4: subcategory culprit
  if (subWorst) {
    insights.push(
      `<strong>Loss driver:</strong> Worst sub-category is <strong>${escapeHtml(subWorst.s)}</strong> with profit <strong>${fmtMoney(subWorst.profit)}</strong> (margin ${fmtPct(subWorst.margin)}).`
    );
  }

  // Insight 5: returns hotspot
  if (regionReturns) {
    insights.push(
      `<strong>Returns hotspot:</strong> <strong>${escapeHtml(regionReturns.g)}</strong> shows the highest return rate at <strong>${fmtPct(regionReturns.returnRate)}</strong> (margin ${fmtPct(regionReturns.margin)}).`
    );
  }

  // Insight 6: top sales month but margin?
  if (topSalesMonth) {
    insights.push(
      `<strong>Seasonality:</strong> Peak sales month is <strong>${escapeHtml(topSalesMonth.m)}</strong> with sales <strong>${fmtMoney(topSalesMonth.sales)}</strong> and margin <strong>${fmtPct(topSalesMonth.margin)}</strong>.`
    );
  }

  // Insight 7: worst margin month
  if (worstMarginMonth) {
    insights.push(
      `<strong>Margin alert:</strong> Worst margin month is <strong>${escapeHtml(worstMarginMonth.m)}</strong> at <strong>${fmtPct(worstMarginMonth.margin)}</strong>.`
    );
  }

  // Insight 8: concentration
  if (Number.isFinite(top1share) && Number.isFinite(top5share)) {
    insights.push(
      `<strong>Concentration risk:</strong> Top 1% of line-items contribute ~<strong>${fmtPct(top1share)}</strong> of total profit; top 5% contribute ~<strong>${fmtPct(top5share)}</strong>.`
    );
  }

  // Insight 9: operational indicators
  if (Number.isFinite(k.avgLead)) {
    insights.push(`<strong>Operations:</strong> Average ship lead time is <strong>${k.avgLead.toFixed(1)}</strong> days.`);
  }
  if (Number.isFinite(k.lossOrdersPct)) {
    insights.push(`<strong>Loss exposure:</strong> Loss-making orders are ~<strong>${fmtPct(k.lossOrdersPct)}</strong> of orders in the current filter.`);
  }

  return insights;
}

function renderInsights(rows) {
  const list = insightEngine(rows);
  els.insights.innerHTML = list.length
    ? list.map((html) => `<li>${html}</li>`).join("")
    : `<li class="placeholder">No insights (try relaxing filters).</li>`;
}

// --- Charts (Plotly) ---
function plotMonthlySalesProfit(rows) {
  const byM = new Map();
  for (const r of rows) {
    if (!r.__month) continue;
    if (!byM.has(r.__month)) byM.set(r.__month, { sales: 0, profit: 0 });
    const a = byM.get(r.__month);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
  }
  const keys = [...byM.keys()].sort();
  const sales = keys.map((k) => byM.get(k).sales);
  const profit = keys.map((k) => byM.get(k).profit);

  const data = [
    { x: keys, y: sales, type: "scatter", mode: "lines+markers", name: "Sales" },
    { x: keys, y: profit, type: "scatter", mode: "lines+markers", name: "Profit", yaxis: "y2" },
  ];

  const layout = plotLayoutBase({
    margin: { t: 10, r: 10, l: 40, b: 40 },
    xaxis: { tickangle: -35 },
    yaxis: { title: "Sales" },
    yaxis2: { title: "Profit", overlaying: "y", side: "right" },
    legend: { orientation: "h", y: 1.2, x: 0 },
  });

  Plotly.react(els.chMonthlySalesProfit, data, layout, plotConfig());
}

function plotMonthlyMargin(rows) {
  const byM = new Map();
  for (const r of rows) {
    if (!r.__month) continue;
    if (!byM.has(r.__month)) byM.set(r.__month, { sales: 0, profit: 0 });
    const a = byM.get(r.__month);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
  }
  const keys = [...byM.keys()].sort();
  const margin = keys.map((k) => {
    const a = byM.get(k);
    return a.sales ? (a.profit / a.sales) * 100 : null;
  });

  const data = [
    { x: keys, y: margin, type: "scatter", mode: "lines+markers", name: "Margin (%)" },
  ];

  const layout = plotLayoutBase({
    margin: { t: 10, r: 10, l: 40, b: 40 },
    xaxis: { tickangle: -35 },
    yaxis: { title: "Profit Margin (%)", ticksuffix: "%" },
    legend: { orientation: "h", y: 1.2, x: 0 },
  });

  Plotly.react(els.chMonthlyMargin, data, layout, plotConfig());
}

function plotCategoryMix(rows) {
  if (!hasCol("Category")) {
    Plotly.purge(els.chCategoryMix);
    els.chCategoryMix.innerHTML = emptyChart("Category column not found.");
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const c = r["Category"];
    if (!c) continue;
    if (!agg.has(c)) agg.set(c, { sales: 0, profit: 0 });
    const a = agg.get(c);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
  }
  const cats = [...agg.keys()].sort();
  const sales = cats.map((c) => agg.get(c).sales);
  const profit = cats.map((c) => agg.get(c).profit);

  const data = [
    { x: cats, y: sales, type: "bar", name: "Sales" },
    { x: cats, y: profit, type: "bar", name: "Profit" },
  ];

  const layout = plotLayoutBase({
    barmode: "group",
    margin: { t: 10, r: 10, l: 40, b: 40 },
    yaxis: { title: "Value" },
    legend: { orientation: "h", y: 1.2, x: 0 },
  });

  Plotly.react(els.chCategoryMix, data, layout, plotConfig());
}

function plotSubcatProfit(rows) {
  if (!hasCol("Sub-Category")) {
    Plotly.purge(els.chSubcatProfit);
    els.chSubcatProfit.innerHTML = emptyChart("Sub-Category column not found.");
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const s = r["Sub-Category"];
    if (!s) continue;
    if (!agg.has(s)) agg.set(s, 0);
    agg.set(s, agg.get(s) + (r.__profit || 0));
  }
  const list = [...agg.entries()].map(([k, v]) => ({ k, v }));
  list.sort((a, b) => b.v - a.v);

  const top = list.slice(0, 12);
  const bot = list.slice(-12).sort((a, b) => a.v - b.v);
  const mix = bot.concat(top);

  const y = mix.map((x) => x.k);
  const x = mix.map((x) => x.v);

  const data = [{ x, y, type: "bar", orientation: "h", name: "Profit" }];

  const layout = plotLayoutBase({
    margin: { t: 10, r: 10, l: 120, b: 40 },
    xaxis: { title: "Profit" },
  });

  Plotly.react(els.chSubcatProfit, data, layout, plotConfig());
}

function plotRegionMarginReturns(rows) {
  if (!hasCol("Region")) {
    Plotly.purge(els.chRegionMarginReturns);
    els.chRegionMarginReturns.innerHTML = emptyChart("Region column not found.");
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const g = r["Region"];
    if (!g) continue;
    if (!agg.has(g)) agg.set(g, { sales: 0, profit: 0, n: 0, ret: 0 });
    const a = agg.get(g);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
    a.n += 1;
    a.ret += r.__returned || 0;
  }

  const regs = [...agg.keys()].sort();
  const margin = regs.map((g) => {
    const a = agg.get(g);
    return a.sales ? (a.profit / a.sales) * 100 : null;
  });
  const retRate = regs.map((g) => {
    const a = agg.get(g);
    return a.n ? (a.ret / a.n) * 100 : null;
  });

  const data = [
    { x: regs, y: margin, type: "bar", name: "Margin (%)", yaxis: "y1" },
    { x: regs, y: retRate, type: "scatter", mode: "lines+markers", name: "Return Rate (%)", yaxis: "y2" },
  ];

  const layout = plotLayoutBase({
    margin: { t: 10, r: 10, l: 40, b: 40 },
    yaxis: { title: "Margin (%)", ticksuffix: "%" },
    yaxis2: { title: "Return Rate (%)", overlaying: "y", side: "right", ticksuffix: "%" },
    legend: { orientation: "h", y: 1.2, x: 0 },
  });

  Plotly.react(els.chRegionMarginReturns, data, layout, plotConfig());
}

function plotStateChoropleth(rows) {
  if (!hasCol("State")) {
    Plotly.purge(els.chStateChoropleth);
    els.chStateChoropleth.innerHTML = emptyChart("State column not found.");
    return;
  }

  // Profit by state
  const agg = new Map();
  for (const r of rows) {
    const st = r["State"];
    if (!st) continue;
    if (!agg.has(st)) agg.set(st, 0);
    agg.set(st, agg.get(st) + (r.__profit || 0));
  }

  const states = [...agg.keys()].filter((s) => US_STATE_ABBR[s]).sort();
  const loc = states.map((s) => US_STATE_ABBR[s]);
  const z = states.map((s) => agg.get(s));

  const data = [
    {
      type: "choropleth",
      locationmode: "USA-states",
      locations: loc,
      z,
      text: states,
      hovertemplate: "<b>%{text}</b><br>Profit: %{z:.2f}<extra></extra>",
      colorbar: { title: "Profit" },
    },
  ];

  const layout = plotLayoutBase({
    geo: {
      scope: "usa",
      projection: { type: "albers usa" },
      showlakes: true,
      lakecolor: "rgba(255,255,255,0.10)",
    },
    margin: { t: 10, r: 10, l: 10, b: 10 },
  });

  Plotly.react(els.chStateChoropleth, data, layout, plotConfig());
}

function plotDiscountProfit(rows) {
  if (!hasCol("Discount")) {
    Plotly.purge(els.chDiscountProfit);
    els.chDiscountProfit.innerHTML = emptyChart("Discount column not found.");
    return;
  }

  // sample if too many points (still fine for 6k, but keep smooth)
  const sample = rows.length > 4500 ? reservoirSample(rows, 4500) : rows;

  const x = sample.map((r) => r.__discount ?? null);
  const y = sample.map((r) => r.__profit ?? null);
  const cat = sample.map((r) => r["Category"] ?? "—");

  const data = [
    {
      type: "scattergl",
      mode: "markers",
      x,
      y,
      text: cat,
      marker: { size: 6, opacity: 0.75 },
      hovertemplate: "Discount: %{x}<br>Profit: %{y:.2f}<br>Category: %{text}<extra></extra>",
      name: "Rows",
    },
  ];

  const layout = plotLayoutBase({
    margin: { t: 10, r: 10, l: 40, b: 40 },
    xaxis: { title: "Discount" },
    yaxis: { title: "Profit" },
  });

  Plotly.react(els.chDiscountProfit, data, layout, plotConfig());
}

function plotShipLead(rows) {
  if (!hasCol("Ship Mode") || !hasCol("Ship Date") || !hasCol("Order Date")) {
    Plotly.purge(els.chShipLead);
    els.chShipLead.innerHTML = emptyChart("Ship Mode / Ship Date / Order Date not found.");
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const sm = r["Ship Mode"];
    const lead = r.__shipLeadDays;
    if (!sm || !Number.isFinite(lead)) continue;
    if (!agg.has(sm)) agg.set(sm, []);
    agg.get(sm).push(lead);
  }

  const modes = [...agg.keys()].sort();
  const traces = modes.map((m) => ({
    type: "box",
    y: agg.get(m),
    name: m,
    boxpoints: false,
  }));

  const layout = plotLayoutBase({
    margin: { t: 10, r: 10, l: 40, b: 40 },
    yaxis: { title: "Ship Lead (days)" },
  });

  Plotly.react(els.chShipLead, traces, layout, plotConfig());
}

function reservoirSample(arr, n) {
  const res = arr.slice(0, n);
  for (let i = n; i < arr.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < n) res[j] = arr[i];
  }
  return res;
}

function plotLayoutBase(extra = {}) {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const paper = "rgba(0,0,0,0)";
  const plotbg = "rgba(0,0,0,0)";

  return {
    paper_bgcolor: paper,
    plot_bgcolor: plotbg,
    font: {
      family: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      color: isLight ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.90)",
    },
    xaxis: {
      gridcolor: isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.10)",
      zerolinecolor: isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.14)",
    },
    yaxis: {
      gridcolor: isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.10)",
      zerolinecolor: isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.14)",
    },
    ...extra,
  };
}

function plotConfig() {
  return {
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: {
      format: "png",
      filename: "superstore_chart",
      height: 900,
      width: 1400,
      scale: 2,
    },
    modeBarButtonsToRemove: ["lasso2d"], // keep select/zoom, remove lasso for simplicity
  };
}

function emptyChart(msg) {
  return `<div style="padding:16px;color:rgba(255,255,255,0.65)">${escapeHtml(msg)}</div>`;
}

// --- Tables ---
function buildTable(el, cols, rows) {
  const thead = `
    <thead>
      <tr>
        ${cols.map((c) => `<th data-key="${escapeHtml(c.key)}">${escapeHtml(c.label)}</th>`).join("")}
      </tr>
    </thead>
  `;
  const tbody = `
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          ${cols.map((c) => `<td>${escapeHtml(c.fmt(r[c.key]))}</td>`).join("")}
        </tr>`
        )
        .join("")}
    </tbody>
  `;
  el.innerHTML = thead + tbody;

  // sort on header click
  el.querySelectorAll("th").forEach((th) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      const col = cols.find((c) => c.key === key);
      if (!col) return;
      rows.sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
      buildTable(el, cols, rows);
    });
  });
}

function renderTables(rows) {
  // Products
  const prodKey = state.columns.has("Product Name") ? "Product Name" : null;

  if (prodKey) {
    const agg = new Map();
    for (const r of rows) {
      const p = r[prodKey];
      if (!p) continue;
      if (!agg.has(p)) agg.set(p, { product: p, sales: 0, profit: 0, rows: 0 });
      const a = agg.get(p);
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
      a.rows += 1;
    }
    const list = [...agg.values()].map((x) => ({
      product: x.product,
      sales: x.sales,
      profit: x.profit,
      margin: x.sales ? (x.profit / x.sales) * 100 : NaN,
    }));

    const top = [...list].sort((a, b) => b.profit - a.profit).slice(0, 10);
    const worst = [...list].sort((a, b) => a.profit - b.profit).slice(0, 10);

    buildTable(
      els.tblTopProducts,
      [
        { key: "product", label: "Product", fmt: (v) => v },
        { key: "sales", label: "Sales", fmt: (v) => fmtMoney(v) },
        { key: "profit", label: "Profit", fmt: (v) => fmtMoney(v) },
        { key: "margin", label: "Margin", fmt: (v) => fmtPct(v) },
      ],
      top
    );

    buildTable(
      els.tblLossProducts,
      [
        { key: "product", label: "Product", fmt: (v) => v },
        { key: "sales", label: "Sales", fmt: (v) => fmtMoney(v) },
        { key: "profit", label: "Profit", fmt: (v) => fmtMoney(v) },
        { key: "margin", label: "Margin", fmt: (v) => fmtPct(v) },
      ],
      worst
    );
  } else {
    els.tblTopProducts.innerHTML = `<thead><tr><th>Product Name column not found.</th></tr></thead>`;
    els.tblLossProducts.innerHTML = `<thead><tr><th>Product Name column not found.</th></tr></thead>`;
  }

  // States
  if (hasCol("State")) {
    const aggS = new Map();
    for (const r of rows) {
      const s = r["State"];
      if (!s) continue;
      if (!aggS.has(s)) aggS.set(s, { state: s, sales: 0, profit: 0, rows: 0 });
      const a = aggS.get(s);
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
      a.rows += 1;
    }
    const listS = [...aggS.values()].map((x) => ({
      state: x.state,
      sales: x.sales,
      profit: x.profit,
      margin: x.sales ? (x.profit / x.sales) * 100 : NaN,
    }));
    listS.sort((a, b) => b.profit - a.profit);

    buildTable(
      els.tblStates,
      [
        { key: "state", label: "State", fmt: (v) => v },
        { key: "sales", label: "Sales", fmt: (v) => fmtMoney(v) },
        { key: "profit", label: "Profit", fmt: (v) => fmtMoney(v) },
        { key: "margin", label: "Margin", fmt: (v) => fmtPct(v) },
      ],
      listS
    );
  } else {
    els.tblStates.innerHTML = `<thead><tr><th>State column not found.</th></tr></thead>`;
  }
}

// --- Main render ---
function renderAll() {
  const rows = state.filtered;

  // KPIs + Insights
  renderKPIs(computeKPIs(rows));
  renderInsights(rows);

  // Charts
  plotMonthlySalesProfit(rows);
  plotMonthlyMargin(rows);
  plotCategoryMix(rows);
  plotSubcatProfit(rows);
  plotRegionMarginReturns(rows);
  plotStateChoropleth(rows);
  plotDiscountProfit(rows);
  plotShipLead(rows);

  // Tables
  renderTables(rows);
}

function applyFiltersAndRender() {
  applyFilters();
  renderAll();
}

// --- Events ---
function wireEvents() {
  els.fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadCSVFile(file);
  });

  [
    els.fYear, els.fRegion, els.fCategory, els.fSubCategory,
    els.fSegment, els.fShipMode, els.fPaymentMode,
    els.fReturnedOnly, els.fLossOnly,
  ].forEach((el) => el.addEventListener("change", () => applyFiltersAndRender()));

  els.btnReset.addEventListener("click", () => {
    // clear selections
    for (const s of [els.fYear, els.fRegion, els.fCategory, els.fSubCategory, els.fSegment, els.fShipMode, els.fPaymentMode]) {
      [...s.options].forEach((o) => (o.selected = false));
    }
    els.fReturnedOnly.checked = false;
    els.fLossOnly.checked = false;
    applyFiltersAndRender();
  });

  els.btnExport.addEventListener("click", () => {
    const rows = state.filtered;
    if (!rows.length) return;

    // Export original fields (remove internal __ fields)
    const exportRows = rows.map((r) => {
      const out = { ...r };
      Object.keys(out).forEach((k) => {
        if (k.startsWith("__")) delete out[k];
      });
      return out;
    });

    const csv = Papa.unparse(exportRows);
    downloadText("superstore_filtered.csv", csv);
  });

  // Theme toggle
  els.btnTheme.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    // re-render charts to update font/grid colors
    if (state.filtered.length) renderAll();
  });

  // Help modal
  els.btnHelp.addEventListener("click", () => els.helpModal.classList.remove("hidden"));
  els.btnCloseHelp.addEventListener("click", () => els.helpModal.classList.add("hidden"));
  els.helpModal.addEventListener("click", (e) => {
    if (e.target === els.helpModal) els.helpModal.classList.add("hidden");
  });
}

// --- Boot ---
(function init() {
  document.documentElement.setAttribute("data-theme", "dark");
  wireEvents();

  // Small friendly default
  setLoading("Upload a CSV to begin.");
})();
