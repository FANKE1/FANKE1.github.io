/* ─────────────────────────────────────────────────────────────
   AI Coding Plan 对比 — 应用脚本
   功能：加载数据 / 平台筛选 / 搜索 / 列排序 / 渲染
   ───────────────────────────────────────────────────────────── */

const VENDOR_ORDER = [
  '智谱AI', 'Kimi', 'MiniMax', '阿里·百炼', '字节·方舟',
  '百度·千帆', '腾讯云', '讯飞·星火', '小米·MiMo'
];

// 平台品牌信息：CSS class slug + 字符 logo
const VENDOR_BRAND = {
  '智谱AI':       { slug: 'zhipu',     icon: '智' },
  'Kimi':         { slug: 'kimi',      icon: 'K' },
  'MiniMax':      { slug: 'minimax',   icon: 'M' },
  '小米·MiMo':    { slug: 'mimo',      icon: 'Mi' },
  '字节·方舟':    { slug: 'volc',      icon: '方' },
  '阿里·百炼':    { slug: 'bailian',   icon: '炼' },
  '百度·千帆':    { slug: 'baidu',     icon: '帆' },
  '腾讯云':       { slug: 'tencent',   icon: '腾' },
  '讯飞·星火':    { slug: 'xunfei',    icon: '星' },
};

// 模型系列归类（取前缀关键词）→ 颜色 class
function modelSeriesClass(name) {
  const n = String(name);
  if (/^GLM/i.test(n)) return 'm-glm';
  if (/^Qwen/i.test(n)) return 'm-qwen';
  if (/^Kimi/i.test(n)) return 'm-kimi';
  if (/^DeepSeek/i.test(n)) return 'm-deepseek';
  if (/^MiniMax/i.test(n)) return 'm-minimax';
  if (/^Doubao/i.test(n)) return 'm-doubao';
  if (/^MiMo/i.test(n)) return 'm-mimo';
  if (/^HY-/i.test(n)) return 'm-tencent';
  if (/^step-/i.test(n)) return 'm-step';
  return '';
}

// 推荐位文案（参考原作者整理后的口径，去掉外部跳转）
const RECOMMENDATIONS = [
  {
    name: '智谱AI',
    rating: 5,
    reasons: [
      '支持 GLM-5.1 模型，模型能力 T0 级别。+1',
      '提供免费 MCP 次数。+1',
      '尤其适合代码场景，Opus 平替。',
      '需要抢购，能抢到就赚到。'
    ]
  },
  {
    name: '讯飞·星火',
    rating: 5,
    reasons: [
      '支持 GLM-5.1、DeepSeek-V4-Pro/Flash。+1',
      '无忧版即支持 Qwen3.5-35B-A3B（20M/日）。+0.5',
      '抢不到智谱的最佳平替，无需抢购，39 元即提供 GLM-5.1。+0.5'
    ]
  },
  {
    name: 'MiniMax',
    rating: 5,
    reasons: [
      '支持 MiniMax-M3 模型。+1',
      '额度依然最高，适合养龙虾或日常编程任务。+0.5',
      '支持多模态。+0.5'
    ]
  },
  {
    name: '字节·方舟',
    rating: 5,
    reasons: [
      '前两月 2.5 折活动，叠加用量 2.5 倍活动，性价比突出。+1',
      '支持 GLM-5.1、DeepSeek-V4-Pro/Flash、MiniMax-M3、Kimi-K2.6。+1',
      '唯一同时支持 GLM、DeepSeek-V4-Pro/Flash、MiniMax、Kimi 四家最新模型的平台。'
    ]
  },
  {
    name: 'Kimi',
    rating: 3.5,
    reasons: [
      '支持 Kimi-K2.6，现在模型竞争力偏弱。+0.5',
      '提供实验性专业数据库功能。+0.5',
      '用量官方未说明，实测比其他家少一些。-1',
      '模型能力均衡，支持多模态（图像输入）。+0.5'
    ]
  }
];

const RATING_GUIDE = '基准 3 颗星，价格优势/劣势 ±1 分，模型优势或独占模型 +1 分，其他优势 +1 分。Token Plan 因性价比较低暂不推荐，能买 Coding Plan 尽量买 Coding Plan。';

// ─── 状态 ─────────────────────────────────────────────

const state = {
  plans: [],
  filter: { vendor: 'all', search: '', type: 'all' },
  sort: { col: null, dir: null }
};

// ─── 工具 ─────────────────────────────────────────────

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 动态更新日期
function updateDates(dateStr) {
  const pill = document.getElementById('updatePillText');
  const footer = document.getElementById('footerUpdateDate');
  if (pill) pill.textContent = `更新日期 ${dateStr} | 9 大主流平台对比`;
  if (footer) footer.textContent = dateStr;
}

