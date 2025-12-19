/* SuperStore Insight Studio
   - Custom multi-select filters (search + chips)
   - Interactive Plotly charts with expand/download
   - Tabs navigation
   - Auto insights + sortable tables
*/

const $ = (id) => document.getElementById(id);

const els = {
  fileInput: $("fileInput"),
  statusText: $("statusText"),
  dataMeta: $("dataMeta"),
  kpiRow: $("kpiRow"),
  insights: $("insights"),

  chipRows: $("chipRows"),
  chipRange: $("chipRange"),
  chipView: $("chipView"),

  btnReset: $("btnReset"),
  btnExport: $("btnExport"),
  btnTheme: $("btnTheme"),
  btnHelp: $("btnHelp"),
  helpModal: $("helpModal"),
  btnCloseHelp: $("btnCloseHelp"),

  // Filter hosts
  fYear: $("fYear"),
  fQuarter: $("fQuarter"),
  fRegion: $("fRegion"),
  fState: $("fState"),
  fCategory: $("fCategory"),
  fSubCategory: $("fSubCategory"),
  fSegment: $("fSegment"),
  fShipMode: $("fShipMode"),
  fPaymentMode: $("fPaymentMode"),

  fReturnedOnly: $("fReturnedOnly"),
  fLossOnly: $("fLossOnly"),

  // Charts
  chMonthlySalesProfit: $("chMonthlySalesProfit"),
  chMonthlyMargin: $("chMonthlyMargin"),
  chCategoryMix: $("chCategoryMix"),
  chSubcatProfit: $("chSubcatProfit"),
  chRegionMarginReturns: $("chRegionMarginReturns"),
  chStateChoropleth: $("chStateChoropleth"),
  chDiscountProfit: $("chDiscountProfit"),
  chShipLead: $("chShipLead"),
  chProfitConcentration: $("chProfitConcentration"),
  chPaymentMargin: $("chPaymentMargin"),
  chShipEconomics: $("chShipEconomics"),

  // Tables
  tblTopProducts: $("tblTopProducts"),
  tblLossProducts: $("tblLossProducts"),
  tblStates: $("tblStates"),

  // Tabs
  tabs: Array.from(document.querySelectorAll(".tab")),
  sections: {
    overview: $("tab-overview"),
    profitability: $("tab-profitability"),
    geography: $("tab-geography"),
    operations: $("tab-operations"),
  },

  // Chart modal
  chartModal: $("chartModal"),
  modalTitle: $("modalTitle"),
  modalSub: $("modalSub"),
  modalChart: $("modalChart"),
  btnModalClose: $("btnModalClose"),
  btnModalDownload: $("btnModalDownload"),
};

const state = {
  raw: [],
  filtered: [],
  columns: new Set(),
  meta: { rows: 0, dateMin: null, dateMax: null },
  theme: "dark",
  filters: {}, // MultiSelect components
  modal: { chartId: null, title: "" },
};

