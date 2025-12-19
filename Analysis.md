# SuperStore Sales Deep Analysis & Insights (2019–2020)

## Data snapshot

* **Rows (line-items):** 5,901
* **Orders:** 3,003
* **Customers:** 773
* **Products:** 1,755
* **Date range:** 2019-01-01 to 2020-12-31
* **Returns field:** 287 line-items have `Returns = 1` (treated here as “returned”)
* **Notes:** Columns `ind1` and `ind2` are empty in this file; ignored in analysis.

---

## Executive summary (what stands out)

1. **Sales scaled fast, profitability didn’t:** Sales grew **77.3%** in 2020 vs 2019, but profit grew only **14.2%** because margin fell **-5.2 pp**.
2. **Margin collapse is concentrated in 2020 Q4:** Biggest quarter by sales (**2020Q4: 386,044**) but lowest margin (**7.1%**).
3. **Furniture is the primary drag:** Only **2.2%** margin overall; **Tables** alone lose **-11,091.64**.
4. **Central & South drove most of the 2020 margin drop:** Central margin fell **-13.1 pp** and South fell **-14.6 pp** (see tables below).
5. **West has an outsized returns signal:** **9.9%** line-item return rate in West vs ~**2–3%** elsewhere.
6. **Profit is very concentrated:** Top **1%** of line-items contribute **~49.9%** of total profit.

---

## KPI dashboard

| Metric                    | Value        |
| ------------------------- | ------------ |
| Total Sales               | 1,565,804.32 |
| Total Profit              | 175,262.11   |
| Overall Profit Margin     | 11.2%        |
| Orders                    | 3,003        |
| Customers                 | 773          |
| Products                  | 1,755        |
| Average Order Value (AOV) | 521.41       |
| Median Order Value        | 249.07       |
| Orders with Loss          | 601          |
| Loss-making Orders (%)    | 20.0%        |
| Returned line-items       | 287          |
| Return Rate (line-items)  | 4.9%         |
| Avg ship lead time (days) | 3.93         |

---

## Growth & seasonality

### Year-over-year

| Year | Sales        | Profit    | Orders | Customers | Profit Margin | AOV    |
| ---- | ------------ | --------- | ------ | --------- | ------------- | ------ |
| 2019 | 564,679.54   | 81,823.44 | 1315   | 638       | 14.5%         | 429.41 |
| 2020 | 1,001,124.79 | 93,438.66 | 1688   | 693       | 9.3%          | 593.08 |

**2020 vs 2019**

* Sales: **77.3%**
* Profit: **14.2%**
* AOV: **38.1%**
* Profit margin: **-5.2 pp**

> **Opportunity sizing:** If 2020 had kept 2019’s margin, profit would be about **145,065.42** (gap: **51,626.76**).

### Quarterly (spot the margin compression)

| Year | Quarter | Sales      | Profit    | Orders | Profit Margin |
| ---- | ------- | ---------- | --------- | ------ | ------------- |
| 2019 | 2019Q1  | 90,311.12  | 11,469.64 | 179    | 12.7%         |
| 2019 | 2019Q2  | 130,082.30 | 16,390.34 | 294    | 12.6%         |
| 2019 | 2019Q3  | 143,787.36 | 15,823.60 | 378    | 11.0%         |
| 2019 | 2019Q4  | 200,498.75 | 38,139.86 | 464    | 19.0%         |
| 2020 | 2020Q1  | 171,060.86 | 23,506.20 | 240    | 13.7%         |
| 2020 | 2020Q2  | 186,800.37 | 15,499.21 | 367    | 8.3%          |
| 2020 | 2020Q3  | 257,219.96 | 26,985.13 | 448    | 10.5%         |
| 2020 | 2020Q4  | 386,043.60 | 27,448.12 | 633    | 7.1%          |

### Months to watch

**Top 5 months by sales**