// 检测限时活动关键词
function hasPromo(note) {
  if (!note) return false;
  return /活动|折|限时|促销|优惠期|倒计时/.test(note);
}

function isUsdVendor(v) {
  return /国际|Codex|Claude|GitHub|Ollama|OpenCode/.test(v || '');
}

// 货币 + 数值统一格式化
function fmtMoney(value, currency) {
  if (value == null || value === '' || value === '-') return '';
  if (typeof value === 'string') return value;
  return `${currency}${value}`;
}

// 价格主格 + 后缀 unit（如 /月）
function priceCell(value, currency, unitSuffix, cls) {
  if (value == null || value === '' || value === '-') {
    return `<span class="price-na">官方未提供</span>`;
  }
  if (typeof value === 'string') {
    return `<span class="${cls}">${escapeHtml(value)}</span>`;
  }
  const num = Math.round(value * 100) / 100;
  return `<span class="${cls}">${currency}${num}</span><span class="price-unit">${unitSuffix}</span>`;
}

function fmtRequests(value) {
  if (value == null || value === '' || value === '-') return `<span class="req-faint">-</span>`;
  if (typeof value === 'string') {
    if (value.includes('未公开') || value.includes('无限')) return `<span class="req-faint">${escapeHtml(value)}</span>`;
    return `<span class="req-num">${escapeHtml(value)}</span>`;
  }
  return `<span class="req-num">${value.toLocaleString()}</span>`;
}

function stars(n) {
  const full = Math.floor(n);
  const half = n - full >= 0.5;
  return '⭐'.repeat(full) + (half ? '½' : '');
}

// ─── 渲染 ─────────────────────────────────────────────

function renderVendorBar() {
  const root = document.getElementById('vendorBar');
  const items = ['all', ...VENDOR_ORDER];
  root.innerHTML = items.map(v => {
    const brand = VENDOR_BRAND[v];
    const isActive = state.filter.vendor === v;
    if (v === 'all') {
      return `<button class="chip ${isActive ? 'active' : ''}" data-vendor="all">全部</button>`;
    }
    const slug = brand ? brand.slug : '';
    const icon = brand ? brand.icon : '';
    return `<button class="chip chip-vendor v-${slug} ${isActive ? 'active' : ''}" data-vendor="${escapeHtml(v)}">
      <span class="chip-logo">${escapeHtml(icon)}</span>
      <span>${escapeHtml(v)}</span>
    </button>`;
  }).join('');
  root.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter.vendor = btn.dataset.vendor;
      renderVendorBar();
      renderTable();
    });
  });
}

function renderRecs() {
  // 推荐区块已移除
}