// ------------------------ Utilities ------------------------
function safeNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDateSmart(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  const d0 = new Date(s);
  if (!Number.isNaN(d0.getTime())) return d0;

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
function fmtPct(x) {
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(1)}%`;
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
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
function hasCol(name) {
  return state.columns.has(name);
}

function setStatus(msg, ok = false) {
  els.statusText.textContent = msg;
  $("statusDot").style.background = ok ? "var(--good)" : "var(--warn)";
}

function enableUI(enabled) {
  els.btnReset.disabled = !enabled;
  els.btnExport.disabled = !enabled;
}

function renderMetaChips() {
  els.chipRows.textContent = `Rows: ${state.meta.rows ? state.meta.rows.toLocaleString() : "—"}`;
  const dm = state.meta.dateMin ? state.meta.dateMin.toISOString().slice(0, 10) : "—";
  const dx = state.meta.dateMax ? state.meta.dateMax.toISOString().slice(0, 10) : "—";
  els.chipRange.textContent = `Range: ${dm} → ${dx}`;
}

function viewLabel() {
  const parts = [];
  if (els.fReturnedOnly.checked) parts.push("Returned");
  if (els.fLossOnly.checked) parts.push("Loss");
  const label = parts.length ? parts.join(" + ") : "All";
  els.chipView.textContent = `View: ${label}`;
}

// ------------------------ MultiSelect Component ------------------------
class MultiSelect {
  constructor(hostEl, { placeholder = "Select...", onChange = () => {} } = {}) {
    this.hostEl = hostEl;
    this.placeholder = placeholder;
    this.onChange = onChange;

    this.options = [];  // [{value, label, count?}]
    this.selected = new Set();
    this.search = "";

    this._render();
    this._wire();
  }

  _render() {
    this.hostEl.innerHTML = `
      <div class="ms" role="combobox" aria-expanded="false">
        <div class="msControl" tabindex="0">
          <div class="msChips"></div>
          <div class="msRight">
            <button class="msClear" type="button" title="Clear">×</button>
            <div class="msCaret" aria-hidden="true">▾</div>
          </div>
        </div>
        <div class="msMenu" role="listbox">
          <div class="msSearch">
            <input type="text" placeholder="Search..." />
          </div>
          <div class="msList"></div>
        </div>
      </div>
    `;
    this.root = this.hostEl.querySelector(".ms");
    this.control = this.hostEl.querySelector(".msControl");
    this.chipsEl = this.hostEl.querySelector(".msChips");
    this.clearBtn = this.hostEl.querySelector(".msClear");
    this.menu = this.hostEl.querySelector(".msMenu");
    this.searchInput = this.hostEl.querySelector(".msSearch input");
    this.list = this.hostEl.querySelector(".msList");
    this._renderChips();
    this._renderList();
  }

  _wire() {
    // toggle open
    const toggle = () => {
      const open = this.root.classList.toggle("open");
      this.root.setAttribute("aria-expanded", String(open));
      if (open) this.searchInput.focus();
    };

    this.control.addEventListener("click", toggle);
    this.control.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") this.close();
    });

    // close on outside click
    document.addEventListener("click", (e) => {
      if (!this.hostEl.contains(e.target)) this.close();
    });

    this.clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clear();
    });

    this.searchInput.addEventListener("input", () => {
      this.search = this.searchInput.value.trim().toLowerCase();
      this._renderList();
    });

    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  open() { this.root.classList.add("open"); this.root.setAttribute("aria-expanded", "true"); }
  close() { this.root.classList.remove("open"); this.root.setAttribute("aria-expanded", "false"); }

  setOptions(values, countsMap = null) {
    // values: string[]
    const counts = countsMap || new Map();
    this.options = values.map((v) => ({
      value: String(v),
      label: String(v),
      count: counts.has(String(v)) ? counts.get(String(v)) : null,
    }));
    // remove selections not in options
    const optSet = new Set(this.options.map((o) => o.value));
    this.selected = new Set([...this.selected].filter((v) => optSet.has(v)));
    this._renderChips();
    this._renderList();
  }

  getSelected() {
    return [...this.selected];
  }

  setSelected(values) {
    this.selected = new Set(values.map(String));
    this._renderChips();
    this._renderList();
  }

  clear() {
    if (this.selected.size === 0) return;
    this.selected.clear();
    this._renderChips();
    this._renderList();
    this.onChange();
  }

  _renderChips() {
    const items = [...this.selected].slice(0, 4);
    const extra = this.selected.size - items.length;

    if (this.selected.size === 0) {
      this.chipsEl.innerHTML = `<div class="msPlaceholder">${escapeHtml(this.placeholder)}</div>`;
      this.clearBtn.style.opacity = "0.0";
      this.clearBtn.style.pointerEvents = "none";
      return;
    }

    this.clearBtn.style.opacity = "1";
    this.clearBtn.style.pointerEvents = "auto";

    const chipHtml = items.map((x) => `<div class="msChip" title="${escapeHtml(x)}">${escapeHtml(x)}</div>`).join("");
    const more = extra > 0 ? `<div class="msChip" title="More selections">+${extra} more</div>` : "";
    this.chipsEl.innerHTML = chipHtml + more;
  }

  _renderList() {
    const q = this.search;
    const opts = q
      ? this.options.filter((o) => o.label.toLowerCase().includes(q))
      : this.options;

    if (opts.length === 0) {
      this.list.innerHTML = `<div style="padding:10px;color:var(--muted);font-size:13px;">No matches</div>`;
      return;
    }

    this.list.innerHTML = opts
      .map((o) => {
        const checked = this.selected.has(o.value) ? "checked" : "";
        const countHtml = Number.isFinite(o.count) ? `<span class="count">${o.count.toLocaleString()}</span>` : "";
        return `
          <div class="msItem" data-value="${escapeHtml(o.value)}">
            <input type="checkbox" ${checked} />
            <span class="lbl">${escapeHtml(o.label)}</span>
            ${countHtml}
          </div>
        `;
      })
      .join("");

    this.list.querySelectorAll(".msItem").forEach((item) => {
      item.addEventListener("click", (e) => {
        const v = item.getAttribute("data-value");
        const willSelect = !this.selected.has(v);
        if (willSelect) this.selected.add(v);
        else this.selected.delete(v);

        // keep checkbox in sync
        const cb = item.querySelector("input");
        cb.checked = this.selected.has(v);

        this._renderChips();
        this.onChange();
      });
    });
  }
}

// ------------------------ Data normalize ------------------------
function normalizeRow(r) {
  const out = { ...r };
  Object.keys(r).forEach((k) => state.columns.add(k));

  const od = parseDateSmart(r["Order Date"] ?? r["OrderDate"] ?? r["order_date"]);
  const sd = parseDateSmart(r["Ship Date"] ?? r["ShipDate"] ?? r["ship_date"]);
  out.__orderDate = od;
  out.__shipDate = sd;

  out.__sales = safeNum(r["Sales"]);
  out.__profit = safeNum(r["Profit"]);
  out.__discount = safeNum(r["Discount"]);
  out.__quantity = safeNum(r["Quantity"]);

  const rv = r["Returns"];
  if (rv === null || rv === undefined) out.__returned = 0;
  else {
    const s = String(rv).trim().toLowerCase();
    out.__returned = ["1", "yes", "y", "true", "returned"].includes(s) ? 1 : 0;
    const n = safeNum(rv);
    if (n !== null && n > 0) out.__returned = 1;
  }

  out.__year = od ? od.getFullYear() : null;
  out.__month = od ? monthKey(od) : null;
  out.__quarter = od ? quarterKey(od) : null;
  out.__shipLeadDays = od && sd ? Math.round((sd - od) / (1000 * 60 * 60 * 24)) : null;

  out.__orderId = r["Order ID"] ?? r["OrderID"] ?? r["order_id"] ?? null;

  return out;
}

// ------------------------ Load CSV ------------------------
function loadCSVFile(file) {
  state.raw = [];
  state.filtered = [];
  state.columns = new Set();
  state.meta = { rows: 0, dateMin: null, dateMax: null };

  setStatus("Parsing CSV…", false);
  enableUI(false);

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: (results) => {
      const rows = (results.data || [])
        .map(normalizeRow)
        .filter((r) => r.__orderDate && Number.isFinite(r.__sales) && Number.isFinite(r.__profit));

      state.raw = rows;
      state.meta.rows = rows.length;

      const dates = rows.map((x) => x.__orderDate.getTime());
      if (dates.length) {
        state.meta.dateMin = new Date(Math.min(...dates));
        state.meta.dateMax = new Date(Math.max(...dates));
      }

      buildFilters();
      applyFiltersAndRender();

      setStatus("Ready. Use filters and tabs to explore.", true);
      enableUI(true);
      renderMeta();
      renderMetaChips();
    },
    error: (err) => setStatus(`Error reading CSV: ${err?.message || err}`, false),
  });
}

function renderMeta() {
  const dm = state.meta.dateMin ? state.meta.dateMin.toISOString().slice(0, 10) : "—";
  const dx = state.meta.dateMax ? state.meta.dateMax.toISOString().slice(0, 10) : "—";
  els.dataMeta.textContent = `Rows: ${state.meta.rows.toLocaleString()} • Range: ${dm} → ${dx}`;
  viewLabel();
}

// ------------------------ Filters ------------------------
function countBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k === null || k === undefined || String(k).trim() === "") continue;
    const s = String(k);
    m.set(s, (m.get(s) || 0) + 1);
  }
  return m;
}

function buildFilters() {
  // instantiate once
  if (!state.filters.year) {
    const onChange = () => applyFiltersAndRender();
    state.filters.year = new MultiSelect(els.fYear, { placeholder: els.fYear.dataset.placeholder || "Select year(s)", onChange });
    state.filters.quarter = new MultiSelect(els.fQuarter, { placeholder: els.fQuarter.dataset.placeholder || "Select quarter(s)", onChange });
    state.filters.region = new MultiSelect(els.fRegion, { placeholder: els.fRegion.dataset.placeholder || "Select region(s)", onChange });
    state.filters.state = new MultiSelect(els.fState, { placeholder: els.fState.dataset.placeholder || "Select state(s)", onChange });
    state.filters.category = new MultiSelect(els.fCategory, { placeholder: els.fCategory.dataset.placeholder || "Select category(s)", onChange });
    state.filters.subCategory = new MultiSelect(els.fSubCategory, { placeholder: els.fSubCategory.dataset.placeholder || "Select sub-category(s)", onChange });
    state.filters.segment = new MultiSelect(els.fSegment, { placeholder: els.fSegment.dataset.placeholder || "Select segment(s)", onChange });
    state.filters.shipMode = new MultiSelect(els.fShipMode, { placeholder: els.fShipMode.dataset.placeholder || "Select ship mode(s)", onChange });
    state.filters.paymentMode = new MultiSelect(els.fPaymentMode, { placeholder: els.fPaymentMode.dataset.placeholder || "Select payment mode(s)", onChange });
  }

  const r = state.raw;

  const years = uniqSorted(r.map((x) => x.__year)).map(String);
  const quarters = uniqSorted(r.map((x) => x.__quarter)).map(String);

  const regions = uniqSorted(r.map((x) => x["Region"]));
  const states = uniqSorted(r.map((x) => x["State"]));
  const cats = uniqSorted(r.map((x) => x["Category"]));
  const subcats = uniqSorted(r.map((x) => x["Sub-Category"]));
  const segs = uniqSorted(r.map((x) => x["Segment"]));
  const ships = uniqSorted(r.map((x) => x["Ship Mode"]));
  const pays = uniqSorted(r.map((x) => x["Payment Mode"]));

  // counts for nicer dropdown UX
  state.filters.year.setOptions(years, countBy(r, (x) => x.__year));
  state.filters.quarter.setOptions(quarters, countBy(r, (x) => x.__quarter));
  state.filters.region.setOptions(regions, countBy(r, (x) => x["Region"]));
  state.filters.state.setOptions(states, countBy(r, (x) => x["State"]));
  state.filters.category.setOptions(cats, countBy(r, (x) => x["Category"]));
  state.filters.subCategory.setOptions(subcats, countBy(r, (x) => x["Sub-Category"]));
  state.filters.segment.setOptions(segs, countBy(r, (x) => x["Segment"]));
  state.filters.shipMode.setOptions(ships, countBy(r, (x) => x["Ship Mode"]));
  state.filters.paymentMode.setOptions(pays, countBy(r, (x) => x["Payment Mode"]));
}

function applyFilters() {
  const f = state.filters;

  const years = new Set(f.year.getSelected());
  const quarters = new Set(f.quarter.getSelected());
  const regions = new Set(f.region.getSelected());
  const states = new Set(f.state.getSelected());
  const cats = new Set(f.category.getSelected());
  const subcats = new Set(f.subCategory.getSelected());
  const segs = new Set(f.segment.getSelected());
  const ships = new Set(f.shipMode.getSelected());
  const pays = new Set(f.paymentMode.getSelected());

  const returnedOnly = els.fReturnedOnly.checked;
  const lossOnly = els.fLossOnly.checked;

  const pass = (set, v) => (set.size === 0 ? true : set.has(String(v)));

  state.filtered = state.raw.filter((r) => {
    if (!pass(years, r.__year)) return false;
    if (!pass(quarters, r.__quarter)) return false;

    if (regions.size && !regions.has(String(r["Region"]))) return false;
    if (states.size && !states.has(String(r["State"]))) return false;

    if (cats.size && !cats.has(String(r["Category"]))) return false;
    if (subcats.size && !subcats.has(String(r["Sub-Category"]))) return false;

    if (segs.size && !segs.has(String(r["Segment"]))) return false;
    if (ships.size && !ships.has(String(r["Ship Mode"]))) return false;
    if (pays.size && !pays.has(String(r["Payment Mode"]))) return false;

    if (returnedOnly && r.__returned !== 1) return false;
    if (lossOnly && !(r.__profit < 0)) return false;

    return true;
  });

  viewLabel();
}

// ------------------------ KPIs & insights ------------------------
function computeKPIs(rows) {
  const sales = rows.reduce((a, r) => a + (r.__sales || 0), 0);
  const profit = rows.reduce((a, r) => a + (r.__profit || 0), 0);
  const margin = sales ? (profit / sales) * 100 : NaN;

  const ids = rows.map((r) => r.__orderId).filter(Boolean);
  const uniqueOrders = new Set(ids);
  const orders = uniqueOrders.size ? uniqueOrders.size : rows.length;

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

  const returnsRate = rows.length
    ? (rows.reduce((a, r) => a + (r.__returned || 0), 0) / rows.length) * 100
    : NaN;

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
    { label: "AOV", value: fmtMoney(k.aov), hint: "Avg order sales" },
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

function insightEngine(rows) {
  const k = computeKPIs(rows);

  // YoY
  const years = uniqSorted(rows.map((r) => r.__year));
  const yoy = [];
  if (years.length >= 2) {
    const byYear = new Map();
    for (const y of years) byYear.set(y, { sales: 0, profit: 0 });
    for (const r of rows) {
      const b = byYear.get(r.__year);
      b.sales += r.__sales || 0;
      b.profit += r.__profit || 0;
    }
    for (let i = 1; i < years.length; i++) {
      const y0 = years[i - 1], y1 = years[i];
      const a = byYear.get(y0), b = byYear.get(y1);
      const m0 = a.sales ? (a.profit / a.sales) * 100 : NaN;
      const m1 = b.sales ? (b.profit / b.sales) * 100 : NaN;
      yoy.push({ y0, y1, m0, m1, sGrowth: a.sales ? ((b.sales - a.sales) / a.sales) * 100 : NaN });
    }
  }

  // Worst sub-category by profit
  let subWorst = null;
  if (hasCol("Sub-Category")) {
    const agg = new Map();
    for (const r of rows) {
      const s = r["Sub-Category"];
      if (!s) continue;
      if (!agg.has(s)) agg.set(s, 0);
      agg.set(s, agg.get(s) + (r.__profit || 0));
    }
    const list = [...agg.entries()].map(([s, p]) => ({ s, p }));
    list.sort((a, b) => a.p - b.p);
    subWorst = list[0] || null;
  }

  // Top sales month + margin
  const byMonth = new Map();
  for (const r of rows) {
    if (!r.__month) continue;
    if (!byMonth.has(r.__month)) byMonth.set(r.__month, { sales: 0, profit: 0 });
    const a = byMonth.get(r.__month);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
  }
  const monthList = [...byMonth.entries()].map(([m, a]) => ({
    m, sales: a.sales, profit: a.profit, margin: a.sales ? (a.profit / a.sales) * 100 : NaN,
  }));
  monthList.sort((a, b) => (b.sales || 0) - (a.sales || 0));
  const topSalesMonth = monthList[0] || null;

  const worstMarginMonth = [...monthList].sort((a, b) => (a.margin || 0) - (b.margin || 0))[0] || null;

  // Concentration
  const profits = rows.map((r) => r.__profit || 0).sort((a, b) => b - a);
  const totalProfit = profits.reduce((a, x) => a + x, 0);
  const top1n = Math.max(1, Math.floor(profits.length * 0.01));
  const top1share = totalProfit ? (profits.slice(0, top1n).reduce((a, x) => a + x, 0) / totalProfit) * 100 : NaN;

  const insights = [];
  insights.push(`<strong>Economics:</strong> Margin <strong>${fmtPct(k.margin)}</strong>. Profit <strong>${fmtMoney(k.profit)}</strong> on sales <strong>${fmtMoney(k.sales)}</strong>.`);

  if (yoy.length) {
    const t = yoy[yoy.length - 1];
    const delta = (Number.isFinite(t.m1) && Number.isFinite(t.m0)) ? (t.m1 - t.m0) : NaN;
    insights.push(`<strong>YoY signal:</strong> ${t.y0} → ${t.y1} sales growth <strong>${fmtPct(t.sGrowth)}</strong>; margin <strong>${fmtPct(t.m0)}</strong> → <strong>${fmtPct(t.m1)}</strong> (${Number.isFinite(delta) ? delta.toFixed(1) : "—"} pp).`);
  }

  if (subWorst) {
    insights.push(`<strong>Loss driver:</strong> Worst sub-category is <strong>${escapeHtml(subWorst.s)}</strong> with profit <strong>${fmtMoney(subWorst.p)}</strong>.`);
  }

  if (topSalesMonth) {
    insights.push(`<strong>Seasonality:</strong> Peak sales month <strong>${escapeHtml(topSalesMonth.m)}</strong> with margin <strong>${fmtPct(topSalesMonth.margin)}</strong>.`);
  }
  if (worstMarginMonth) {
    insights.push(`<strong>Margin alert:</strong> Worst margin month <strong>${escapeHtml(worstMarginMonth.m)}</strong> at <strong>${fmtPct(worstMarginMonth.margin)}</strong>.`);
  }

  if (Number.isFinite(top1share)) {
    insights.push(`<strong>Concentration risk:</strong> Top 1% of line-items contribute ~<strong>${fmtPct(top1share)}</strong> of total profit.`);
  }

  if (Number.isFinite(k.lossOrdersPct)) {
    insights.push(`<strong>Loss exposure:</strong> Loss-making orders ~<strong>${fmtPct(k.lossOrdersPct)}</strong> (within current filter).`);
  }

  if (Number.isFinite(k.avgLead)) {
    insights.push(`<strong>Operations:</strong> Avg ship lead time <strong>${k.avgLead.toFixed(1)}</strong> days.`);
  }

  return insights;
}

function renderInsights(rows) {
  const list = insightEngine(rows);
  els.insights.innerHTML = list.length
    ? list.map((html) => `<li>${html}</li>`).join("")
    : `<li class="placeholder">No insights (try relaxing filters).</li>`;
}

// ------------------------ Charts ------------------------
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

function plotLayoutBase(extra = {}) {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
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
    modeBarButtonsToRemove: ["lasso2d"],
  };
}

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

  Plotly.react(
    els.chMonthlySalesProfit,
    [
      { x: keys, y: sales, type: "scatter", mode: "lines+markers", name: "Sales" },
      { x: keys, y: profit, type: "scatter", mode: "lines+markers", name: "Profit", yaxis: "y2" },
    ],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 45, b: 45 },
      xaxis: { tickangle: -35 },
      yaxis: { title: "Sales" },
      yaxis2: { title: "Profit", overlaying: "y", side: "right" },
      legend: { orientation: "h", y: 1.2, x: 0 },
    }),
    plotConfig()
  );
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

  Plotly.react(
    els.chMonthlyMargin,
    [{ x: keys, y: margin, type: "scatter", mode: "lines+markers", name: "Margin (%)" }],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 45, b: 45 },
      xaxis: { tickangle: -35 },
      yaxis: { title: "Profit Margin (%)", ticksuffix: "%" },
    }),
    plotConfig()
  );
}

function plotCategoryMix(rows) {
  if (!hasCol("Category")) {
    els.chCategoryMix.innerHTML = `<div style="padding:14px;color:var(--muted)">Category column not found.</div>`;
    Plotly.purge(els.chCategoryMix);
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

  Plotly.react(
    els.chCategoryMix,
    [
      { x: cats, y: sales, type: "bar", name: "Sales" },
      { x: cats, y: profit, type: "bar", name: "Profit" },
    ],
    plotLayoutBase({
      barmode: "group",
      margin: { t: 10, r: 10, l: 45, b: 45 },
      yaxis: { title: "Value" },
      legend: { orientation: "h", y: 1.2, x: 0 },
    }),
    plotConfig()
  );
}

function plotSubcatProfit(rows) {
  if (!hasCol("Sub-Category")) {
    els.chSubcatProfit.innerHTML = `<div style="padding:14px;color:var(--muted)">Sub-Category column not found.</div>`;
    Plotly.purge(els.chSubcatProfit);
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const s = r["Sub-Category"];
    if (!s) continue;
    agg.set(s, (agg.get(s) || 0) + (r.__profit || 0));
  }
  const list = [...agg.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const top = list.slice(0, 12);
  const bot = list.slice(-12).sort((a, b) => a.v - b.v);
  const mix = bot.concat(top);

  Plotly.react(
    els.chSubcatProfit,
    [{ x: mix.map((x) => x.v), y: mix.map((x) => x.k), type: "bar", orientation: "h", name: "Profit" }],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 135, b: 45 },
      xaxis: { title: "Profit" },
    }),
    plotConfig()
  );
}

function plotRegionMarginReturns(rows) {
  if (!hasCol("Region")) {
    els.chRegionMarginReturns.innerHTML = `<div style="padding:14px;color:var(--muted)">Region column not found.</div>`;
    Plotly.purge(els.chRegionMarginReturns);
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

  Plotly.react(
    els.chRegionMarginReturns,
    [
      { x: regs, y: margin, type: "bar", name: "Margin (%)" },
      { x: regs, y: retRate, type: "scatter", mode: "lines+markers", name: "Return Rate (%)", yaxis: "y2" },
    ],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 45, b: 45 },
      yaxis: { title: "Margin (%)", ticksuffix: "%" },
      yaxis2: { title: "Return Rate (%)", overlaying: "y", side: "right", ticksuffix: "%" },
      legend: { orientation: "h", y: 1.2, x: 0 },
    }),
    plotConfig()
  );
}

function plotStateChoropleth(rows) {
  if (!hasCol("State")) {
    els.chStateChoropleth.innerHTML = `<div style="padding:14px;color:var(--muted)">State column not found.</div>`;
    Plotly.purge(els.chStateChoropleth);
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const st = r["State"];
    if (!st) continue;
    agg.set(st, (agg.get(st) || 0) + (r.__profit || 0));
  }

  const states = [...agg.keys()].filter((s) => US_STATE_ABBR[s]).sort();
  const loc = states.map((s) => US_STATE_ABBR[s]);
  const z = states.map((s) => agg.get(s));

  Plotly.react(
    els.chStateChoropleth,
    [{
      type: "choropleth",
      locationmode: "USA-states",
      locations: loc,
      z,
      text: states,
      hovertemplate: "<b>%{text}</b><br>Profit: %{z:.2f}<extra></extra>",
      colorbar: { title: "Profit" },
    }],
    plotLayoutBase({
      geo: { scope: "usa", projection: { type: "albers usa" }, showlakes: true, lakecolor: "rgba(255,255,255,0.10)" },
      margin: { t: 10, r: 10, l: 10, b: 10 },
    }),
    plotConfig()
  );
}

function plotDiscountProfit(rows) {
  if (!hasCol("Discount")) {
    els.chDiscountProfit.innerHTML = `<div style="padding:14px;color:var(--muted)">Discount column not found.</div>`;
    Plotly.purge(els.chDiscountProfit);
    return;
  }

  const sample = rows.length > 4500 ? reservoirSample(rows, 4500) : rows;
  const x = sample.map((r) => r.__discount ?? null);
  const y = sample.map((r) => r.__profit ?? null);
  const cat = sample.map((r) => r["Category"] ?? "—");

  Plotly.react(
    els.chDiscountProfit,
    [{
      type: "scattergl",
      mode: "markers",
      x, y,
      text: cat,
      marker: { size: 6, opacity: 0.75 },
      hovertemplate: "Discount: %{x}<br>Profit: %{y:.2f}<br>Category: %{text}<extra></extra>",
      name: "Rows",
    }],
    plotLayoutBase({ margin: { t: 10, r: 10, l: 45, b: 45 }, xaxis: { title: "Discount" }, yaxis: { title: "Profit" } }),
    plotConfig()
  );
}

function plotShipLead(rows) {
  if (!hasCol("Ship Mode")) {
    els.chShipLead.innerHTML = `<div style="padding:14px;color:var(--muted)">Ship Mode column not found.</div>`;
    Plotly.purge(els.chShipLead);
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
  const traces = modes.map((m) => ({ type: "box", y: agg.get(m), name: m, boxpoints: false }));

  Plotly.react(
    els.chShipLead,
    traces,
    plotLayoutBase({ margin: { t: 10, r: 10, l: 45, b: 45 }, yaxis: { title: "Ship Lead (days)" } }),
    plotConfig()
  );
}

function plotProfitConcentration(rows) {
  const profits = rows.map((r) => r.__profit || 0).sort((a, b) => b - a);
  const cum = [];
  let s = 0;
  for (let i = 0; i < profits.length; i++) {
    s += profits[i];
    cum.push(s);
  }
  const total = cum.length ? cum[cum.length - 1] : 0;
  const shareProfit = total ? cum.map((x) => x / total) : cum.map(() => null);
  const shareLines = profits.map((_, i) => (i + 1) / profits.length);

  Plotly.react(
    els.chProfitConcentration,
    [{ x: shareLines, y: shareProfit, type: "scatter", mode: "lines", name: "Cumulative Profit Share" }],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 45, b: 45 },
      xaxis: { title: "Share of line-items (sorted by profit desc)" },
      yaxis: { title: "Cumulative share of total profit" },
    }),
    plotConfig()
  );
}

function plotPaymentMargin(rows) {
  if (!hasCol("Payment Mode")) {
    els.chPaymentMargin.innerHTML = `<div style="padding:14px;color:var(--muted)">Payment Mode column not found.</div>`;
    Plotly.purge(els.chPaymentMargin);
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const p = r["Payment Mode"];
    if (!p) continue;
    if (!agg.has(p)) agg.set(p, { sales: 0, profit: 0, n: 0, ret: 0 });
    const a = agg.get(p);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
    a.n += 1;
    a.ret += r.__returned || 0;
  }

  const modes = [...agg.keys()].sort();
  const margin = modes.map((m) => {
    const a = agg.get(m);
    return a.sales ? (a.profit / a.sales) * 100 : null;
  });
  const retRate = modes.map((m) => {
    const a = agg.get(m);
    return a.n ? (a.ret / a.n) * 100 : null;
  });

  Plotly.react(
    els.chPaymentMargin,
    [
      { x: modes, y: margin, type: "bar", name: "Margin (%)" },
      { x: modes, y: retRate, type: "scatter", mode: "lines+markers", name: "Return Rate (%)", yaxis: "y2" },
    ],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 45, b: 45 },
      yaxis: { title: "Margin (%)", ticksuffix: "%" },
      yaxis2: { title: "Return Rate (%)", overlaying: "y", side: "right", ticksuffix: "%" },
      legend: { orientation: "h", y: 1.2, x: 0 },
    }),
    plotConfig()
  );
}

function plotShipEconomics(rows) {
  if (!hasCol("Ship Mode")) {
    els.chShipEconomics.innerHTML = `<div style="padding:14px;color:var(--muted)">Ship Mode column not found.</div>`;
    Plotly.purge(els.chShipEconomics);
    return;
  }

  const agg = new Map();
  for (const r of rows) {
    const s = r["Ship Mode"];
    if (!s) continue;
    if (!agg.has(s)) agg.set(s, { sales: 0, profit: 0, n: 0, ret: 0 });
    const a = agg.get(s);
    a.sales += r.__sales || 0;
    a.profit += r.__profit || 0;
    a.n += 1;
    a.ret += r.__returned || 0;
  }

  const modes = [...agg.keys()].sort();
  const margin = modes.map((m) => {
    const a = agg.get(m);
    return a.sales ? (a.profit / a.sales) * 100 : null;
  });
  const retRate = modes.map((m) => {
    const a = agg.get(m);
    return a.n ? (a.ret / a.n) * 100 : null;
  });

  Plotly.react(
    els.chShipEconomics,
    [
      { x: modes, y: margin, type: "bar", name: "Margin (%)" },
      { x: modes, y: retRate, type: "scatter", mode: "lines+markers", name: "Return Rate (%)", yaxis: "y2" },
    ],
    plotLayoutBase({
      margin: { t: 10, r: 10, l: 45, b: 45 },
      yaxis: { title: "Margin (%)", ticksuffix: "%" },
      yaxis2: { title: "Return Rate (%)", overlaying: "y", side: "right", ticksuffix: "%" },
      legend: { orientation: "h", y: 1.2, x: 0 },
    }),
    plotConfig()
  );
}

function reservoirSample(arr, n) {
  const res = arr.slice(0, n);
  for (let i = n; i < arr.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < n) res[j] = arr[i];
  }
  return res;
}

// ------------------------ Tables ------------------------
function buildTable(el, cols, rows) {
  const thead = `
    <thead><tr>
      ${cols.map((c) => `<th data-key="${escapeHtml(c.key)}">${escapeHtml(c.label)}</th>`).join("")}
    </tr></thead>
  `;
  const tbody = `
    <tbody>
      ${rows.map((r) => {
        return `<tr>${cols.map((c) => {
          const v = r[c.key];
          const txt = c.fmt(v);
          const cls = c.classFn ? c.classFn(v, r) : "";
          return `<td class="${cls}">${escapeHtml(txt)}</td>`;
        }).join("")}</tr>`;
      }).join("")}
    </tbody>
  `;
  el.innerHTML = thead + tbody;

  // sortable
  el.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      const col = cols.find((c) => c.key === key);
      if (!col) return;

      rows.sort((a, b) => {
        const av = a[key], bv = b[key];
        const an = typeof av === "number" ? av : Number(av);
        const bn = typeof bv === "number" ? bv : Number(bv);
        if (Number.isFinite(an) && Number.isFinite(bn)) return bn - an;
        return String(bv).localeCompare(String(av));
      });

      buildTable(el, cols, rows);
    });
  });
}

function renderTables(rows) {
  const prodKey = state.columns.has("Product Name") ? "Product Name" : null;

  if (prodKey) {
    const agg = new Map();
    for (const r of rows) {
      const p = r[prodKey];
      if (!p) continue;
      if (!agg.has(p)) agg.set(p, { product: p, sales: 0, profit: 0 });
      const a = agg.get(p);
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
    }
    const list = [...agg.values()].map((x) => ({
      product: x.product,
      sales: x.sales,
      profit: x.profit,
      margin: x.sales ? (x.profit / x.sales) * 100 : NaN,
    }));

    const top = [...list].sort((a, b) => b.profit - a.profit).slice(0, 10);
    const worst = [...list].sort((a, b) => a.profit - b.profit).slice(0, 10);

    const cols = [
      { key: "product", label: "Product", fmt: (v) => String(v) },
      { key: "sales", label: "Sales", fmt: (v) => fmtMoney(v) },
      { key: "profit", label: "Profit", fmt: (v) => fmtMoney(v), classFn: (v) => (v < 0 ? "neg" : "pos") },
      { key: "margin", label: "Margin", fmt: (v) => fmtPct(v) },
    ];

    buildTable(els.tblTopProducts, cols, top);
    buildTable(els.tblLossProducts, cols, worst);
  } else {
    els.tblTopProducts.innerHTML = `<thead><tr><th>Product Name column not found.</th></tr></thead>`;
    els.tblLossProducts.innerHTML = `<thead><tr><th>Product Name column not found.</th></tr></thead>`;
  }

  if (hasCol("State")) {
    const aggS = new Map();
    for (const r of rows) {
      const s = r["State"];
      if (!s) continue;
      if (!aggS.has(s)) aggS.set(s, { state: s, sales: 0, profit: 0 });
      const a = aggS.get(s);
      a.sales += r.__sales || 0;
      a.profit += r.__profit || 0;
    }
    const listS = [...aggS.values()].map((x) => ({
      state: x.state,
      sales: x.sales,
      profit: x.profit,
      margin: x.sales ? (x.profit / x.sales) * 100 : NaN,
    })).sort((a, b) => b.profit - a.profit);

    buildTable(
      els.tblStates,
      [
        { key: "state", label: "State", fmt: (v) => String(v) },
        { key: "sales", label: "Sales", fmt: (v) => fmtMoney(v) },
        { key: "profit", label: "Profit", fmt: (v) => fmtMoney(v), classFn: (v) => (v < 0 ? "neg" : "pos") },
        { key: "margin", label: "Margin", fmt: (v) => fmtPct(v) },
      ],
      listS
    );
  } else {
    els.tblStates.innerHTML = `<thead><tr><th>State column not found.</th></tr></thead>`;
  }
}

// ------------------------ Render pipeline ------------------------
function renderAll() {
  const rows = state.filtered;

  renderKPIs(computeKPIs(rows));
  renderInsights(rows);

  plotMonthlySalesProfit(rows);
  plotMonthlyMargin(rows);
  plotCategoryMix(rows);
  plotSubcatProfit(rows);
  plotProfitConcentration(rows);

  plotRegionMarginReturns(rows);
  plotStateChoropleth(rows);

  plotDiscountProfit(rows);
  plotShipLead(rows);
  plotPaymentMargin(rows);
  plotShipEconomics(rows);

  renderTables(rows);
}

function applyFiltersAndRender() {
  applyFilters();
  renderAll();
}

// ------------------------ Tabs ------------------------
function setActiveTab(tabName) {
  els.tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === tabName));
  Object.entries(els.sections).forEach(([k, sec]) => sec.classList.toggle("active", k === tabName));
}

// ------------------------ Chart actions (expand/download) ------------------------
function chartTitleById(chartId) {
  const map = {
    chMonthlySalesProfit: "Monthly Sales & Profit",
    chMonthlyMargin: "Monthly Profit Margin",
    chCategoryMix: "Category Mix",
    chSubcatProfit: "Sub-Categories by Profit",
    chProfitConcentration: "Profit Concentration",
    chRegionMarginReturns: "Region: Margin & Returns",
    chStateChoropleth: "USA State Profit Map",
    chDiscountProfit: "Discount vs Profit",
    chShipLead: "Ship Lead Time by Ship Mode",
    chPaymentMargin: "Payment Mode Margin",
    chShipEconomics: "Ship Mode Economics",
  };
  return map[chartId] || "Chart";
}

function openChartModal(chartId) {
  state.modal.chartId = chartId;
  state.modal.title = chartTitleById(chartId);

  els.modalTitle.textContent = state.modal.title;
  els.modalSub.textContent = "Expanded view (interactive)";

  // clone chart into modal
  const sourceEl = $(chartId);
  if (!sourceEl) return;

  // Grab current figure from Plotly
  const fig = sourceEl.data ? { data: sourceEl.data, layout: sourceEl.layout } : null;
  if (!fig) return;

  els.chartModal.classList.remove("hidden");
  Plotly.react(els.modalChart, fig.data, { ...fig.layout, margin: { t: 30, r: 20, l: 55, b: 55 } }, plotConfig());
}

function closeChartModal() {
  els.chartModal.classList.add("hidden");
  Plotly.purge(els.modalChart);
  state.modal.chartId = null;
}

async function downloadChartPng(chartId) {
  const el = $(chartId);
  if (!el) return;
  const url = await Plotly.toImage(el, { format: "png", height: 900, width: 1400, scale: 2 });
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chartTitleById(chartId).toLowerCase().replace(/\s+/g, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ------------------------ Export ------------------------
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

// ------------------------ Events ------------------------
function wireEvents() {
  els.fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadCSVFile(file);
  });

  els.fReturnedOnly.addEventListener("change", () => applyFiltersAndRender());
  els.fLossOnly.addEventListener("change", () => applyFiltersAndRender());

  els.btnReset.addEventListener("click", () => {
    Object.values(state.filters).forEach((ms) => ms.clear());
    els.fReturnedOnly.checked = false;
    els.fLossOnly.checked = false;
    applyFiltersAndRender();
  });

  els.btnExport.addEventListener("click", () => {
    const rows = state.filtered;
    if (!rows.length) return;

    const exportRows = rows.map((r) => {
      const out = { ...r };
      Object.keys(out).forEach((k) => { if (k.startsWith("__")) delete out[k]; });
      return out;
    });

    const csv = Papa.unparse(exportRows);
    downloadText("superstore_filtered.csv", csv);
  });

  // Theme toggle
  els.btnTheme.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    if (state.filtered.length) renderAll(); // redraw for correct grid/font colors
  });

  // Tabs
  els.tabs.forEach((t) => {
    t.addEventListener("click", () => setActiveTab(t.dataset.tab));
  });

  // Help
  els.btnHelp.addEventListener("click", () => els.helpModal.classList.remove("hidden"));
  els.btnCloseHelp.addEventListener("click", () => els.helpModal.classList.add("hidden"));
  els.helpModal.addEventListener("click", (e) => { if (e.target === els.helpModal) els.helpModal.classList.add("hidden"); });

  // Chart actions
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const chartId = btn.getAttribute("data-chart");
    if (!chartId) return;

    if (action === "expand") openChartModal(chartId);
    if (action === "download") downloadChartPng(chartId);
  });

  // Chart modal
  els.btnModalClose.addEventListener("click", closeChartModal);
  els.chartModal.addEventListener("click", (e) => { if (e.target === els.chartModal) closeChartModal(); });
  els.btnModalDownload.addEventListener("click", () => {
    if (!state.modal.chartId) return;
    // Download from modal chart (ensures high-res)
    downloadChartPng("modalChart");
  });
}

// ------------------------ Boot ------------------------
(function init() {
  document.documentElement.setAttribute("data-theme", "dark");
  setActiveTab("overview");
  wireEvents();
  setStatus("Upload a CSV to begin.", false);
  renderMetaChips();
})();
