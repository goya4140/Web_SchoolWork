/* ============================================================
   app.js — 视图渲染层 & 应用入口
   职责：
     · 定义路由表，将 URL 映射到渲染函数
     · 每个渲染函数生成 HTML 字符串并挂载到 #app
     · 挂载后绑定事件监听器（事件委托 + 直接绑定）
     · 管理 UI 状态（搜索词、当前标签过滤、编辑器预览切换）
   ============================================================ */

/* ── 1. 工具函数 ── */

/** 将时间戳格式化为 "YYYY-MM-DD" */
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/** 估算阅读时间（中文按 300字/分钟，英文按 200词/分钟） */
function readTime(wordCount) {
  const min = Math.max(1, Math.round(wordCount / 250));
  return `约 ${min} 分钟阅读`;
}

/**
 * 根据标签名映射一个固定颜色（哈希取余）
 * 返回 [背景色, 文字色]
 */
const TAG_PALETTE = [
  ["#dbeafe", "#1d4ed8"], ["#dcfce7", "#15803d"],
  ["#fef3c7", "#b45309"], ["#fce7f3", "#be185d"],
  ["#ede9fe", "#6d28d9"], ["#e0f2fe", "#0369a1"],
  ["#fff7ed", "#c2410c"], ["#f0fdf4", "#166534"]
];
function tagColor(tag) {
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

/**
 * 根据文章第一个标签生成卡片顶部色条的渐变色
 * 无标签时使用 accent 蓝
 */
function cardAccent(post) {
  if (!post.tags.length) return "linear-gradient(90deg, #2563eb, #60a5fa)";
  const [bg, fg] = tagColor(post.tags[0]);
  return `linear-gradient(90deg, ${fg}, ${bg})`;
}

/** 将文章列表渲染为卡片 HTML 字符串 */
function renderCards(posts) {
  if (!posts.length) {
    return `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>暂无文章</p>
      <a href="#/new" class="btn btn-primary">写第一篇</a>
    </div>`;
  }
  return posts.map((p, i) => `
    <article class="post-card fade-card" style="animation-delay:${i * 0.07}s">
      <div class="card-accent-bar" style="background:${cardAccent(p)}"></div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-date">${fmtDate(p.createdAt)}</span>
          <span class="card-dot">·</span>
          <span class="card-readtime">${readTime(p.wordCount || 0)}</span>
        </div>
        <h2 class="card-title">
          <a href="#/post/${p.id}" class="card-title-link">${escapeHtml(p.title)}</a>
        </h2>
        <p class="card-excerpt">${escapeHtml(p.excerpt || "")}</p>
        <div class="card-footer">
          <div class="tag-row">
            ${p.tags.map(t => {
              const [bg, fg] = tagColor(t);
              return `<a href="#/tag/${encodeURIComponent(t)}" class="tag-pill"
                         style="background:${bg};color:${fg};border-color:${fg}33">${escapeHtml(t)}</a>`;
            }).join("")}
          </div>
          <a href="#/post/${p.id}" class="read-more">阅读全文 <span class="arrow">→</span></a>
        </div>
      </div>
    </article>
  `).join("");
}

/** 渲染标签过滤栏 HTML */
function renderTagFilter(allTags, activeTag = "") {
  const entries = Object.entries(allTags);
  if (!entries.length) return "";
  const pills = entries.map(([t, n]) => {
    const [bg, fg] = tagColor(t);
    const active = t === activeTag ? "tag-active" : "";
    return `<a href="#/tag/${encodeURIComponent(t)}"
               class="tag-pill ${active}"
               style="background:${bg};color:${fg};border-color:${fg}33">
              ${escapeHtml(t)} <sup>${n}</sup>
            </a>`;
  }).join("");
  return `<div class="tag-filter">
    <a href="#/" class="tag-pill ${activeTag ? "" : "tag-active"}" style="">全部</a>
    ${pills}
  </div>`;
}

/* ── 2. 页面渲染函数 ── */

/** 首页 — 文章列表 + 搜索 + 标签筛选 + 统计 */
function renderHome({ tag = "", query = "" } = {}) {
  setNavActive("nav-home");

  const stats = getStats();
  const allTags = getAllTags();
  const posts = tag   ? getPostsByTag(decodeURIComponent(tag))
              : query ? searchPosts(query)
              : getAllPosts();

  const heading = tag   ? `标签：${decodeURIComponent(tag)}`
                : query ? `搜索：${query}`
                : "所有文章";

  mount(`
    <!-- 顶部 Banner -->
    <div class="home-banner fade-in">
      <h1 class="banner-title">WLH Blog</h1>
      <p class="banner-sub">记录科研、思考与成长</p>
      <div class="stats-row">
        <span class="stat-item"><strong>${stats.total}</strong> 篇文章</span>
        <span class="stat-sep">·</span>
        <span class="stat-item"><strong>${stats.tagCount}</strong> 个标签</span>
        <span class="stat-sep">·</span>
        <span class="stat-item">约 <strong>${stats.wordCount.toLocaleString()}</strong> 字</span>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-wrap fade-in" style="animation-delay:.1s">
      <input id="search-input" class="search-input" type="text"
             placeholder="搜索文章标题、内容或标签…"
             value="${escapeHtml(query)}" />
      <span class="search-icon">🔍</span>
    </div>

    <!-- 标签过滤 -->
    <div class="fade-in" style="animation-delay:.15s">
      ${renderTagFilter(allTags, decodeURIComponent(tag))}
    </div>

    <!-- 文章列表标题 -->
    <div class="list-heading fade-in" style="animation-delay:.2s">
      <h2 class="list-title">${escapeHtml(heading)}</h2>
      <span class="list-count">${posts.length} 篇</span>
    </div>

    <!-- 文章卡片 -->
    <div class="post-list" id="post-list">
      ${renderCards(posts)}
    </div>
  `);

  /* 搜索框实时过滤 — debounce 300ms */
  let timer;
  document.getElementById("search-input").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = e.target.value.trim();
      navigate(q ? `/search/${encodeURIComponent(q)}` : "/");
    }, 300);
  });
}