function applyFilters(plans) {
  const q = (state.filter.search || '').trim().toLowerCase();
  return plans.filter(p => {
    if (state.filter.vendor !== 'all' && p.vendor !== state.filter.vendor) return false;
    if (state.filter.type !== 'all' && p.type !== state.filter.type) return false;
    if (q) {
      const haystack = [
        p.vendor, p.plan, p.type,
        ...(p.models || []),
        ...(p.benefits || []),
        ...(p.tags || []),
        p.note || ''
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function applySort(plans) {
  const { col, dir } = state.sort;
  if (!col || !dir) return plans;
  const numericCols = new Set([
    'firstMonthPrice', 'monthlyPrice', 'quarterlyPrice', 'yearlyPrice',
    'fiveHoursRequests', 'weeklyRequests', 'monthlyRequests', 'rating'
  ]);
  const sorted = [...plans];
  sorted.sort((a, b) => {
    let av = a[col], bv = b[col];
    if (numericCols.has(col)) {
      av = (av == null || isNaN(av)) ? -Infinity : Number(av);
      bv = (bv == null || isNaN(bv)) ? -Infinity : Number(bv);
    } else {
      av = String(av ?? '');
      bv = String(bv ?? '');
      const r = av.localeCompare(bv, 'zh-CN');
      return dir === 'asc' ? r : -r;
    }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

function renderTable() {
  const tbody = document.getElementById('tbody');
  const filtered = applyFilters(state.plans);
  const sorted = applySort(filtered);

  document.getElementById('statsCount').textContent = sorted.length;
  document.getElementById('statsTotal').textContent = `/ ${state.plans.length}`;

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16"><div class="empty">
      🔍 没有符合条件的套餐
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(p => {
    const usd = isUsdVendor(p.vendor);
    const cur = usd ? '$' : '¥';

    const linkBtn = p.link
      ? `<a class="action-btn" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">开通</a>`
      : `<a class="action-btn disabled" href="javascript:void(0)">开通</a>`;

    const firstRaw = (p.firstMonthPrice == null || p.firstMonthPrice === '-' || p.firstMonthPrice === '')
      ? p.monthlyPrice
      : p.firstMonthPrice;
    const firstMonth = priceCell(firstRaw, cur, '/首月', 'price-first');
    const monthly = priceCell(p.monthlyPrice, cur, '/月', 'price-monthly');
    const quarterly = priceCell(p.quarterlyPrice, cur, '/季', 'price-plain');
    const yearly = priceCell(p.yearlyPrice, cur, '/年', 'price-plain');

    const models = (p.models || []).map(m =>
      `<span class="model-tag ${modelSeriesClass(m)}">${escapeHtml(m)}</span>`
    ).join('');

    const benefits = (p.benefits || []).map(b =>
      `<span class="benefit">${escapeHtml(b)}</span>`
    ).join('') || '<span class="price-dash">-</span>';

    const tokenLimit = p.tokenLimit
      ? `<span class="token-limit">${escapeHtml(p.tokenLimit)}</span>`
      : '<span class="price-dash">-</span>';

    const typeClass = p.type === 'Coding Plan' ? 'coding' : 'token';

    const measuredM = p.measuredMonthlyTokenLimit;
    const measuredCell = (measuredM == null)
      ? '<span class="measured-pending">待测</span>'
      : `<span class="req-num">${measuredM}M</span>`;

    const brand = VENDOR_BRAND[p.vendor] || { slug: '', icon: '' };
    const vendorBlock = `<div class="vendor-block">
      <span class="vendor-logo v-${brand.slug}">${escapeHtml(brand.icon)}</span>
      <span class="vendor-name">${escapeHtml(p.vendor)}</span>
    </div>`;

    return `<tr>
      <td class="vendor-cell">${vendorBlock}</td>
      <td class="plan-cell">${escapeHtml(p.plan)}</td>
      <td><span class="type-tag ${typeClass}">${escapeHtml(p.type)}</span></td>
      <td>${linkBtn}</td>
      <td>${firstMonth}</td>
      <td>${monthly}</td>
      <td>${quarterly}</td>
      <td>${yearly}</td>
      <td class="model-cell">${models}</td>
      <td>${fmtRequests(p.fiveHoursRequests)}</td>
      <td>${fmtRequests(p.weeklyRequests)}</td>
      <td>${fmtRequests(p.monthlyRequests)}</td>
      <td>${measuredCell}</td>
      <td>${tokenLimit}</td>
      <td class="benefit-cell">${benefits}</td>
      <td class="note-cell">${hasPromo(p.note) ? '⏰ ' : ''}${escapeHtml(p.note || '-')}</td>
    </tr>`;
  }).join('');
}

function bindSort() {
  document.querySelectorAll('thead th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.sort.col === col) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' :
          state.sort.dir === 'desc' ? null : 'asc';
        if (state.sort.dir === null) state.sort.col = null;
      } else {
        state.sort.col = col;
        state.sort.dir = 'asc';
      }
      document.querySelectorAll('thead th').forEach(t =>
        t.classList.remove('sort-asc', 'sort-desc'));
      if (state.sort.dir) th.classList.add(`sort-${state.sort.dir}`);
      renderTable();
    });
  });
}

function bindSearch() {
  const input = document.getElementById('searchInput');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.filter.search = input.value;
      renderTable();
    }, 120);
  });
}

function bindTypeFilter() {
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter.type = btn.dataset.type;
      document.querySelectorAll('.type-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.type === state.filter.type));
      renderTable();
    });
  });
}

// ─── 启动 ─────────────────────────────────────────────

async function init() {
  try {
    const res = await fetch('plans.json', { cache: 'no-store' });
    const data = await res.json();
    // 兼容：支持旧版纯数组格式和新版 {meta, plans} 格式
    if (Array.isArray(data)) {
      state.plans = data;
    } else {
      state.plans = data.plans || [];
      if (data.meta && data.meta.lastUpdated) {
        updateDates(data.meta.lastUpdated);
      }
    }
  } catch (e) {
    console.error('Failed to load plans.json:', e);
    document.getElementById('tbody').innerHTML = `<tr><td colspan="16">
      <div class="empty">⚠️ 数据加载失败，请检查 plans.json</div></td></tr>`;
    return;
  }
  renderVendorBar();
  renderRecs();
  bindSort();
  bindSearch();
  bindTypeFilter();
  renderTable();
}

document.addEventListener('DOMContentLoaded', init);