| Month   | Sales      | Profit    | Orders | Margin |
| ------- | ---------- | --------- | ------ | ------ |
| 2020-12 | 166,185.85 | 8,482.74  | 225    | 5.1%   |
| 2020-11 | 130,960.82 | 9,690.10  | 261    | 7.4%   |
| 2020-09 | 119,803.65 | 10,991.56 | 226    | 9.2%   |
| 2020-10 | 88,896.92  | 9,275.28  | 147    | 10.4%  |
| 2019-11 | 79,411.97  | 4,011.41  | 183    | 5.1%   |

**Worst 5 months by profit margin**

| Month   | Sales      | Profit   | Orders | Margin |
| ------- | ---------- | -------- | ------ | ------ |
| 2020-04 | 50,807.54  | 933.29   | 86     | 1.8%   |
| 2020-02 | 52,068.13  | 1,613.87 | 71     | 3.1%   |
| 2019-11 | 79,411.97  | 4,011.41 | 183    | 5.1%   |
| 2020-12 | 166,185.85 | 8,482.74 | 225    | 5.1%   |
| 2019-08 | 31,115.37  | 2,062.07 | 89     | 6.6%   |

---

## Where profit comes from

### Category performance

| Category        | Sales      | Profit    | Orders | Profit Margin |
| --------------- | ---------- | --------- | ------ | ------------- |
| Office Supplies | 643,707.69 | 74,797.25 | 2219   | 11.6%         |
| Technology      | 470,587.99 | 90,458.25 | 915    | 19.2%         |
| Furniture       | 451,508.65 | 10,006.61 | 1040   | 2.2%          |

### Category margin shift (2019 → 2020)

| Category        | Sales_2019 | Sales_2020 | Profit_2019 | Profit_2020 | Margin_2019 | Margin_2020 | MarginChange_pp |
| --------------- | ---------- | ---------- | ----------- | ----------- | ----------- | ----------- | --------------- |
| Furniture       | 195,275.38 | 256,233.27 | 6,988.22    | 3,018.39    | 3.6%        | 1.2%        | -2.4 pp         |
| Office Supplies | 174,939.98 | 468,767.70 | 35,061.23   | 39,736.02   | 20.0%       | 8.5%        | -11.6 pp        |
| Technology      | 194,464.18 | 276,123.81 | 39,773.99   | 50,684.26   | 20.5%       | 18.4%       | -2.1 pp         |

### Sub-categories (biggest winners and losers)

**Top sub-categories by profit**

| Category        | Sub-Category | Sales      | Profit    | Profit Margin |
| --------------- | ------------ | ---------- | --------- | ------------- |
| Technology      | Copiers      | 59,735.80  | 42,774.58 | 71.6%         |
| Technology      | Accessories  | 122,301.09 | 25,336.65 | 20.7%         |
| Technology      | Phones       | 196,563.55 | 22,308.92 | 11.3%         |
| Office Supplies | Paper        | 99,453.61  | 21,112.38 | 21.2%         |
| Office Supplies | Binders      | 174,978.39 | 17,885.38 | 10.2%         |
| Office Supplies | Storage      | 150,341.32 | 13,607.09 | 9.1%          |
| Furniture       | Chairs       | 181,946.00 | 13,406.70 | 7.4%          |
| Office Supplies | Appliances   | 80,305.25  | 13,166.61 | 16.4%         |

**Bottom sub-categories by profit**

| Category        | Sub-Category | Sales      | Profit     | Profit Margin |
| --------------- | ------------ | ---------- | ---------- | ------------- |
| Furniture       | Tables       | 119,293.74 | -11,091.64 | -9.3%         |
| Office Supplies | Supplies     | 36,720.99  | -1,654.28  | -4.5%         |
| Furniture       | Bookcases    | 57,577.69  | -342.89    | -0.6%         |
| Technology      | Machines     | 91,987.56  | 38.10      | 0.0%          |
| Office Supplies | Fasteners    | 15,205.24  | 598.42     | 3.9%          |
| Office Supplies | Labels       | 19,397.46  | 2,937.22   | 15.1%         |
| Office Supplies | Envelopes    | 16,542.46  | 3,508.51   | 21.2%         |
| Office Supplies | Art          | 50,762.98  | 3,635.93   | 7.2%          |