/** 文章详情页 */
function renderPost({ id }) {
  setNavActive("nav-home");
  const post = getPost(id);

  if (!post) {
    mount(`<div class="not-found">
      <h2>文章不存在</h2>
      <p>该文章可能已被删除。</p>
      <a href="#/" class="btn btn-secondary">← 返回首页</a>
    </div>`);
    return;
  }

  const tagsHtml = post.tags.map(t => {
    const [bg, fg] = tagColor(t);
    return `<a href="#/tag/${encodeURIComponent(t)}" class="tag-pill"
               style="background:${bg};color:${fg};border-color:${fg}33">${escapeHtml(t)}</a>`;
  }).join("");

  mount(`
    <div class="post-detail fade-in">
      <!-- 返回 + 操作按钮 -->
      <div class="post-actions-top">
        <a href="#/" class="btn btn-ghost">← 返回</a>
        <div class="post-ops">
          <a href="#/edit/${post.id}" class="btn btn-secondary">编辑</a>
          <button class="btn btn-danger" id="btn-delete">删除</button>
        </div>
      </div>

      <!-- 文章头部 -->
      <header class="post-header">
        <div class="post-meta-row">
          <span>${fmtDate(post.createdAt)}</span>
          <span class="card-dot">·</span>
          <span>${readTime(post.wordCount || 0)}</span>
          ${post.updatedAt !== post.createdAt
            ? `<span class="card-dot">·</span><span class="updated">更新于 ${fmtDate(post.updatedAt)}</span>`
            : ""}
        </div>
        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        <div class="tag-row">${tagsHtml}</div>
      </header>

      <!-- 正文（Markdown 渲染） -->
      <div class="post-content markdown-body">
        ${renderMarkdown(post.content)}
      </div>

      <!-- 底部操作 -->
      <div class="post-actions-bottom">
        <a href="#/" class="btn btn-ghost">← 所有文章</a>
        <div class="post-ops">
          <a href="#/edit/${post.id}" class="btn btn-secondary">编辑文章</a>
          <button class="btn btn-danger" id="btn-delete-bottom">删除文章</button>
        </div>
      </div>
    </div>
  `);

  /* 删除按钮：二次确认后执行删除并跳转首页 */
  const doDelete = () => {
    if (confirm(`确认删除《${post.title}》？此操作不可撤销。`)) {
      deletePost(id);
      navigate("/");
    }
  };
  document.getElementById("btn-delete")?.addEventListener("click", doDelete);
  document.getElementById("btn-delete-bottom")?.addEventListener("click", doDelete);
}

