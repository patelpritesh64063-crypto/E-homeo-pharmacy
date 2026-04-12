import { Env } from '../env';
import { runStockAnalysis, StockAnalysisInput } from '../services/ai';
import { sendEmail } from '../services/email';

// ─── Daily Stock Analysis Cron Handler ───────────────────────────
// Triggered by Cloudflare Cron at 17:30 UTC (11 PM IST)
// Also callable manually from admin route.

export async function handleDailyStockCron(env: Env): Promise<{
  success: boolean;
  summary?: string;
  criticalCount?: number;
  error?: string;
}> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Get today's orders
    const { results: todayOrders } = await env.DB.prepare(
      `SELECT o.order_ref, o.created_at,
              GROUP_CONCAT(oi.product_id || ':' || oi.quantity || ':' || oi.price_at_time) as items_raw
       FROM orders o
       LEFT JOIN order_items oi ON o.order_ref = oi.order_ref
       WHERE DATE(o.created_at) = ?
       GROUP BY o.order_ref`
    ).bind(today).all() as any;

    // Calculate totals for each order
    const ordersWithTotals = (todayOrders || []).map((o: any) => {
      let total = 0;
      if (o.items_raw) {
        const parts = o.items_raw.split(',');
        for (const part of parts) {
          const [, qty, price] = part.split(':');
          total += parseInt(qty || '0') * parseFloat(price || '0');
        }
      }
      return {
        order_ref: o.order_ref,
        items: o.items_raw || '',
        total,
        created_at: o.created_at,
      };
    });

    // 2. Get full product list with stock info
    const { results: products } = await env.DB.prepare(
      'SELECT id, name, stock_qty, min_qty, cost_price, supplier_info FROM products WHERE active_flag = 1'
    ).all() as any;

    // 3. Get previous day's summary
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const prevSummary = await env.DB.prepare(
      'SELECT ai_insights FROM daily_summaries WHERE date = ?'
    ).bind(yesterday).first() as any;

    // 4. Run AI Stock Analysis
    const analysisInput: StockAnalysisInput = {
      todayOrders: ordersWithTotals,
      products: products || [],
      previousSummary: prevSummary?.ai_insights || null,
    };

    const result = await runStockAnalysis(env, analysisInput);

    // 5. Save to daily_summaries
    const stats = {
      total_orders: ordersWithTotals.length,
      total_sales: ordersWithTotals.reduce((s: number, o: any) => s + o.total, 0),
    };

    await env.DB.prepare(
      `INSERT INTO daily_summaries (date, stats, ai_insights, low_stock_data)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         stats = excluded.stats,
         ai_insights = excluded.ai_insights,
         low_stock_data = excluded.low_stock_data`
    ).bind(
      today,
      JSON.stringify(stats),
      JSON.stringify({ summary: result.summary, insights: result.insights }),
      JSON.stringify(result.lowStockAlerts)
    ).run();

    // 6. Create draft purchase orders for critical items
    for (const po of result.purchaseOrders) {
      const poNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await env.DB.prepare(
        'INSERT INTO purchase_orders (po_number, status, items) VALUES (?, ?, ?)'
      ).bind(
        poNumber,
        'draft',
        JSON.stringify({
          supplier: po.supplier,
          items: po.items,
          total_cost: po.total_cost,
          generated_by: 'ai-stock-agent',
          generated_at: new Date().toISOString(),
        })
      ).run();
    }

    // 7. Send critical stock email to admin
    const criticalAlerts = result.lowStockAlerts.filter(a => a.urgency === 'critical');
    if (criticalAlerts.length > 0) {
      await sendEmail(env, {
        to: env.ADMIN_EMAIL,
        subject: `⚠️ E-Pharm: ${criticalAlerts.length} Critical Stock Alerts`,
        html: buildCriticalStockEmail(result.summary, criticalAlerts, result.purchaseOrders),
      });
    }

    // 8. Log last run timestamp in KV
    await env.STORE_KV.put('CRON:last_stock_analysis', JSON.stringify({
      ran_at: new Date().toISOString(),
      date: today,
      orders_analyzed: ordersWithTotals.length,
      critical_alerts: criticalAlerts.length,
      pos_created: result.purchaseOrders.length,
    }));

    return {
      success: true,
      summary: result.summary,
      criticalCount: criticalAlerts.length,
    };

  } catch (err) {
    console.error('[Cron] Daily stock analysis failed:', err);
    await env.STORE_KV.put('CRON:last_stock_analysis_error', JSON.stringify({
      error: String(err),
      failed_at: new Date().toISOString(),
    }));
    return { success: false, error: String(err) };
  }
}

// ─── Critical Stock Email Template ───────────────────────────────

function buildCriticalStockEmail(
  summary: string,
  criticalAlerts: Array<{ product_name: string; current_stock: number; min_qty: number; urgency: string }>,
  purchaseOrders: Array<{ supplier: string; items: any[]; total_cost: number }>
): string {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; padding: 24px; background: #1e293b; color: #f1f5f9; max-width: 600px;">
      <div style="background: linear-gradient(135deg, #7C6FE9, #6355d8); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 20px; color: white;">⚠️ Critical Stock Alert — E-Pharm Store</h1>
      </div>
      
      <div style="background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #7C6FE9; margin-top: 0;">📊 AI Summary</h3>
        <p style="color: #94a3b8; line-height: 1.6;">${summary}</p>
      </div>
      
      <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #ef4444; margin-top: 0;">🚨 Critical Items (${criticalAlerts.length})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">
            <th style="text-align: left; padding: 8px;">Product</th>
            <th style="text-align: right; padding: 8px;">Stock</th>
            <th style="text-align: right; padding: 8px;">Min Qty</th>
          </tr>
          ${criticalAlerts.map(a => `
            <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 8px; color: #f1f5f9;">${a.product_name}</td>
              <td style="padding: 8px; text-align: right; color: #ef4444; font-weight: bold;">${a.current_stock}</td>
              <td style="padding: 8px; text-align: right; color: #94a3b8;">${a.min_qty}</td>
            </tr>
          `).join('')}
        </table>
      </div>
      
      ${purchaseOrders.length > 0 ? `
        <div style="background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #34D399; margin-top: 0;">📦 Auto-Generated Purchase Orders (${purchaseOrders.length})</h3>
          ${purchaseOrders.map(po => `
            <div style="margin-bottom: 12px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
              <strong style="color: #f1f5f9;">Supplier: ${po.supplier}</strong>
              <span style="color: #34D399; float: right;">₹${po.total_cost}</span>
              <ul style="color: #94a3b8; margin: 8px 0 0; padding-left: 20px;">
                ${po.items.map((i: any) => `<li>${i.product_name} × ${i.quantity}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
        Auto-generated by E-Pharm AI Stock Agent • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </p>
    </div>
  `;
}