### Profit concentration (risk)

| Bucket           | Share of total profit |
| ---------------- | --------------------- |
| Top 1% lines     | 49.9%                 |
| Top 5% lines     | 88.6%                 |
| Top 10% lines    | 108.8%                |
| Bottom 90% lines | -8.8%                 |

---

## Geography: where to focus

### Region overview

| Region  | Sales      | Profit    | Orders | ReturnRate | Profit Margin |
| ------- | ---------- | --------- | ------ | ---------- | ------------- |
| West    | 522,441.05 | 67,859.96 | 961    | 9.9%       | 13.0%         |
| East    | 450,234.67 | 53,400.42 | 844    | 2.8%       | 11.9%         |
| Central | 341,007.52 | 27,450.01 | 711    | 2.2%       | 8.0%          |
| South   | 252,121.08 | 26,551.72 | 487    | 2.1%       | 10.5%         |

### Region margin shift (2019 → 2020)

| Region  | Sales_2019 | Sales_2020 | Profit_2019 | Profit_2020 | Margin_2019 | Margin_2020 | MarginChange_pp |
| ------- | ---------- | ---------- | ----------- | ----------- | ----------- | ----------- | --------------- |
| Central | 120,729.38 | 220,278.15 | 19,899.16   | 7,550.84    | 16.5%       | 3.4%        | -13.1 pp        |
| East    | 169,859.76 | 280,374.90 | 20,169.86   | 33,230.56   | 11.9%       | 11.9%       | -0.0 pp         |
| South   | 88,610.22  | 163,510.86 | 17,702.81   | 8,848.91    | 20.0%       | 5.4%        | -14.6 pp        |
| West    | 185,480.18 | 336,960.88 | 24,051.61   | 43,808.35   | 13.0%       | 13.0%       | +0.0 pp         |

### States (signal for go-to-market and pricing issues)

**Top states by profit**

| State      | Sales      | Profit    | Profit Margin |
| ---------- | ---------- | --------- | ------------- |
| California | 335,190.26 | 49,372.18 | 14.7%         |
| New York   | 186,748.10 | 41,012.02 | 22.0%         |
| Washington | 92,975.18  | 21,466.66 | 23.1%         |
| Michigan   | 48,504.68  | 17,480.28 | 36.0%         |
| Indiana    | 32,039.23  | 15,524.66 | 48.5%         |
| Georgia    | 37,260.69  | 9,994.42  | 26.8%         |

**Bottom states by profit**

| State          | Sales      | Profit     | Profit Margin |
| -------------- | ---------- | ---------- | ------------- |
| Texas          | 116,261.93 | -14,078.16 | -12.1%        |
| Illinois       | 64,224.33  | -9,554.65  | -14.9%        |
| Ohio           | 68,194.86  | -9,339.42  | -13.7%        |
| Pennsylvania   | 82,354.95  | -9,297.80  | -11.3%        |
| Colorado       | 29,249.06  | -5,825.59  | -19.9%        |
| North Carolina | 39,705.12  | -4,827.69  | -12.2%        |

---

## Operations: shipping, returns, channel

### Ship Mode (speed vs margin vs returns)

| Ship Mode      | Sales      | Profit    | Orders | AvgLead | ReturnRate | Profit Margin |
| -------------- | ---------- | --------- | ------ | ------- | ---------- | ------------- |
| Same Day       | 95,958.50  | 8,808.82  | 163    | 0.05    | 2.9%       | 9.2%          |
| Standard Class | 912,401.04 | 99,767.39 | 1773   | 5.05    | 4.5%       | 10.9%         |
| Second Class   | 314,508.06 | 36,936.03 | 568    | 3.22    | 5.0%       | 11.7%         |
| First Class    | 242,936.72 | 29,749.87 | 499    | 2.14    | 6.9%       | 12.2%         |

### Payment Mode (channel economics)

