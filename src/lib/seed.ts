import type { BasicCard, Card, ClozeCard, Section } from "./types";

export const SEED_SECTIONS: Section[] = [
  { id: "bucket_rules", name: "Bucket selection rules", order: 1 },
  { id: "case_types", name: "Case types & top-level buckets", order: 2 },
  { id: "bucket_menus", name: "Sub-bucket menus (cloze)", order: 3 },
  { id: "saas_walkthrough", name: "SaaS walkthrough — 7 steps", order: 4 },
  { id: "bucket_dos_donts", name: "Bucket dos & don'ts", order: 5 },
  { id: "financial_metrics", name: "Financial metrics + SaaS", order: 6 },
  { id: "clarifying", name: "Clarifying questions drill", order: 7 },
  { id: "unit_economics", name: "Industry unit economics", order: 8 },
];

const basic = (
  sectionId: string,
  index: number,
  prompt: string,
  answer: string,
  hint?: string
): BasicCard => ({
  id: `${sectionId}-${index}`,
  sectionId,
  type: "basic",
  prompt,
  answer,
  hint,
  createdAt: 0,
});

const cloze = (
  sectionId: string,
  index: number,
  text: string,
  notes?: string
): ClozeCard => ({
  id: `${sectionId}-${index}`,
  sectionId,
  type: "cloze",
  text,
  notes,
  createdAt: 0,
});

