/**
 * Cloudflare Pages Function — DeepSeek API 代理
 *
 * 浏览器端调用 /api/review，此函数添加 API Key 并转发给 DeepSeek，
 * 确保密钥对客户端不可见。
 *
 * 在 Cloudflare Dashboard → Pages → 你的项目 → Settings → Environment variables 中设置：
 *   - 变量名: DEEPSEEK_API_KEY
 *   - 值:     sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   - 勾选 "Encrypt"（加密）
 */

export async function onRequest(context) {
  const { request, env } = context;

  // 仅允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 读取环境变量中的 API Key（在 Cloudflare Dashboard 中配置）
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 接收客户端发来的请求体
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // （可选）请求体校验：限制 model 范围，防止盗用
  const allowedModels = ['deepseek-chat', 'deepseek-reasoner'];
  if (!body.model || !allowedModels.includes(body.model)) {
    return new Response(JSON.stringify({ error: 'Invalid model' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 限制 max_tokens，防滥用
  if (!body.max_tokens || body.max_tokens > 4096) {
    body.max_tokens = 4096;
  }

  // 转发到 DeepSeek API
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // 读取 DeepSeek 的响应
  const data = await response.json();

  // 将响应返回给客户端
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