| Payment Mode | Sales      | Profit    | Orders | ReturnRate | Profit Margin |
| ------------ | ---------- | --------- | ------ | ---------- | ------------- |
| COD          | 667,417.75 | 82,092.43 | 1717   | 4.7%       | 12.3%         |
| Online       | 553,993.46 | 54,047.52 | 1562   | 5.5%       | 9.8%          |
| Cards        | 344,393.11 | 39,122.16 | 985    | 4.0%       | 11.4%         |

**Quick takeaways**

* **COD** has the best margin in this data; **Online** has the lowest margin and the highest return rate.
* **Same Day** is fast, but has the lowest margin among ship modes overall.

---

## Deep dive highlight: Central + Office Supplies (why Central crashed in 2020)

In Central, **Office Supplies** went from healthy profitability in 2019 to almost break-even in 2020. The largest red flag is **Binders**: big sales growth, but margin flips negative.

| Sub-Category | Sales_2019 | Sales_2020 | SalesChange | Profit_2019 | Profit_2020 | Margin_2019 | Margin_2020 | MarginChange_pp |
| ------------ | ---------- | ---------- | ----------- | ----------- | ----------- | ----------- | ----------- | --------------- |
| Binders      | 7,056.38   | 36,293.40  | 29,237.02   | 2,919.34    | -3,957.14   | 41.4%       | -10.9%      | -52.3 pp        |
| Paper        | 5,365.61   | 16,842.28  | 11,476.67   | 2,205.37    | 2,471.58    | 41.1%       | 14.7%       | -26.4 pp        |
| Art          | 1,519.95   | 10,929.28  | 9,409.33    | 261.42      | 497.83      | 17.2%       | 4.6%        | -12.6 pp        |
| Appliances   | 6,015.01   | 13,723.31  | 7,708.30    | 378.69      | -313.38     | 6.3%        | -2.3%       | -8.6 pp         |
| Storage      | 12,811.51  | 19,119.74  | 6,308.23    | 778.98      | 409.00      | 6.1%        | 2.1%        | -3.9 pp         |
| Fasteners    | 247.37     | 2,928.23   | 2,680.86    | 83.23       | 112.23      | 33.6%       | 3.8%        | -29.8 pp        |

**Actionable checks**

* Validate if 2020 Central Binders had deeper discounts / pricing overrides / returns not netted out.
* Inspect top 20 Central Binder orders by **lowest profit margin** and verify product cost/price logic.

---

## Products: winners and losers (SKU-level economics)

**Top 5 products by profit**

| Product ID      | Product Name                                      | Category        | Sub-Category | Sales     | Profit    | Profit Margin |
| --------------- | ------------------------------------------------- | --------------- | ------------ | --------- | --------- | ------------- |
| TEC-CO-10004722 | Canon imageCLASS 2200 Advanced Copier             | Technology      | Copiers      | 14,076.82 | 25,199.93 | 179.0%        |
| TEC-CO-10001449 | Hewlett Packard LaserJet 3310 Copier              | Technology      | Copiers      | 13,837.73 | 6,407.89  | 46.3%         |
| TEC-MA-10001047 | 3D Systems Cube Printer, 2nd Generation, Magenta  | Technology      | Machines     | 14,334.89 | 3,717.97  | 25.9%         |
| TEC-MA-10001127 | HP Designjet T520 Inkjet Large Format Printer ... | Technology      | Machines     | 4,749.95  | 2,799.98  | 58.9%         |
| OFF-BI-10001359 | GBC DocuBind TL300 Electric Binding System        | Office Supplies | Binders      | 12,890.26 | 2,753.76  | 21.4%         |

**Bottom 5 products by profit**

| Product ID      | Product Name                                      | Category        | Sub-Category | Sales    | Profit    | Profit Margin |
| --------------- | ------------------------------------------------- | --------------- | ------------ | -------- | --------- | ------------- |
| TEC-MA-10000418 | Cubify CubeX 3D Printer Double Head Print         | Technology      | Machines     | 9,323.97 | -6,239.98 | -66.9%        |
| TEC-MA-10004125 | Cubify CubeX 3D Printer Triple Head Print         | Technology      | Machines     | 3,009.98 | -3,839.99 | -127.6%       |
| TEC-MA-10000822 | Lexmark MX611dhe Monochrome Laser Printer         | Technology      | Machines     | 5,676.97 | -2,719.98 | -47.9%        |
| FUR-TA-10001889 | Bush Advantage Collection Racetrack Conference... | Furniture       | Tables       | 4,334.10 | -2,019.24 | -46.6%        |
| OFF-BI-10001120 | Ibico EPK-21 Electric Binding System              | Office Supplies | Binders      | 6,437.97 | -1,285.19 | -20.0%        |