export const SEED_CARDS: Card[] = [
  // ── Section 1: Bucket selection rules ─────────────────────────────────────
  cloze(
    "bucket_rules",
    1,
    "The three rules of bucket selection: {{c1::Pick, don't list}} — 2–4 sub-buckets tailored to the case. {{c2::Hypothesize before structuring}} — drop a hypothesis upfront. {{c3::Context overrides the menu}} — same case type, different sub-buckets by industry."
  ),
  cloze(
    "bucket_rules",
    2,
    "“Pick, don't list” means: pick {{c1::2–4}} sub-buckets per bucket that matter most. Listing every option signals {{c2::lack of judgment}}; mentioning all 6 makes you sound like a {{c3::textbook}}."
  ),
  cloze(
    "bucket_rules",
    3,
    "“Hypothesize before structuring” means: drop a hypothesis upfront like {{c1::“My instinct is this is a revenue-side problem driven by competitive entry — let me structure both sides to test that.”}} It shows {{c2::judgment, not just structure}}."
  ),
  cloze(
    "bucket_rules",
    4,
    "“Context overrides the menu”: SaaS profitability case → weight {{c1::churn, NRR, CAC payback, gross margin}}. Hospital → {{c2::payer mix, labor cost per patient day, capacity utilization}}. Same case type, different sub-buckets."
  ),
  basic(
    "bucket_rules",
    5,
    "What is the meta-rule that ties all three bucket-selection rules together?",
    "The objective drives the structure. The context drives the sub-buckets. Buckets are a menu, not a script.",
    "Objective → structure. Context → sub-buckets."
  ),

  // ── Section 2: Case types & top-level buckets (was the old case_types) ────
  basic(
    "case_types",
    1,
    "Profitability decline case — what are your top-level buckets and what equation anchors them?",
    "Revenue drivers, Cost drivers, External factors. Anchor to: Profit = Revenue − Costs. Revenue = Price × Quantity; Costs = Fixed + Variable.",
    "Anchor to the math first."
  ),
  basic(
    "case_types",
    2,
    "Market entry case — list the four buckets in the order you'd present them.",
    "1. Is the market attractive? 2. Can we win? 3. Is it financially worth it? 4. How should we enter? (Bucket 4 is conditional on 1-3.)",
    "Market → Us → Economics → Execution."
  ),
  basic(
    "case_types",
    3,
    "M&A case — what are the four core buckets, and what's the final test?",
    "Standalone value of target, Synergies (revenue + cost), Integration risk/cost, Strategic fit. Final test: does total value created exceed price paid?",
    "Value creation vs. price."
  ),
  basic(
    "case_types",
    4,
    "New product launch — what four buckets would you propose?",
    "Market demand, Competitive response, Internal capability/fit, Financial viability (unit economics + investment).",
    "Demand, competition, fit, financials."
  ),
  basic(
    "case_types",
    5,
    "Pricing case — what four reference points anchor your structure?",
    "Cost-based floor, Value-based ceiling (willingness to pay), Competitive benchmark, Strategic objective (penetration vs. skim).",
    "Floor, ceiling, market, intent."
  ),
  basic(
    "case_types",
    6,
    "Growth strategy — what's the organic vs. inorganic split, and what framework structures organic?",
    "Organic: Ansoff matrix (existing/new products × existing/new customers — 4 quadrants). Inorganic: M&A and partnerships.",
    "Ansoff for organic."
  ),
  basic(
    "case_types",
    7,
    "Operations / cost reduction — what are the standard ways to bucket costs?",
    "Process map → identify waste; or COGS vs. SG&A; or Fixed vs. Variable; or by function (R&D, ops, sales, admin).",
    "Multiple valid cuts — pick by case context."
  ),
  basic(
    "case_types",
    8,
    "NGO / social sector case (Diconsa-style) — what are the three buckets?",
    "Benefits to stakeholders, Costs and risks, Feasibility and sustainability.",
    "Mission-driven, not profit-driven."
  ),
  basic(
    "case_types",
    9,
    "What's the single most important question to ask before structuring ANY case?",
    "What is the client trying to optimize for, and over what timeframe? (The objective drives the structure — always.)",
    "Objective shapes everything downstream."
  ),
  basic(
    "case_types",
    10,
    "What's the MECE test, in two parts?",
    "Mutually Exclusive: no item belongs in two buckets (no overlap). Collectively Exhaustive: no key driver falls outside all buckets (full coverage).",
    "No overlap, full coverage."
  ),

  // ── Section 3: Sub-bucket menus (cloze) — from the PDF case-buckets menu ──
  // Profitability
  cloze(
    "bucket_menus",
    1,
    "Profitability · Revenue drivers — sub-buckets: {{c1::Volume (customers/units, purchase frequency, customer mix shift)}}, {{c2::Price (list price, realized price, price mix)}}, {{c3::Product/service mix (shift to lower-margin offerings)}}, {{c4::Channel mix (direct vs. wholesale/distributor)}}, {{c5::Geography mix}}, {{c6::Customer segment mix (enterprise vs. SMB, premium vs. value)}}."
  ),
  cloze(
    "bucket_menus",
    2,
    "Profitability · Cost drivers — sub-buckets: {{c1::COGS (raw materials, manufacturing labor, freight, supplier price)}}, {{c2::SG&A (sales force, marketing, corporate overhead, real estate)}}, {{c3::Fixed vs. variable — operating deleverage}}, {{c4::Cost per unit (input prices not passed through)}}, {{c5::One-time vs. recurring (write-downs, restructuring, lawsuits)}}."
  ),
  cloze(
    "bucket_menus",
    3,
    "Profitability · External / structural: {{c1::New competitors entering or expanding}}, {{c2::Substitutes emerging (tech disruption)}}, {{c3::Regulation changing economics (tariffs, reimbursement, taxes)}}, {{c4::Macro shifts (FX, interest rates, demand cycles)}}, {{c5::Customer behavior changes (digital adoption, preferences)}}."
  ),

  // Market entry
  cloze(
    "bucket_menus",
    4,
    "Market entry · Is the market attractive? — sub-buckets: {{c1::Market size and growth (TAM/SAM/SOM)}}, {{c2::Customer demand (who buys, why, WTP)}}, {{c3::Customer segments — most attractive ones}}, {{c4::Competitive landscape (# players, concentration, profitability)}}, {{c5::Regulatory environment (barriers, FDI, licensing, IP)}}, {{c6::Macro factors (stability, infrastructure, supply chain)}}."
  ),
  cloze(
    "bucket_menus",
    5,
    "Market entry · Can we win? — sub-buckets: {{c1::Capabilities transfer (brand, tech, ops, supply chain)}}, {{c2::Differentiated value prop vs. local/incumbent players}}, {{c3::Localization (product, pricing, language, channel)}}, {{c4::Talent and management bandwidth}}, {{c5::Existing relationships or partnerships}}, {{c6::Cost position vs. competitors}}."
  ),
  cloze(
    "bucket_menus",
    6,
    "Market entry · Is it financially worth it? — sub-buckets: {{c1::Investment required (capex, marketing, hiring, real estate)}}, {{c2::Revenue projections (ramp curve, market share trajectory)}}, {{c3::Cost structure in the new market}}, {{c4::Profitability timeline (years to breakeven, NPV, IRR)}}, {{c5::Comparison to alternative uses of capital}}, {{c6::Downside scenarios}}."
  ),
  cloze(
    "bucket_menus",
    7,
    "Market entry · How should we enter? (conditional) — sub-buckets: {{c1::Entry mode (organic, JV, partnership, franchise, acquisition)}}, {{c2::Geographic rollout (pilot city → metros → national)}}, {{c3::Pace (aggressive land-grab vs. measured)}}, {{c4::Product scope (full portfolio vs. flagship SKUs)}}, {{c5::Channel strategy (direct, retail partners, e-commerce)}}, {{c6::Build vs. buy for key capabilities}}."
  ),

  // M&A
  cloze(
    "bucket_menus",
    8,
    "M&A · Standalone value of target — sub-buckets: {{c1::Historical financials and trajectory}}, {{c2::Market position and defensibility}}, {{c3::Quality of revenue (recurring vs. one-time, customer concentration)}}, {{c4::Quality of management and team}}, {{c5::Hidden liabilities (litigation, tech debt, churn risk)}}, {{c6::DCF or multiples-based valuation}}."
  ),
  cloze(
    "bucket_menus",
    9,
    "M&A · Synergies — sub-buckets: {{c1::Revenue synergies (cross-sell, geo expansion, bundling, pricing power — usually overestimated, discount heavily)}}, {{c2::Cost synergies (overhead consolidation, procurement scale, facility/HQ rationalization, IT)}}, {{c3::Time-to-realize (most synergies take 18–36 months)}}, {{c4::Probability-weighted value (best/base/worst)}}."
  ),
  cloze(
    "bucket_menus",
    10,
    "M&A · Integration risk and cost — sub-buckets: {{c1::One-time integration costs (severance, system migration, rebranding, consulting)}}, {{c2::Cultural fit and key talent retention}}, {{c3::Customer disruption risk during integration}}, {{c4::Operational complexity (international or different business models)}}, {{c5::Management bandwidth required}}."
  ),
  cloze(
    "bucket_menus",
    11,
    "M&A · Strategic fit and alternatives — sub-buckets: {{c1::Does this advance the corporate strategy?}}, {{c2::Build vs. buy vs. partner — cheaper to develop in-house?}}, {{c3::Other targets available (forces price discipline)}}, {{c4::Defensive rationale — blocking a competitor's move}}. Final test: {{c5::standalone value + synergies − integration costs vs. price paid → does it create value?}}"
  ),

  // New product launch
  cloze(
    "bucket_menus",
    12,
    "New product launch · Market demand — sub-buckets: {{c1::Unmet need or pain point being solved}}, {{c2::Target customer segment size and willingness to pay}}, {{c3::Adoption curve — who buys first, who follows}}, {{c4::Substitutes and what customers do today}}, {{c5::Pricing strategy (penetration vs. premium)}}."
  ),
  cloze(
    "bucket_menus",
    13,
    "New product launch · Competitive response — sub-buckets: {{c1::Existing competitors and likely reaction (cut price, launch competing product, acquire us)}}, {{c2::New entrants attracted by us proving the market}}, {{c3::Defensibility (IP, network effects, switching costs, brand)}}, {{c4::Time advantage — how long before we're copied?}}."
  ),
  cloze(
    "bucket_menus",
    14,
    "New product launch · Internal capability and fit — sub-buckets: {{c1::Tech/product capability (build vs. partner)}}, {{c2::Channel fit (does our existing sales motion work?)}}, {{c3::Brand fit (does this fit our positioning, or confuse customers?)}}, {{c4::Cannibalization risk of existing products}}, {{c5::Operational capability (manufacturing, supply chain, support)}}."
  ),
  cloze(
    "bucket_menus",
    15,
    "New product launch · Financial viability — sub-buckets: {{c1::Unit economics (gross margin, contribution margin)}}, {{c2::Investment required (R&D, launch marketing, inventory)}}, {{c3::Volume projections (pessimistic/base/optimistic)}}, {{c4::Breakeven timeline and NPV}}, {{c5::Return on investment vs. alternatives}}."
  ),

  // Pricing
  cloze(
    "bucket_menus",
    16,
    "Pricing · Cost-based floor — sub-buckets: {{c1::Variable cost per unit (price floor in the long run)}}, {{c2::Fully loaded cost (allocated fixed costs)}}, {{c3::Marginal cost considerations for incremental units}}, {{c4::Cost trajectory — will costs rise/fall?}}."
  ),
  cloze(
    "bucket_menus",
    17,
    "Pricing · Value-based ceiling — sub-buckets: {{c1::Customer willingness to pay (survey, conjoint, A/B test)}}, {{c2::Quantified value delivered (ROI, savings, productivity)}}, {{c3::Segmentation by WTP — do segments value differently?}}, {{c4::Anchor pricing and reference points}}."
  ),
  cloze(
    "bucket_menus",
    18,
    "Pricing · Competitive benchmark — sub-buckets: {{c1::Competitor pricing for direct equivalents}}, {{c2::Competitor pricing for substitutes}}, {{c3::Our differentiation premium/discount — justified?}}, {{c4::Likely competitive response to our price moves}}."
  ),
  cloze(
    "bucket_menus",
    19,
    "Pricing · Strategic objective — sub-buckets: {{c1::Penetration (low price, gain share) vs. skim (high price, max margin early)}}, {{c2::Bundling, tiering, freemium structure}}, {{c3::Discounting and promotion strategy}}, {{c4::Channel pricing differences}}, {{c5::Long-term positioning (premium, value, mass)}}."
  ),

  // Growth strategy
  cloze(
    "bucket_menus",
    20,
    "Growth · Organic (Ansoff matrix) — quadrants: {{c1::Existing products → existing customers (share of wallet, frequency, retention)}}, {{c2::Existing products → new customers (new geographies, segments, channels)}}, {{c3::New products → existing customers (cross-sell, line extensions, premium tiers)}}, {{c4::New products → new customers (true diversification — riskiest)}}."
  ),
  cloze(
    "bucket_menus",
    21,
    "Growth · Inorganic — sub-buckets: {{c1::Acquisitions (bolt-on for capability/customer/geography vs. transformational)}}, {{c2::Partnerships and JVs (shared risk and capability)}}, {{c3::Licensing or franchising}}, {{c4::Minority investments / corporate venture}}."
  ),
  cloze(
    "bucket_menus",
    22,
    "Growth · Capability and resource lens — questions: {{c1::What do we have? (brand, customers, tech, distribution, capital)}}, {{c2::What's the highest-leverage asset?}}, {{c3::Where is our right to win strongest?}}."
  ),
  cloze(
    "bucket_menus",
    23,
    "Growth · Strategic prioritization — criteria: {{c1::Size of prize per option}}, {{c2::Probability of success}}, {{c3::Time to impact}}, {{c4::Capital required}}, {{c5::Strategic optionality created}}."
  ),

  // Operations / cost reduction
  cloze(
    "bucket_menus",
    24,
    "Cost reduction · By cost type — sub-buckets: {{c1::COGS (materials, direct labor, overhead, freight)}}, {{c2::SG&A (sales, marketing, G&A, real estate)}}, {{c3::R&D (prioritization, build vs. buy)}}, {{c4::Fixed vs. variable — where can we flex with volume?}}."
  ),
  cloze(
    "bucket_menus",
    25,
    "Cost reduction · By process / value chain: {{c1::Inbound logistics}}, {{c2::Operations / production}}, {{c3::Outbound logistics}}, {{c4::Marketing and sales}}, {{c5::Service / post-sale support}}. Ask: where is the biggest waste, bottleneck, or inefficiency?"
  ),
  cloze(
    "bucket_menus",
    26,
    "Cost reduction · By function — sub-buckets: {{c1::Procurement (supplier consolidation, renegotiation, alternative materials)}}, {{c2::Manufacturing (yield improvement, automation, plant consolidation)}}, {{c3::Supply chain (inventory reduction, network optimization, freight)}}, {{c4::Workforce (span of control, layers, productivity, outsourcing)}}, {{c5::Real estate (footprint reduction, lease renegotiation, hybrid work)}}."
  ),
  cloze(
    "bucket_menus",
    27,
    "Cost reduction · Strategic vs. tactical: {{c1::Quick wins (renegotiate contracts, reduce discretionary) — months}}, {{c2::Structural changes (org redesign, plant closure, automation) — 1–2 years}}, {{c3::Transformation (business model, tech platform) — 3+ years}}. Risk: {{c4::cost cuts that hurt revenue or capability}}."
  ),

  // NGO / social sector
  cloze(
    "bucket_menus",
    28,
    "NGO · Benefits to stakeholders — sub-buckets: {{c1::Beneficiary group 1 (recipients): access, quality, cost savings, time savings}}, {{c2::Beneficiary group 2 (the NGO itself): mission advancement, financial sustainability, scale}}, {{c3::Beneficiary group 3 (partners, government, donors): aligned incentives, reputational gain}}. Quantify {{c4::reach × depth × durability of impact}}."
  ),
  cloze(
    "bucket_menus",
    29,
    "NGO · Costs and risks — sub-buckets: {{c1::Financial costs (capex, opex, ongoing subsidy required)}}, {{c2::Operational risk (capacity, capability, execution)}}, {{c3::Reputational risk (mission creep, public perception)}}, {{c4::Beneficiary risk (unintended harm, dependency, exclusion of some groups)}}."
  ),
  cloze(
    "bucket_menus",
    30,
    "NGO · Feasibility and sustainability — sub-buckets: {{c1::Operational feasibility (people, systems, partners)}}, {{c2::Political/regulatory feasibility (government buy-in, legal structure)}}, {{c3::Financial sustainability (who funds it long-term, at what cost)}}, {{c4::Scalability — can it grow beyond pilot?}}, {{c5::Exit strategy (long-term ownership)}}."
  ),

  // ── Section 4: SaaS worked walkthrough ─────────────────────────────────────
  basic(
    "saas_walkthrough",
    1,
    "Step 1 — Identify the case type. The prompt is: HR-SaaS NRR dropped from 118% → 102%, growth slowed from 45% → 28%. What case type, and what's the twist?",
    "Fundamentally a profitability / health-decline case — but with a SaaS twist (NRR drop, not raw profit drop). Use the profitability bucket menu, weighted toward SaaS unit economics.",
    "Profitability + SaaS lens."
  ),
  basic(
    "saas_walkthrough",
    2,
    "Step 2 — Ask 2–3 clarifying questions for the HR-SaaS case. What three questions and why?",
    "1. Is the NRR drop driven by higher gross churn, lower expansion, or both? (decomposes the math) 2. Is the slowdown uniform across cohorts/segments, or concentrated in a specific cohort or vertical? (tests for concentration) 3. Has anything changed externally — new competitor, pricing change, product issue, sales leadership? (surfaces root causes) Skip: timeframe (given), capital (not relevant yet), geography (assume US mid-market).",
    "Decompose math, test concentration, surface root cause."
  ),
  basic(
    "saas_walkthrough",
    3,
    "Step 3 — Drop a hypothesis BEFORE structuring. What hypothesis would you state for the HR-SaaS NRR drop, and why?",
    "“My initial hypothesis is that this is primarily an expansion problem rather than a churn problem — NRR went from 118 to 102, which is a 16-point swing, and gross retention rarely moves that much that fast. Most likely: customers stopped expanding because the product hit a usage ceiling, or competitors are now winning the upsell motion. But I'd want to test churn-side too. Let me lay out the structure.”",
    "Math points to expansion, but test churn too."
  ),
  basic(
    "saas_walkthrough",
    4,
    "Step 4 — Pick the buckets, tailored to SaaS. What three buckets would you propose, and what generic items do you deliberately leave out?",
    "Bucket A — Revenue health (gross retention, expansion revenue, new ARR / new logo growth, cohort behavior). Bucket B — Product / customer fit (usage trends, feature gaps, ICP fit, NPS/CSAT). Bucket C — External / competitive (new entrants like Rippling/Deel, incumbent moves like Workday down-market, macro budget tightening, buyer consolidation). Deliberately left out: generic “cost drivers” bucket (question is about NRR/growth, not margin). Channel mix and geography mix — not relevant for mid-market US SaaS at this scale.",
    "Revenue health, product fit, external. Cut cost / channel / geography."
  ),
  basic(
    "saas_walkthrough",
    5,
    "Step 5 — Propose where to start, but be flexible. What's the proposed starting point, and how do you offer to flex?",
    "“I'd propose starting with Bucket A — specifically decomposing NRR into gross retention vs. expansion. That single analysis will tell us whether this is a churn or expansion problem, which determines everything else. If you'd rather start with the external/competitive view, I'm happy to flex.”",
    "Start where the math gets decomposed; offer to flex."
  ),
  basic(
    "saas_walkthrough",
    6,
    "Step 6 — Drive the analysis, then synthesize. The interviewer reveals: gross retention stable at 92%, expansion dropped from 26% to 10%. What three moves do you make?",
    "1. State what the data implies: “Expansion is the problem, not churn. So we should focus there.” 2. Drill down with hypotheses: “Expansion typically comes from seat additions, module upsells, or tier upgrades. Which has dropped most?” 3. Connect to recommendation: “If it's seat additions, that's a customer-growth issue (their headcount isn't growing). If it's module upsells, that's a sales motion or product issue.”",
    "Imply → hypothesize → connect."
  ),
  basic(
    "saas_walkthrough",
    7,
    "Step 7 — Synthesize using the standard pattern. What is the four-part synthesis structure, applied to the HR-SaaS case?",
    "Recommendation → Logic → Risks → Next steps. “Rebuild the expansion motion (gross retention is healthy, expansion drove the NRR drop). Reasons: (1) expansion fell 26%→10% while churn stable — math points squarely at expansion; (2) mid-market headcount growth has likely slowed in this macro, removing seat-expansion as a passive driver — need an active upsell motion. Risks: if competitors take share at renewal, gross retention deteriorates next — monitor. Next steps: (1) cohort analysis on expansion by tenure and segment; (2) sales motion audit on CS upsell playbook; (3) competitive win/loss interviews with at-risk accounts.”",
    "Rec → logic → risks → next steps."
  ),

  // ── Section 5: Bucket DOs and DON'Ts ──────────────────────────────────────
  cloze(
    "bucket_dos_donts",
    1,
    "Bucket DOs: {{c1::Customize bucket names to the case (e.g., “Revenue health” instead of “Revenue drivers” for SaaS)}}, {{c2::State a hypothesis before structuring — shows judgment}}, {{c3::Explicitly say what you're excluding and why (“not including geography mix because the client is US-only”)}}, {{c4::Propose where to start, but offer to flex}}, {{c5::Tie sub-bucket choices to the specific case context}}."
  ),
  cloze(
    "bucket_dos_donts",
    2,
    "Bucket DON'Ts: {{c1::List every sub-bucket from memory — looks like a textbook}}, {{c2::Use generic bucket names when industry-specific ones fit better}}, {{c3::Forget to clarify the objective before structuring}}, {{c4::Treat the menu as a script — context always overrides the menu}}, {{c5::Skip the synthesis step at the end (recommendation → logic → risks → next steps)}}."
  ),
  basic(
    "bucket_dos_donts",
    3,
    "What's the closing one-liner that captures the entire bucket philosophy?",
    "The objective drives the structure. The context drives the sub-buckets. Buckets are a menu, not a script.",
    "Objective → structure. Context → sub-buckets."
  ),

  // ── Section 6: Financial metrics + SaaS (existing) ────────────────────────
  basic(
    "financial_metrics",
    1,
    "Define NPV and when to use it.",
    "Net Present Value = sum of discounted cash flows. Positive NPV = project creates value. Use to compare investments or evaluate go/no-go decisions.",
    "Discounted cash flows."
  ),
  basic(
    "financial_metrics",
    2,
    "Define IRR and what you compare it against.",
    "Internal Rate of Return = the discount rate at which NPV = 0. Compare to hurdle rate (typically 10-15% for corporates). Above hurdle = accept.",
    "Where NPV = 0."
  ),
  basic(
    "financial_metrics",
    3,
    "Define payback period and why it's used.",
    "Time required to recoup the initial investment. Quick gut check on risk; doesn't account for time value of money or post-payback returns.",
    "Time to recoup."
  ),
  basic(
    "financial_metrics",
    4,
    "Breakeven formula?",
    "Breakeven units = Fixed costs / Contribution margin per unit. Where contribution margin = price − variable cost per unit.",
    "Fixed / contribution."
  ),
  basic(
    "financial_metrics",
    5,
    "Gross margin benchmarks: SaaS, retail, grocery, premium consumer goods?",
    "SaaS 70-85%, Retail 25-40%, Grocery 20-25%, Premium consumer 50-70%.",
    "SaaS highest, grocery lowest."
  ),
  basic(
    "financial_metrics",
    6,
    "EBITDA margin benchmarks: tech vs. mature industrial?",
    "Tech: 20-40%. Mature industrial: 10-20%.",
    "Tech roughly 2x industrial."
  ),
  basic(
    "financial_metrics",
    7,
    "What is the Rule of 40 and what does it tell you?",
    "Rule of 40 (SaaS): Growth rate (%) + EBITDA margin (%) ≥ 40 = healthy SaaS company. Captures the growth-vs-profitability tradeoff.",
    "Growth + margin ≥ 40."
  ),
  basic(
    "financial_metrics",
    8,
    "Define burn multiple and the benchmark thresholds.",
    "Burn multiple = Net burn / Net new ARR. <1 = great capital efficiency, 1-2 = okay, >2 = bad. Tells you how much you're burning per dollar of new ARR.",
    "Burn per new ARR."
  ),
  basic(
    "financial_metrics",
    9,
    "SaaS — define ARR and MRR.",
    "ARR = Annual Recurring Revenue (annualized run-rate of subscription revenue). MRR = Monthly Recurring Revenue. ARR = MRR × 12. Excludes one-time fees.",
    "Annualized subscription revenue."
  ),
  basic(
    "financial_metrics",
    10,
    "SaaS — what's CAC, what's LTV, and what's the formula linking them?",
    "CAC = Customer Acquisition Cost (sales & marketing spend / new customers acquired). LTV = Lifetime Value = ARPU × Gross Margin / Churn rate. Healthy LTV/CAC ratio ≥ 3:1.",
    "Cost vs. lifetime value."
  ),
  basic(
    "financial_metrics",
    11,
    "SaaS — what's CAC payback and the benchmark?",
    "CAC Payback = CAC / (ARPU × Gross Margin), measured in months. Benchmark: <12 months excellent, 12-18 healthy, 18-24 concerning, >24 broken.",
    "Months to recover CAC."
  ),
  basic(
    "financial_metrics",
    12,
    "SaaS — define gross retention vs. net retention (NRR / NDR).",
    "Gross Revenue Retention = % of starting ARR retained, excluding expansion (caps at 100%). Net Revenue Retention (NRR/NDR) = includes upsells/expansion (can exceed 100%). Best-in-class NRR: 120%+.",
    "One excludes expansion, one includes it."
  ),
  basic(
    "financial_metrics",
    13,
    "SaaS — define churn (logo vs. revenue) and benchmarks.",
    "Logo churn = % of customers lost. Revenue churn = % of ARR lost. Benchmarks: SMB ~5% monthly is okay, mid-market ~1-2% monthly, enterprise <1% monthly (or <10% annual).",
    "Customers lost vs. dollars lost."
  ),
  basic(
    "financial_metrics",
    14,
    "SaaS — what is the magic number and what does it measure?",
    "Magic Number = (Net new ARR × 4) / Sales & Marketing spend in prior quarter. Measures S&M efficiency. >1 = invest more, 0.5-1 = okay, <0.5 = pull back.",
    "Sales efficiency ratio."
  ),
  basic(
    "financial_metrics",
    15,
    "SaaS — what's the difference between bookings, billings, and revenue?",
    "Bookings = total value of contracts signed (forward-looking). Billings = invoiced amount in period. Revenue = recognized ratably over service period (GAAP). Bookings → Billings → Revenue.",
    "Signed → invoiced → recognized."
  ),
  basic(
    "financial_metrics",
    16,
    "SaaS — what is PLG and why does it change the metrics that matter?",
    "Product-Led Growth = users adopt the product (often free/freemium) before sales engages. Shifts focus to: activation rate, time-to-value, free-to-paid conversion, viral coefficient. CAC is lower but ARPU often lower too.",
    "Self-serve adoption funnel."
  ),

  // ── Section 7: Clarifying questions drill (existing) ──────────────────────
  basic(
    "clarifying",
    1,
    "Case prompt: 'Our client, a regional bank, is considering launching a new credit card. Should they?' — give 2-3 clarifying questions you'd ask first.",
    "1. What is the client optimizing for — profit, customer acquisition, cross-sell, deposit retention? 2. What's the timeframe and target (e.g., breakeven by year 3)? 3. Any constraints — capital, regulatory, target customer segment?",
    "Objective, target, constraints."
  ),
  basic(
    "clarifying",
    2,
    "Case prompt: 'Our client, a logistics company, has seen profits decline 15% over 2 years.' — give 2-3 clarifying questions.",
    "1. Is the decline revenue-side, cost-side, or both? 2. Is the decline uniform across business lines/geographies or concentrated? 3. What's happening with volume vs. price/mix? Any major external changes (fuel costs, competitor moves)?",
    "Decompose the decline before structuring."
  ),
  basic(
    "clarifying",
    3,
    "Case prompt: 'A PE firm is considering acquiring a mid-market SaaS company.' — give 2-3 clarifying questions.",
    "1. What's the investment thesis — growth, margin expansion, multiple arbitrage, platform play? 2. Hold period and target return (e.g., 3x in 5 years)? 3. Any operating constraints — willing to inject capital, change management, integrate?",
    "Thesis, hold, capabilities."
  ),
  basic(
    "clarifying",
    4,
    "Case prompt: 'A non-profit wants to expand its tutoring program from 1 city to 10.' — give 2-3 clarifying questions.",
    "1. What's the success metric — students served, learning outcomes, cost per student? 2. What's the funding model and is it portable? 3. Are there operational constraints — staff, partnerships, target student demographic?",
    "Mission objective, money, model."
  ),
  basic(
    "clarifying",
    5,
    "Case prompt: 'A retailer is deciding whether to launch a private label brand.' — give 2-3 clarifying questions.",
    "1. What's the strategic goal — margin expansion, customer loyalty, defensive vs. national brands? 2. What categories are being considered, and what's the target margin uplift? 3. Capabilities — sourcing, manufacturing, brand-building experience?",
    "Why private label, where, with what."
  ),
  basic(
    "clarifying",
    6,
    "Case prompt: 'A pharma company's blockbuster drug is going off-patent in 18 months.' — give 2-3 clarifying questions.",
    "1. What's the goal — defend revenue, harvest profits, reinvest in pipeline? 2. What % of total company revenue does this drug represent? 3. What's the pipeline status and any line extensions or follow-on indications available?",
    "Strategic posture, exposure, pipeline."
  ),
  basic(
    "clarifying",
    7,
    "Case prompt: 'An airline wants to know if it should add a new transatlantic route.' — give 2-3 clarifying questions.",
    "1. What's the financial target — load factor, yield, contribution margin? 2. Is this incremental capacity (new aircraft) or reallocation from another route? 3. Any strategic considerations — hub strategy, alliance partners, competitive response?",
    "Economics, capacity source, strategy."
  ),
  basic(
    "clarifying",
    8,
    "What 5 clarifying questions should you have ready as 'always-ask' candidates for any case?",
    "1. What is the client optimizing for, over what timeframe? 2. What's the success metric or target? 3. What's the scope (geography, product, BU)? 4. What triggered this question / why now? 5. Any constraints (capital, regulatory, strategic preferences)?",
    "Objective, target, scope, trigger, constraints."
  ),
  basic(
    "clarifying",
    9,
    "Why is asking clarifying questions a differentiator for McKinsey candidates?",
    "It signals that you reason from objectives down, not from frameworks up. Strong candidates shape the problem before structuring; weak ones jump to a generic framework. Clarifying = client-mindset.",
    "Reasoning posture, not just info-gathering."
  ),
  basic(
    "clarifying",
    10,
    "What's the rule for HOW MANY clarifying questions to ask?",
    "2-3 tailored to the case — not all 5 generic ones. Pick the questions that most change your structure if answered differently. Asking too many wastes time; asking none means you're structuring blind.",
    "Quality over quantity. 2-3."
  ),

  // ── Section 8: Industry unit economics (existing) ─────────────────────────
  basic(
    "unit_economics",
    1,
    "Retail — revenue per store decomposes into what three drivers?",
    "Revenue per store = Traffic × Conversion rate × Average basket size. Total revenue = # stores × revenue per store.",
    "Foot traffic to checkout."
  ),
  basic(
    "unit_economics",
    2,
    "Airline — revenue equation in two equivalent forms?",
    "Form 1: RPK (revenue passenger kilometers) × yield. Form 2: Load factor × Capacity (ASK) × Yield. Key costs: fuel, labor, aircraft (lease/depreciation), airport fees.",
    "Capacity × utilization × price."
  ),
  basic(
    "unit_economics",
    3,
    "Hotel — what is RevPAR and how is it calculated?",
    "RevPAR = Revenue Per Available Room = Occupancy × ADR (Average Daily Rate). The single most important hotel KPI.",
    "Occupancy × ADR."
  ),
  basic(
    "unit_economics",
    4,
    "Bank — define Net Interest Margin and what else drives bank revenue.",
    "NIM = (Interest income − Interest expense) / earning assets. Plus: non-interest fee income (cards, advisory, transactions). Minus: opex and loan loss provisions.",
    "Spread plus fees."
  ),
  basic(
    "unit_economics",
    5,
    "Insurance — what is the combined ratio and what does <100% mean?",
    "Combined Ratio = (Claims + Expenses) / Premiums. <100% = underwriting profit. >100% = underwriting loss (insurer relies on investment income to be profitable).",
    "Underwriting profitability."
  ),
  basic(
    "unit_economics",
    6,
    "Manufacturing — what are the three key drivers of revenue?",
    "Capacity utilization × Yield (% good output) × Price per unit. Costs split into raw materials, labor, and overhead.",
    "Use it, get it right, sell it."
  ),
  basic(
    "unit_economics",
    7,
    "Marketplace — what is GMV and how does revenue relate?",
    "GMV = Gross Merchandise Value (total transaction value flowing through the platform). Revenue = GMV × Take rate. Both supply-side and demand-side liquidity must be tracked.",
    "Throughput × cut."
  ),
  basic(
    "unit_economics",
    8,
    "Hospital — how does revenue decompose, and what's the largest cost line?",
    "Revenue = Patient volume × Revenue per patient. Revenue per patient = Case mix × Reimbursement rate by payer (commercial > Medicare > Medicaid). Labor is largest cost (50-60%), then supplies and facilities.",
    "Volume × mix × payer."
  ),
  basic(
    "unit_economics",
    9,
    "Why does payer mix matter so much for hospital margins?",
    "Commercial insurance pays 100%, Medicare ~70-80% of commercial rates, Medicaid ~60-70%. A shift from commercial to Medicaid can swing margins multiple points even with flat volume. For-profit competitors often cherry-pick commercial patients.",
    "Same patient, different payer = different revenue."
  ),
  basic(
    "unit_economics",
    10,
    "Grocery vs. premium consumer goods — why does gross margin differ so dramatically?",
    "Grocery: 20-25% gross margin, high volume / low ticket / low differentiation. Premium consumer (e.g., cosmetics, luxury): 50-70%, low volume / high ticket / high brand equity. Margin reflects pricing power, not just cost.",
    "Pricing power vs. commodity."
  ),
  basic(
    "unit_economics",
    11,
    "Restaurant — typical cost structure breakdown?",
    "Food cost ~28-32%, Labor ~28-32%, Rent/occupancy ~6-10%, Other (utilities, marketing, supplies) ~10-15%. Restaurant margins are thin: 5-10% EBITDA is healthy, 15%+ is excellent.",
    "Food + labor + rent dominate."
  ),
  basic(
    "unit_economics",
    12,
    "Subscription consumer (e.g., streaming, gym) — what metrics mirror SaaS?",
    "Same playbook: ARPU, churn, LTV, CAC. Plus: content cost amortization (streaming) or facility utilization (gym). Churn is everything — small monthly churn compounds to massive annual losses.",
    "SaaS metrics, different cost structure."
  ),
];
