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

// 推荐区块已移除（保留 VENDOR_ORDER 供筛选栏/默认排序使用）

// ─── 状态 ─────────────────────────────────────────────

const state = {
  plans: [],
  filter: { vendor: 'all', search: '', type: 'all' },
  // 默认按连续包月价升序，让低价档先出现（用户最常按价格横向比较）
  sort: { col: 'monthlyPrice', dir: 'asc' }
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
  // 当前应用了搜索/类型筛选后的套餐数（vendor 计数始终基于当前 type+search 上下文，
  // 这样切换 Coding/Token 时各家平台的计数会同步更新；自身 vendor 筛选不参与计数）
  const ctxFilter = { ...state.filter, vendor: 'all' };
  const ctx = state.plans.filter(p => {
    if (ctxFilter.type !== 'all' && p.type !== ctxFilter.type) return false;
    const q = (ctxFilter.search || '').trim().toLowerCase();
    if (q) {
      const hay = [p.vendor, p.plan, p.type, ...(p.models || []), ...(p.benefits || []), ...(p.tags || []), p.note || ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const counts = ctx.reduce((m, p) => (m[p.vendor] = (m[p.vendor] || 0) + 1, m), {});
  const totalCount = ctx.length;

  root.innerHTML = items.map(v => {
    const brand = VENDOR_BRAND[v];
    const isActive = state.filter.vendor === v;
    if (v === 'all') {
      return `<button class="chip ${isActive ? 'active' : ''}" data-vendor="all">
        <span>全部</span>
        <span class="chip-count">${totalCount}</span>
      </button>`;
    }
    const slug = brand ? brand.slug : '';
    const icon = brand ? brand.icon : '';
    const c = counts[v] || 0;
    const dim = c === 0 ? ' chip-empty' : '';
    return `<button class="chip chip-vendor v-${slug} ${isActive ? 'active' : ''}${dim}" data-vendor="${escapeHtml(v)}">
      <span class="chip-logo">${escapeHtml(icon)}</span>
      <span>${escapeHtml(v)}</span>
      <span class="chip-count">${c}</span>
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
    'fiveHoursRequests', 'weeklyRequests', 'monthlyRequests', 'rating',
    'measuredMonthlyTokenLimit'
  ]);
  const sorted = [...plans];
  // 缺失值约定：无论升降序都沉到末尾，避免 "-" 在升序时排在 0 之前误导用户
  const isMissing = (v) => v == null || v === '-' || v === '' ||
    (typeof v === 'string' && (v.includes('未公开') || v.includes('无限')));
  sorted.sort((a, b) => {
    let av = a[col], bv = b[col];
    const aMiss = isMissing(av);
    const bMiss = isMissing(bv);
    if (aMiss && bMiss) return 0;
    if (aMiss) return 1;
    if (bMiss) return -1;
    if (numericCols.has(col)) {
      const an = Number(av), bn = Number(bv);
      const aBad = isNaN(an), bBad = isNaN(bn);
      if (aBad && bBad) return 0;
      if (aBad) return 1;
      if (bBad) return -1;
      if (an < bn) return dir === 'asc' ? -1 : 1;
      if (an > bn) return dir === 'asc' ? 1 : -1;
      return 0;
    }
    const r = String(av).localeCompare(String(bv), 'zh-CN');
    return dir === 'asc' ? r : -r;
  });
  return sorted;
}

function renderTable() {
  const tbody = document.getElementById('tbody');
  const filtered = applyFilters(state.plans);
  const sorted = applySort(filtered);

  document.getElementById('statsCount').textContent = sorted.length;
  document.getElementById('statsTotal').textContent = `/ ${state.plans.length}`;

  // 类型筛选按钮里的计数：基于当前 vendor + search 上下文（type 自身不参与）
  const typeCtx = state.plans.filter(p => {
    if (state.filter.vendor !== 'all' && p.vendor !== state.filter.vendor) return false;
    const q = (state.filter.search || '').trim().toLowerCase();
    if (q) {
      const hay = [p.vendor, p.plan, p.type, ...(p.models || []), ...(p.benefits || []), ...(p.tags || []), p.note || ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const typeCounts = { all: typeCtx.length, 'Coding Plan': 0, 'Token Plan': 0 };
  for (const p of typeCtx) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  document.querySelectorAll('.type-filter-count').forEach(el => {
    el.textContent = typeCounts[el.dataset.countType] ?? 0;
  });

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
    let firstMonth = priceCell(firstRaw, cur, '/首月', 'price-first');
    // 当首月价显著低于月费时，附加一个折扣徽章；阈值留 0.5% 余量避免浮点误差
    if (typeof firstRaw === 'number' && typeof p.monthlyPrice === 'number'
        && firstRaw > 0 && p.monthlyPrice > 0 && firstRaw < p.monthlyPrice * 0.995) {
      const ratio = firstRaw / p.monthlyPrice;
      const discount = Math.round(ratio * 100) / 10; // 0.235 -> 2.4
      const label = discount < 1
        ? `${(ratio * 100).toFixed(0)}%`
        : `${Number.isInteger(discount) ? discount : discount.toFixed(1)}折`;
      firstMonth += `<span class="discount-badge" title="首月相对月费 ${(ratio * 100).toFixed(1)}%">${label}</span>`;
    }
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
  const clearBtn = document.getElementById('searchClear');
  let timer = null;
  const apply = () => {
    state.filter.search = input.value;
    if (clearBtn) clearBtn.hidden = !input.value;
    renderVendorBar();
    renderTable();
  };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      input.value = '';
      clearTimeout(timer);
      apply();
    }
  });
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      clearTimeout(timer);
      apply();
    });
  }
}

function bindTypeFilter() {
  document.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter.type = btn.dataset.type;
      document.querySelectorAll('.type-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.type === state.filter.type));
      renderVendorBar();
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
  bindSort();
  bindSearch();
  bindTypeFilter();
  // 初始默认排序的表头视觉标记
  if (state.sort.col && state.sort.dir) {
    const th = document.querySelector(`thead th.sortable[data-col="${state.sort.col}"]`);
    if (th) th.classList.add(`sort-${state.sort.dir}`);
  }
  renderTable();
}

document.addEventListener('DOMContentLoaded', init);