> Note: Some products show unusually high margins (>100%). That can happen in messy datasets (e.g., profit not net of returns, or pricing/cost issues). It’s worth validating these rows before taking pricing actions.

---

## What to do next (deep analysis roadmap)

### 1) Stop the bleeding (loss containment)

* **Tables (Furniture):** reduce discounting, bundle with high-margin add-ons, or tighten approval rules.
* **Machines (Technology):** identify specific printer models driving losses; revisit pricing/costs.
* **Loss states:** start with **Texas / Illinois / Ohio / Pennsylvania** and review the largest loss orders.

### 2) Scale what’s working (profit growth)

* Protect **Copiers + Accessories** (availability, upsell attach rate, priority fulfillment).
* Replicate high-margin region-category combos (e.g., **Central Tech**, but avoid unprofitable Office Supplies patterns).

### 3) Reduce returns where it matters

* West has the strongest returns signal; check **return rate by sub-category and product** inside West.
* Look for operational drivers: packaging, delivery damage, wrong-item issues, or customer segments with high return behavior.

### 4) Build a simple “profit guardrail” dashboard

Minimum weekly metrics:

* Sales, Profit, Margin (overall + by Region/Category/Sub-Category)
* Loss-making order %
* Return rate %
* Top 10 profit SKUs, Top 10 loss SKUs

---

## How to replicate this (non-coder workflow in Excel)

### Pivot 1 — Monthly trend

1. Insert → PivotTable
2. Rows: **Order Date** (group by Month, Year)
3. Values: **Sum of Sales**, **Sum of Profit**
4. Add calculated field: **Profit Margin = Profit / Sales**
5. Insert line chart for Sales and Profit; add a secondary axis for Profit Margin.

### Pivot 2 — Category/Sub-Category profitability

1. Rows: **Category**, then **Sub-Category**
2. Values: **Sales**, **Profit**
3. Add **Profit Margin** (calculated)
4. Apply conditional formatting to highlight negative Profit and low Margin.

### Pivot 3 — Region/State heatmap

1. Rows: **Region**, then **State**
2. Values: **Sales**, **Profit**, **Profit Margin**
3. Sort by Profit ascending to surface problem states.

### Pivot 4 — Returns & operational drivers

1. Rows: **Region** (or Ship Mode / Payment Mode)
2. Values: **Count of Rows**, **Sum of Returns** (treat Returns=1 as returned)
3. Calculate **Return Rate = Returned / Total**
4. Add slicers for **Category** and **Year**.

---

## Copy‑paste prompts for deeper insights in ChatGPT

Paste one prompt at a time:

1. **Root-cause of margin drop**

   * “Compare 2019 vs 2020 profit margin. Break down the margin drop into *mix shift* (region/category/sub-category share changes) vs *within-bucket margin change*. List the top 10 drivers.”

2. **Problem heatmap**

   * “Create a ranked list of Region × Category × Sub-Category combinations with (a) highest sales, (b) lowest margin, and (c) biggest YoY margin drop.”

3. **Loss prevention rules**

   * “Propose simple guardrails like ‘block discounts’ or ‘require approval’ for orders where expected margin < X. Suggest X values per category based on the data.”

4. **Returns deep dive**

   * “Identify which products and states have the highest return rate and whether returns correlate with ship mode or payment mode.”

5. **What-if scenarios**

   * “If we fix the bottom 3 sub-categories (by profit) to reach break-even, how much does total profit and margin improve? Repeat for bottom 5 states.”

---

*Generated from `SuperStore_Sales_Dataset.csv` (5,901 line-items).*
