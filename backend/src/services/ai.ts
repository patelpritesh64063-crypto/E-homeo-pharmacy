import { Env } from '../env';

// ─── Core AI Runner ──────────────────────────────────────────────
// Uses Cloudflare Workers AI (free) — @cf/meta/llama-3.1-8b-instruct
// Falls back gracefully on any error.

interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function runAI(env: Env, messages: AiMessage[]): Promise<string> {
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 2048,
      temperature: 0.3,
    }) as any;

    // Workers AI returns { response: string }
    return result?.response || '';
  } catch (err) {
    console.error('[AI] Workers AI call failed:', err);
    return '';
  }
}

// ─── AGENT 1: Order Fraud Detection ─────────────────────────────

export interface FraudCheckInput {
  order: {
    order_ref: string;
    items: Array<{ product_name: string; quantity: number; price: number; max_daily_qty: number | null }>;
    total: number;
    delivery_type: string;
    notes: string;
    customer_email: string;
  };
  recentOrders: Array<{
    order_ref: string;
    created_at: string;
    item_count: number;
    total: number;
  }>;
  stockLevels: Array<{
    product_name: string;
    stock_qty: number;
    ordered_qty: number;
  }>;
}

export interface FraudCheckResult {
  decision: 'approved' | 'flagged';
  reasoning: string;
  flags: string[];
}