/** 编辑器页（新建 & 编辑复用同一个组件） */
function renderEditor({ id } = {}) {
  setNavActive("nav-new");
  const post = id ? getPost(id) : null;
  const isEdit = !!post;

  const title   = isEdit ? post.title   : "";
  const tags    = isEdit ? post.tags.join(", ") : "";
  const content = isEdit ? post.content : "";

  mount(`
    <div class="editor-wrap fade-in">
      <div class="editor-header">
        <h2 class="editor-heading">${isEdit ? "编辑文章" : "写文章"}</h2>
        <div class="editor-tabs">
          <button class="tab-btn tab-active" id="tab-write">编辑</button>
          <button class="tab-btn" id="tab-preview">预览</button>
        </div>
      </div>

      <input id="e-title" class="editor-title-input"
             type="text" placeholder="文章标题…" value="${escapeHtml(title)}" />

      <div class="editor-tags-wrap">
        <span class="editor-tags-label">标签</span>
        <input id="e-tags" class="editor-tags-input"
               type="text" placeholder="用逗号分隔，如：RLHF, 研究笔记"
               value="${escapeHtml(tags)}" />
      </div>
      <!-- 标签预览行（实时渲染） -->
      <div class="tag-row tag-preview-row" id="tag-preview"></div>

      <!-- 编辑区 / 预览区（切换显示） -->
      <div class="editor-pane" id="pane-write">
        <textarea id="e-content" class="editor-textarea"
                  placeholder="开始写作…（支持 Markdown 语法）"
        >${escapeHtml(content)}</textarea>
        <div class="editor-hint">支持 Markdown · # 标题 · **粗体** · \`代码\` · > 引用 · - 列表</div>
      </div>
      <div class="editor-pane hidden" id="pane-preview">
        <div class="preview-body markdown-body" id="preview-body"></div>
      </div>

      <!-- 底部操作栏 -->
      <div class="editor-footer">
        <a href="${isEdit ? `#/post/${id}` : "#/"}" class="btn btn-ghost">取消</a>
        <div class="editor-footer-right">
          <span class="word-counter" id="word-counter">0 字</span>
          <button class="btn btn-primary" id="btn-save">
            ${isEdit ? "保存修改" : "发布文章"}
          </button>
        </div>
      </div>

      <div class="save-hint" id="save-hint"></div>
    </div>
  `);

  /* ── 标签实时预览 ── */
  const tagsInput   = document.getElementById("e-tags");
  const tagPreview  = document.getElementById("tag-preview");
  function refreshTagPreview() {
    const ts = tagsInput.value.split(",").map(t => t.trim()).filter(Boolean);
    tagPreview.innerHTML = ts.map(t => {
      const [bg, fg] = tagColor(t);
      return `<span class="tag-pill" style="background:${bg};color:${fg};border-color:${fg}33">${escapeHtml(t)}</span>`;
    }).join("");
  }
  tagsInput.addEventListener("input", refreshTagPreview);
  refreshTagPreview();

  /* ── 字数统计实时更新 ── */
  const contentArea = document.getElementById("e-content");
  const wordCounter = document.getElementById("word-counter");
  function refreshCount() {
    const cjk = (contentArea.value.match(/[一-鿿]/g) || []).length;
    const eng  = (contentArea.value.match(/\b[a-zA-Z]+\b/g) || []).length;
    wordCounter.textContent = `${cjk + eng} 字`;
  }
  contentArea.addEventListener("input", refreshCount);
  refreshCount();

  /* ── 编辑/预览 Tab 切换 ── */
  const paneWrite   = document.getElementById("pane-write");
  const panePreview = document.getElementById("pane-preview");
  const tabWrite    = document.getElementById("tab-write");
  const tabPreview  = document.getElementById("tab-preview");
  const previewBody = document.getElementById("preview-body");

  tabWrite.addEventListener("click", () => {
    paneWrite.classList.remove("hidden");
    panePreview.classList.add("hidden");
    tabWrite.classList.add("tab-active");
    tabPreview.classList.remove("tab-active");
  });
  tabPreview.addEventListener("click", () => {
    paneWrite.classList.add("hidden");
    panePreview.classList.remove("hidden");
    tabWrite.classList.remove("tab-active");
    tabPreview.classList.add("tab-active");
    // 渲染当前内容的 Markdown 预览
    previewBody.innerHTML = contentArea.value.trim()
      ? renderMarkdown(contentArea.value)
      : `<p class="preview-empty">暂无内容</p>`;
  });

  /* ── 保存 ── */
  document.getElementById("btn-save").addEventListener("click", () => {
    const title   = document.getElementById("e-title").value.trim();
    const tags    = document.getElementById("e-tags").value
                      .split(",").map(t => t.trim()).filter(Boolean);
    const content = contentArea.value.trim();
    const hint    = document.getElementById("save-hint");

    if (!title)   { showHint(hint, "请填写文章标题", "error"); return; }
    if (!content) { showHint(hint, "请填写文章内容", "error"); return; }

    if (isEdit) {
      updatePost(id, { title, content, tags });
      showHint(hint, "已保存！正在跳转…", "ok");
      setTimeout(() => navigate(`/post/${id}`), 800);
    } else {
      const p = createPost({ title, content, tags });
      showHint(hint, "发布成功！正在跳转…", "ok");
      setTimeout(() => navigate(`/post/${p.id}`), 800);
    }
  });
}

/* ── 3. 辅助函数 ── */

/** 将 HTML 字符串挂载到 #app，并触发重绘（让 animation 重新执行） */
function mount(html) {
  const app = document.getElementById("app");
  app.innerHTML = html;
  // 滚动回顶部
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** 更新导航栏高亮 */
function setNavActive(id) {
  document.querySelectorAll(".nav-link").forEach(el =>
    el.classList.toggle("active", el.id === id)
  );
}

/** 显示操作提示（成功/错误） */
function showHint(el, msg, type) {
  el.textContent = msg;
  el.className = `save-hint save-hint-${type}`;
  if (type === "ok") setTimeout(() => { el.textContent = ""; el.className = "save-hint"; }, 3000);
}

/* ── 4. 初始化 ── */

document.addEventListener("DOMContentLoaded", () => {
  // 导航栏出场动画
  setTimeout(() => document.getElementById("navbar").classList.add("nav-visible"), 100);

  // 监听滚动：导航栏阴影
  window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });

  // 写入种子数据（仅首次）
  seedIfEmpty();

  // 注册路由表
  defineRoutes({
    "/":              ()      => renderHome(),
    "/tag/:tag":      p       => renderHome({ tag: p.tag }),
    "/search/:query": p       => renderHome({ query: decodeURIComponent(p.query) }),
    "/post/:id":      p       => renderPost({ id: p.id }),
    "/new":           ()      => renderEditor(),
    "/edit/:id":      p       => renderEditor({ id: p.id })
  });

  // 启动路由（处理初始 URL，此后由 hashchange 驱动）
  startRouter();
});