export async function runFraudCheck(env: Env, input: FraudCheckInput): Promise<FraudCheckResult> {
  const systemPrompt = `तुम E-Pharm Homeopathy Store के order fraud detection AI agent हो।
तुम्हें एक नया order, पिछले 24 घंटों के orders की history, और stock levels दिए जाएंगे।

तुम्हें check करना है:
1. क्या same email से 24 घंटों में duplicate/similar orders आए हैं?
2. क्या quantities product limits (max_daily_qty) से ज़्यादा हैं?
3. क्या order total असामान्य रूप से ज़्यादा है (₹5000 से ऊपर)?
4. क्या delivery notes में कुछ suspicious है?
5. क्या एक ही item bulk में order किया जा रहा है (>10 units)?

Response MUST be valid JSON only (no markdown, no extra text):
{
  "decision": "approved" या "flagged",
  "reasoning": "Hindi में स्पष्टीकरण",
  "flags": ["flag1", "flag2"]  // खाली array अगर approved
}`;

  const userPrompt = `नया Order:
- Order Ref: ${input.order.order_ref}
- Customer Email: ${input.order.customer_email}
- Delivery: ${input.order.delivery_type}
- Notes: "${input.order.notes || 'कोई नोट नहीं'}"
- Items:
${input.order.items.map(i => `  • ${i.product_name}: ${i.quantity} units × ₹${i.price} (Max daily: ${i.max_daily_qty ?? 'कोई limit नहीं'})`).join('\n')}
- Total: ₹${input.order.total}

पिछले 24 घंटे के orders (same email):
${input.recentOrders.length === 0 ? 'कोई पिछला order नहीं' : input.recentOrders.map(o => `  • ${o.order_ref} — ${o.item_count} items, ₹${o.total}, ${o.created_at}`).join('\n')}

Stock Levels:
${input.stockLevels.map(s => `  • ${s.product_name}: Stock=${s.stock_qty}, Ordered=${s.ordered_qty}`).join('\n')}

कृपया analyze करो और JSON response दो।`;

  const raw = await runAI(env, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // If AI fails entirely, default to approved
  if (!raw) {
    return {
      decision: 'approved',
      reasoning: 'AI उपलब्ध नहीं है — order auto-approved',
      flags: [],
    };
  }

  try {
    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      decision: parsed.decision === 'flagged' ? 'flagged' : 'approved',
      reasoning: parsed.reasoning || 'कोई विवरण नहीं',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch {
    console.error('[AI] Failed to parse fraud check response:', raw);
    return {
      decision: 'approved',
      reasoning: 'AI response parse error — order auto-approved',
      flags: [],
    };
  }
}

// ─── AGENT 2: Stock Analysis & Daily Summary ────────────────────

export interface StockAnalysisInput {
  todayOrders: Array<{
    order_ref: string;
    items: string; // JSON stringified
    total: number;
    created_at: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    stock_qty: number;
    min_qty: number;
    cost_price: number;
    supplier_info: string | null;
  }>;
  previousSummary: string | null;
}

export interface StockAnalysisResult {
  summary: string;
  lowStockAlerts: Array<{
    product_name: string;
    current_stock: number;
    min_qty: number;
    urgency: 'critical' | 'high' | 'medium';
  }>;
  purchaseOrders: Array<{
    supplier: string;
    items: Array<{
      product_name: string;
      product_id: string;
      quantity: number;
      estimated_cost: number;
    }>;
    total_cost: number;
  }>;
  insights: string;
}

export async function runStockAnalysis(env: Env, input: StockAnalysisInput): Promise<StockAnalysisResult> {
  const systemPrompt = `तुम E-Pharm Homeopathy Store के stock analysis AI agent हो।
तुम्हें आज के orders, पूरा product stock list, और पिछले दिन की summary दी जाएगी।

तुम्हें यह return करना है:
1. "summary" — आज का business summary (Hindi/Hinglish में)
2. "lowStockAlerts" — कम stock वाले products (urgency: critical/high/medium)
   - critical: stock = 0 या min_qty से 50% नीचे
   - high: stock min_qty से नीचे
   - medium: stock min_qty के करीब (min_qty + 5 तक)
3. "purchaseOrders" — critical items के लिए auto purchase orders, supplier wise group करो
   - quantity = min_qty * 2 (restock amount)
   - estimated_cost = quantity × cost_price
4. "insights" — business patterns और tips (Hindi/Hinglish)

Response MUST be valid JSON only (no markdown, no extra text):
{
  "summary": "...",
  "lowStockAlerts": [...],
  "purchaseOrders": [...],
  "insights": "..."
}`;

  const userPrompt = `आज के Orders (${input.todayOrders.length} total):
${input.todayOrders.length === 0 ? 'आज कोई order नहीं आया' : input.todayOrders.map(o => `  • ${o.order_ref}: ₹${o.total}, ${o.created_at}`).join('\n')}

Product Stock List:
${input.products.map(p => {
  const supplier = p.supplier_info ? JSON.parse(p.supplier_info) : { name: 'Unknown' };
  return `  • ${p.name} (ID: ${p.id}): Stock=${p.stock_qty}, Min=${p.min_qty}, Cost=₹${p.cost_price}, Supplier=${supplier.name || 'Unknown'}`;
}).join('\n')}

पिछले दिन की Summary:
${input.previousSummary || 'कोई पिछली summary नहीं'}

कृपया analyze करो और JSON response दो।`;

  const raw = await runAI(env, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  if (!raw) {
    // Fallback: compute basic low stock alerts without AI
    return computeFallbackAnalysis(input);
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || 'AI summary उपलब्ध नहीं',
      lowStockAlerts: Array.isArray(parsed.lowStockAlerts) ? parsed.lowStockAlerts : [],
      purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [],
      insights: parsed.insights || '',
    };
  } catch {
    console.error('[AI] Failed to parse stock analysis response:', raw);
    return computeFallbackAnalysis(input);
  }
}

// ─── Fallback when AI is unavailable ─────────────────────────────

function computeFallbackAnalysis(input: StockAnalysisInput): StockAnalysisResult {
  const lowStockAlerts: StockAnalysisResult['lowStockAlerts'] = [];
  const purchaseOrders: StockAnalysisResult['purchaseOrders'] = [];
  const supplierGroups: Record<string, StockAnalysisResult['purchaseOrders'][0]> = {};

  for (const p of input.products) {
    let urgency: 'critical' | 'high' | 'medium' | null = null;

    if (p.stock_qty === 0 || p.stock_qty < p.min_qty * 0.5) {
      urgency = 'critical';
    } else if (p.stock_qty < p.min_qty) {
      urgency = 'high';
    } else if (p.stock_qty <= p.min_qty + 5) {
      urgency = 'medium';
    }

    if (urgency) {
      lowStockAlerts.push({
        product_name: p.name,
        current_stock: p.stock_qty,
        min_qty: p.min_qty,
        urgency,
      });

      // Auto PO for critical items
      if (urgency === 'critical') {
        const supplier = p.supplier_info ? JSON.parse(p.supplier_info) : { name: 'Unknown' };
        const supplierName = supplier.name || 'Unknown';
        const qty = p.min_qty * 2;
        const cost = qty * p.cost_price;

        if (!supplierGroups[supplierName]) {
          supplierGroups[supplierName] = {
            supplier: supplierName,
            items: [],
            total_cost: 0,
          };
        }

        supplierGroups[supplierName].items.push({
          product_name: p.name,
          product_id: p.id,
          quantity: qty,
          estimated_cost: cost,
        });
        supplierGroups[supplierName].total_cost += cost;
      }
    }
  }

  return {
    summary: `आज ${input.todayOrders.length} orders आए। ${lowStockAlerts.length} products में stock कम है। (AI unavailable — fallback analysis)`,
    lowStockAlerts,
    purchaseOrders: Object.values(supplierGroups),
    insights: 'AI analysis उपलब्ध नहीं — basic stock check किया गया है।',
  };
}
