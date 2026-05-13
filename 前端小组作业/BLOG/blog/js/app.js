/* ============================================================
   app.js — 视图渲染层 & 应用入口 (v2)
   新增：深色模式、时间线视图、专栏系统、置顶、封面图
   ============================================================ */

/* ── 1. 专栏定义 ── */

const COLUMNS = [
  { id: "life",     name: "生活随笔", icon: "🌱", color: "#059669" },
  { id: "study",    name: "学习笔记", icon: "📚", color: "#2563eb" },
  { id: "review",   name: "阶段总结", icon: "🎯", color: "#d97706" },
  { id: "research", name: "科研进展", icon: "🔬", color: "#7c3aed" }
];

/* ── 2. 视图模式 & 导出状态 ── */

let _viewMode = localStorage.getItem("wlh_view_mode") || "cards"; // "cards" | "timeline"

let _exportMode = false;           // 批量导出模式开关
const _selectedPosts = new Set();  // 已勾选文章 id
let _exportPosts = [];             // 当前页面可勾选的文章列表

/* ── 3. 工具函数 ── */

function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmtMonth(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()} 年 ${d.getMonth()+1} 月`;
}

function readTime(wordCount) {
  return `约 ${Math.max(1, Math.round(wordCount / 250))} 分钟阅读`;
}

const TAG_PALETTE = [
  ["#dbeafe","#1d4ed8"],["#dcfce7","#15803d"],
  ["#fef3c7","#b45309"],["#fce7f3","#be185d"],
  ["#ede9fe","#6d28d9"],["#e0f2fe","#0369a1"],
  ["#fff7ed","#c2410c"],["#f0fdf4","#166534"]
];
function tagColor(tag) {
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}

function cardAccent(post) {
  if (!post.tags.length) return "linear-gradient(90deg,#2563eb,#60a5fa)";
  const [bg, fg] = tagColor(post.tags[0]);
  return `linear-gradient(90deg,${fg},${bg})`;
}

function getColumn(id) {
  return COLUMNS.find(c => c.id === id) || null;
}

/* ── 4. 导出功能 ── */

/** 将单篇文章转换为 Markdown 文本（含元数据头） */
function buildMdContent(post) {
  const col = getColumn(post.column);
  const metaLines = [
    `**日期**：${fmtDate(post.createdAt)}`,
    `**标签**：${post.tags.length ? post.tags.join("、") : "无"}`,
    col ? `**专栏**：${col.icon} ${col.name}` : null,
  ].filter(Boolean).join("  \n");
  return `# ${post.title}\n\n${metaLines}\n\n---\n\n${post.content}`;
}

/** 触发浏览器下载一个 .md 文件 */
function downloadMd(filename, content) {
  const blob = new Blob(["﻿" + content], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 导出已选文章（单篇独立文件 / 多篇合并为一个文件） */
function exportSelectedPosts() {
  const posts = [..._selectedPosts].map(id => getPost(id)).filter(Boolean);
  if (!posts.length) { alert("请先勾选要导出的文章"); return; }
  if (posts.length === 1) {
    downloadMd(`${posts[0].title}.md`, buildMdContent(posts[0]));
  } else {
    const body = posts.map(p => buildMdContent(p)).join("\n\n---\n\n");
    downloadMd(`博客导出_${fmtDate(Date.now())}.md`, body);
  }
}

/** 进入批量导出模式 */
function enterExportMode(posts) {
  _exportMode = true;
  _selectedPosts.clear();
  _exportPosts = posts;
  document.getElementById("export-bar")?.classList.remove("hidden");
  updateExportBar();
}

/** 退出批量导出模式（隐藏工具栏、清空已选） */
function exitExportMode() {
  _exportMode = false;
  _selectedPosts.clear();
  _exportPosts = [];
  document.getElementById("export-bar")?.classList.add("hidden");
}

/** 刷新工具栏上的已选计数与按钮状态 */
function updateExportBar() {
  const n = _selectedPosts.size;
  const countEl = document.getElementById("export-bar-count");
  if (countEl) countEl.textContent = `已选 ${n} 篇`;
  const doBtn = document.getElementById("btn-export-do");
  if (doBtn) doBtn.disabled = n === 0;
}

/* ── 5. 渲染：文章卡片列表 ── */

function renderCards(posts, { exportMode = false } = {}) {
  if (!posts.length) {
    return `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <p>暂无文章</p>
      <a href="#/new" class="btn btn-primary">写第一篇</a>
    </div>`;
  }
  return posts.map((p, i) => {
    const col = getColumn(p.column);
    const checked = _selectedPosts.has(p.id) ? " checked" : "";
    return `
    <article class="post-card fade-card${exportMode ? " selectable-card" : ""}" style="animation-delay:${i*0.07}s" data-id="${p.id}">
      ${exportMode ? `<label class="card-select-label">
        <input type="checkbox" class="card-cb" data-id="${p.id}"${checked}><span class="card-cb-text">选择导出</span>
      </label>` : ""}
      ${p.cover ? `<div class="card-cover"><img src="${escapeHtml(p.cover)}" alt="封面" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ""}
      <div class="card-accent-bar" style="background:${cardAccent(p)}"></div>
      <div class="card-body">
        <div class="card-meta">
          ${p.pinned ? `<span class="pin-badge">📌 置顶</span>` : ""}
          ${col ? `<span class="col-badge" style="color:${col.color};background:${col.color}18;border-color:${col.color}30">${col.icon} ${col.name}</span>` : ""}
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
    </article>`;
  }).join("");
}

/* ── 5. 渲染：时间线视图 ── */

function renderTimeline(posts) {
  if (!posts.length) {
    return `<div class="empty-state">
      <div class="empty-icon">📭</div><p>暂无文章</p>
      <a href="#/new" class="btn btn-primary">写第一篇</a>
    </div>`;
  }

  // 按年-月分组
  const groups = {};
  posts.forEach(p => {
    const key = fmtMonth(p.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  return `<div class="timeline-wrap fade-in">
    ${Object.entries(groups).map(([month, mPosts]) => `
      <div class="timeline-month">
        <div class="timeline-month-label">${month}</div>
        <div class="timeline-month-items">
          ${mPosts.map(p => {
            const col = getColumn(p.column);
            return `<div class="timeline-item">
              <a href="#/post/${p.id}" class="timeline-card">
                <span class="timeline-date">${fmtDate(p.createdAt)}</span>
                <span class="timeline-title">${escapeHtml(p.title)}</span>
                ${col ? `<span class="timeline-col-badge">${col.icon} ${col.name}</span>` : ""}
                ${p.pinned ? `<span class="timeline-pin">📌</span>` : ""}
              </a>
            </div>`;
          }).join("")}
        </div>
      </div>
    `).join("")}
  </div>`;
}

/* ── 6. 渲染：标签过滤栏 ── */

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
    <a href="#/" class="tag-pill ${activeTag?"":"tag-active"}" style="">全部</a>
    ${pills}
  </div>`;
}

/* ── 7. 渲染：专栏卡片行 ── */

function renderColumnsRow() {
  return `<div class="columns-row fade-in">
    ${COLUMNS.map(col => {
      const count = getPostsByColumn(col.id).length;
      return `<a href="#/column/${col.id}" class="column-card">
        <span class="column-icon">${col.icon}</span>
        <span class="column-name">${col.name}</span>
        <span class="column-count">${count} 篇</span>
      </a>`;
    }).join("")}
  </div>`;
}

/* ── 8. 页面：首页 ── */

function renderHome({ tag = "", query = "", column = "" } = {}) {
  setNavActive("nav-home");

  const stats   = getStats();
  const allTags = getAllTags();

  let posts;
  if (tag)    posts = getPostsByTag(decodeURIComponent(tag));
  else if (query)  posts = searchPosts(query);
  else if (column) posts = getPostsByColumn(column);
  else             posts = getAllPosts();

  // 记录当前页文章，供全选使用
  _exportPosts = posts;

  const col     = getColumn(column);
  const heading = tag    ? `标签：${decodeURIComponent(tag)}`
                : query  ? `搜索：${query}`
                : col    ? `${col.icon} ${col.name}`
                : "所有文章";

  const listHtml = _viewMode === "timeline"
    ? renderTimeline(posts)
    : `<div class="post-list" id="post-list">${renderCards(posts, { exportMode: _exportMode })}</div>`;

  // 导出模式下同步工具栏可见性
  if (_exportMode) {
    document.getElementById("export-bar")?.classList.remove("hidden");
    updateExportBar();
  }

  mount(`
    ${!tag && !query && !column ? renderColumnsRow() : ""}

    <div class="home-banner fade-in" style="animation-delay:.05s">
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

    <div class="search-wrap fade-in" style="animation-delay:.1s">
      <input id="search-input" class="search-input" type="text"
             placeholder="搜索文章标题、内容或标签…"
             value="${escapeHtml(query)}" />
      <span class="search-icon">🔍</span>
    </div>

    <div class="fade-in" style="animation-delay:.14s">
      ${renderTagFilter(allTags, decodeURIComponent(tag))}
    </div>

    <div class="list-heading fade-in" style="animation-delay:.18s">
      <h2 class="list-title">${escapeHtml(heading)}</h2>
      <div class="list-heading-right">
        <span class="list-count">${posts.length} 篇</span>
        ${_viewMode !== "timeline" ? `<button class="btn btn-ghost btn-sm" id="btn-toggle-export">
          ${_exportMode ? "✕ 退出导出" : "⬇ 批量导出"}
        </button>` : ""}
      </div>
    </div>

    ${listHtml}
  `);

  // 搜索
  let timer;
  document.getElementById("search-input").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = e.target.value.trim();
      navigate(q ? `/search/${encodeURIComponent(q)}` : "/");
    }, 300);
  });

  // 批量导出模式切换
  document.getElementById("btn-toggle-export")?.addEventListener("click", () => {
    if (_exportMode) {
      exitExportMode();
    } else {
      enterExportMode(posts);
    }
    refresh();
  });

  // 卡片复选框（事件委托）
  if (_exportMode) {
    document.getElementById("post-list")?.addEventListener("change", e => {
      if (e.target.classList.contains("card-cb")) {
        const id = e.target.dataset.id;
        e.target.checked ? _selectedPosts.add(id) : _selectedPosts.delete(id);
        updateExportBar();
      }
    });
  }
}

/* ── 9. 页面：文章详情 ── */

function renderPost({ id }) {
  setNavActive("nav-home");
  exitExportMode(); // 离开首页时退出批量导出模式
  const post = getPost(id);

  if (!post) {
    mount(`<div class="not-found">
      <h2>文章不存在</h2><p>该文章可能已被删除。</p>
      <a href="#/" class="btn btn-secondary">← 返回首页</a>
    </div>`);
    return;
  }

  const col = getColumn(post.column);
  const tagsHtml = post.tags.map(t => {
    const [bg, fg] = tagColor(t);
    return `<a href="#/tag/${encodeURIComponent(t)}" class="tag-pill"
               style="background:${bg};color:${fg};border-color:${fg}33">${escapeHtml(t)}</a>`;
  }).join("");

  mount(`
    <div class="post-detail fade-in">
      <div class="post-actions-top">
        <a href="#/" class="btn btn-ghost">← 返回</a>
        <div class="post-ops">
          <button class="btn btn-pin ${post.pinned?"pinned":""}" id="btn-pin">
            ${post.pinned ? "📌 取消置顶" : "📌 置顶"}
          </button>
          <button class="btn btn-secondary" id="btn-export-post">⬇ 导出 .md</button>
          <a href="#/edit/${post.id}" class="btn btn-secondary">编辑</a>
          <button class="btn btn-danger" id="btn-delete">删除</button>
        </div>
      </div>

      ${post.cover ? `<div class="post-cover"><img src="${escapeHtml(post.cover)}" alt="封面" onerror="this.parentElement.style.display='none'"></div>` : ""}

      <header class="post-header">
        <div class="post-meta-row">
          ${col ? `<span class="post-col-label">${col.icon} ${col.name}</span>` : ""}
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

      <div class="post-content markdown-body">${renderMarkdown(post.content)}</div>

      <div class="post-actions-bottom">
        <a href="#/" class="btn btn-ghost">← 所有文章</a>
        <div class="post-ops">
          <button class="btn btn-secondary" id="btn-export-post-bottom">⬇ 导出 .md</button>
          <a href="#/edit/${post.id}" class="btn btn-secondary">编辑文章</a>
          <button class="btn btn-danger" id="btn-delete-bottom">删除文章</button>
        </div>
      </div>
    </div>
  `);

  // 置顶切换
  document.getElementById("btn-pin").addEventListener("click", () => {
    togglePin(id);
    navigate(`/post/${id}`); // 重新渲染详情页
  });

  // 导出单篇
  const doExport = () => {
    downloadMd(`${post.title}.md`, buildMdContent(post));
  };
  document.getElementById("btn-export-post")?.addEventListener("click", doExport);
  document.getElementById("btn-export-post-bottom")?.addEventListener("click", doExport);

  // 删除
  const doDelete = () => {
    if (confirm(`确认删除《${post.title}》？此操作不可撤销。`)) {
      deletePost(id); navigate("/");
    }
  };
  document.getElementById("btn-delete")?.addEventListener("click", doDelete);
  document.getElementById("btn-delete-bottom")?.addEventListener("click", doDelete);
}

/* ── 10. 页面：编辑器（新建 & 编辑复用） ── */

function renderEditor({ id } = {}) {
  setNavActive("nav-new");
  exitExportMode();
  const post   = id ? getPost(id) : null;
  const isEdit = !!post;

  const title   = isEdit ? post.title          : "";
  const tags    = isEdit ? post.tags.join(", ") : "";
  const content = isEdit ? post.content        : "";
  const cover   = isEdit ? (post.cover || "")  : "";
  const column  = isEdit ? (post.column || "") : "";

  const columnOptions = COLUMNS.map(c =>
    `<option value="${c.id}" ${column===c.id?"selected":""}>${c.icon} ${c.name}</option>`
  ).join("");

  mount(`
    <div class="editor-wrap fade-in">
      <div class="editor-header">
        <h2 class="editor-heading">${isEdit?"编辑文章":"写文章"}</h2>
        <div class="editor-tabs">
          <button class="tab-btn tab-active" id="tab-write">编辑</button>
          <button class="tab-btn" id="tab-preview">预览</button>
        </div>
      </div>

      <input id="e-title" class="editor-title-input"
             type="text" placeholder="文章标题…" value="${escapeHtml(title)}" />

      <!-- 元数据行：专栏 + 封面图 + 图片上传 -->
      <div class="editor-meta-row">
        <div class="editor-field">
          <label class="editor-field-label">所属专栏</label>
          <select id="e-column" class="editor-field-select">
            <option value="">不归属专栏</option>
            ${columnOptions}
          </select>
        </div>
        <div class="editor-field">
          <label class="editor-field-label">封面图 URL（可选）</label>
          <input id="e-cover" class="editor-field-input" type="url"
                 placeholder="https://images.unsplash.com/…"
                 value="${escapeHtml(cover)}" />
        </div>
        <div class="editor-field editor-field-full">
          <label class="editor-field-label">插入图片（上传到正文）</label>
          <div class="img-upload-wrap">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-img-upload">📷 选择图片</button>
            <input type="file" id="e-img-file" accept="image/*" style="display:none">
            <span class="img-upload-hint" id="img-upload-hint">支持 JPG / PNG / GIF · 单张最大 2 MB · 以 base64 嵌入正文</span>
          </div>
        </div>
      </div>

      <div class="editor-tags-wrap">
        <span class="editor-tags-label">标签</span>
        <input id="e-tags" class="editor-tags-input"
               type="text" placeholder="用逗号分隔，如：RLHF, 研究笔记"
               value="${escapeHtml(tags)}" />
      </div>
      <div class="tag-row tag-preview-row" id="tag-preview"></div>

      <div class="editor-pane" id="pane-write">
        <textarea id="e-content" class="editor-textarea"
                  placeholder="开始写作…（支持 Markdown 语法）"
        >${escapeHtml(content)}</textarea>
        <div class="editor-hint">支持 Markdown · # 标题 · **粗体** · \`代码\` · > 引用 · - 列表</div>
      </div>
      <div class="editor-pane hidden" id="pane-preview">
        <div class="preview-body markdown-body" id="preview-body"></div>
      </div>

      <div class="editor-footer">
        <a href="${isEdit?`#/post/${id}`:"#/"}" class="btn btn-ghost">取消</a>
        <div class="editor-footer-right">
          <span class="word-counter" id="word-counter">0 字</span>
          <button class="btn btn-primary" id="btn-save">
            ${isEdit?"保存修改":"发布文章"}
          </button>
        </div>
      </div>
      <div class="save-hint" id="save-hint"></div>
    </div>
  `);

  // 标签实时预览
  const tagsInput  = document.getElementById("e-tags");
  const tagPreview = document.getElementById("tag-preview");
  function refreshTagPreview() {
    const ts = tagsInput.value.split(",").map(t=>t.trim()).filter(Boolean);
    tagPreview.innerHTML = ts.map(t => {
      const [bg, fg] = tagColor(t);
      return `<span class="tag-pill" style="background:${bg};color:${fg};border-color:${fg}33">${escapeHtml(t)}</span>`;
    }).join("");
  }
  tagsInput.addEventListener("input", refreshTagPreview);
  refreshTagPreview();

  // 字数统计
  const contentArea = document.getElementById("e-content");
  const wordCounter = document.getElementById("word-counter");
  function refreshCount() {
    const cjk = (contentArea.value.match(/[一-鿿]/g)||[]).length;
    const eng  = (contentArea.value.match(/\b[a-zA-Z]+\b/g)||[]).length;
    wordCounter.textContent = `${cjk+eng} 字`;
  }
  contentArea.addEventListener("input", refreshCount);
  refreshCount();

  // 编辑/预览切换
  const paneWrite   = document.getElementById("pane-write");
  const panePreview = document.getElementById("pane-preview");
  const tabWrite    = document.getElementById("tab-write");
  const tabPreview  = document.getElementById("tab-preview");
  const previewBody = document.getElementById("preview-body");
  tabWrite.addEventListener("click", () => {
    paneWrite.classList.remove("hidden"); panePreview.classList.add("hidden");
    tabWrite.classList.add("tab-active"); tabPreview.classList.remove("tab-active");
  });
  tabPreview.addEventListener("click", () => {
    paneWrite.classList.add("hidden"); panePreview.classList.remove("hidden");
    tabWrite.classList.remove("tab-active"); tabPreview.classList.add("tab-active");
    previewBody.innerHTML = contentArea.value.trim()
      ? renderMarkdown(contentArea.value)
      : `<p class="preview-empty">暂无内容</p>`;
  });

  // 图片上传
  document.getElementById("btn-img-upload").addEventListener("click", () => {
    document.getElementById("e-img-file").click();
  });
  document.getElementById("e-img-file").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const hint = document.getElementById("img-upload-hint");
    if (file.size > 2 * 1024 * 1024) {
      hint.textContent = "❌ 图片超过 2 MB，请压缩后重试";
      hint.style.color = "var(--danger)";
      e.target.value = "";
      return;
    }
    hint.textContent = "⏳ 处理中…";
    hint.style.color = "";
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl  = ev.target.result;
      const altName  = file.name.replace(/\.[^.]+$/, "");
      const snippet  = `\n\n![${altName}](${dataUrl})\n\n`;
      const start    = contentArea.selectionStart;
      contentArea.value =
        contentArea.value.substring(0, start) + snippet +
        contentArea.value.substring(start);
      contentArea.selectionStart = contentArea.selectionEnd = start + snippet.length;
      contentArea.focus();
      refreshCount();
      hint.textContent = `✅ ${file.name} 已插入正文`;
      setTimeout(() => {
        hint.textContent = "支持 JPG / PNG / GIF · 单张最大 2 MB · 以 base64 嵌入正文";
        hint.style.color = "";
      }, 3000);
    };
    reader.onerror = () => {
      hint.textContent = "❌ 读取失败，请重试";
      hint.style.color = "var(--danger)";
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  });

  // 保存
  document.getElementById("btn-save").addEventListener("click", () => {
    const title   = document.getElementById("e-title").value.trim();
    const tags    = tagsInput.value.split(",").map(t=>t.trim()).filter(Boolean);
    const content = contentArea.value.trim();
    const cover   = document.getElementById("e-cover").value.trim();
    const column  = document.getElementById("e-column").value;
    const hint    = document.getElementById("save-hint");

    if (!title)   { showHint(hint, "请填写文章标题", "error"); return; }
    if (!content) { showHint(hint, "请填写文章内容", "error"); return; }

    if (isEdit) {
      updatePost(id, { title, content, tags, cover, column });
      showHint(hint, "已保存！正在跳转…", "ok");
      setTimeout(() => navigate(`/post/${id}`), 800);
    } else {
      const p = createPost({ title, content, tags, cover, column });
      showHint(hint, "发布成功！正在跳转…", "ok");
      setTimeout(() => navigate(`/post/${p.id}`), 800);
    }
  });
}

/* ── 11. 页面：团队成员 ── */

function renderTeam() {
  setNavActive("nav-team");
  exitExportMode();

  const members = [
    {
      name: "王邻皓", abbr: "WLH",
      role: "博客作者 · 全栈开发",
      desc: "热爱科研与技术写作，本 Blog 的创建者与维护者。",
      url:  "../../Personal_Page_WLH/index.html",
      color: ["#dbeafe","#1d4ed8"]
    },
    {
      name: "李鹿鸣", abbr: "LLM",
      role: "前端开发",
      desc: "热爱前端开发的大学生，擅长音乐、摄影与运动。",
      url:  "../../Personal_Page_LLM/index.html",
      color: ["#dcfce7","#15803d"]
    },
    {
      name: "张博瑞", abbr: "ZBR",
      role: "前端开发",
      desc: "专注前端技术探索与实践的小组成员。",
      url:  "../../Personal_Page_ZBR/index.html",
      color: ["#ede9fe","#6d28d9"]
    }
  ];

  const cards = members.map((m, i) => `
    <div class="team-card fade-card" style="animation-delay:${i*0.1}s">
      <div class="team-card-top" style="background:linear-gradient(135deg,${m.color[1]},${m.color[0]})">
        <div class="team-avatar">${m.abbr}</div>
      </div>
      <div class="team-card-body">
        <h3 class="team-name">${m.name}</h3>
        <p class="team-role">${m.role}</p>
        <p class="team-desc">${m.desc}</p>
        <a href="${m.url}" target="_blank" rel="noopener" class="btn btn-secondary team-btn">
          访问个人主页 <span class="arrow">→</span>
        </a>
      </div>
    </div>
  `).join("");

  mount(`
    <div class="fade-in">
      <div class="team-header">
        <h1 class="team-page-title">团队成员</h1>
        <p class="team-page-sub">小组共 3 位成员，点击卡片访问各自的个人主页</p>
      </div>
      <div class="team-grid">${cards}</div>
    </div>
  `);
}

/* ── 12. 辅助函数 ── */

function mount(html) {
  document.getElementById("app").innerHTML = html;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setNavActive(id) {
  document.querySelectorAll(".nav-link").forEach(el =>
    el.classList.toggle("active", el.id === id)
  );
}

function showHint(el, msg, type) {
  el.textContent = msg;
  el.className = `save-hint save-hint-${type}`;
  if (type === "ok") setTimeout(() => { el.textContent=""; el.className="save-hint"; }, 3000);
}

/* ── 13. 深色模式 ── */

function applyDark(isDark) {
  document.body.classList.toggle("dark", isDark);
  document.getElementById("icon-moon")?.classList.toggle("hidden", isDark);
  document.getElementById("icon-sun")?.classList.toggle("hidden", !isDark);
}

function initDarkMode() {
  const saved = localStorage.getItem("wlh_dark_mode");
  applyDark(saved === "dark");

  document.getElementById("btn-dark-toggle").addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("wlh_dark_mode", isDark ? "dark" : "light");
    document.getElementById("icon-moon").classList.toggle("hidden", isDark);
    document.getElementById("icon-sun").classList.toggle("hidden", !isDark);
  });
}

/* ── 14. 视图切换（卡片 / 时间线） ── */

function updateViewIcon() {
  document.getElementById("icon-cards")?.classList.toggle("hidden", _viewMode !== "cards");
  document.getElementById("icon-timeline")?.classList.toggle("hidden", _viewMode !== "timeline");
}

function initViewToggle() {
  updateViewIcon();
  document.getElementById("btn-view-toggle").addEventListener("click", () => {
    _viewMode = _viewMode === "cards" ? "timeline" : "cards";
    localStorage.setItem("wlh_view_mode", _viewMode);
    updateViewIcon();
    // 当前在首页类路由时刷新视图
    const path = currentPath();
    if (path === "/" || path.startsWith("/tag/") ||
        path.startsWith("/search/") || path.startsWith("/column/")) {
      refresh();
    }
  });
}

/* ── 15. 初始化 ── */

document.addEventListener("DOMContentLoaded", () => {
  // 导航栏出场动画
  setTimeout(() => document.getElementById("navbar").classList.add("nav-visible"), 100);

  // 导航栏滚动阴影
  window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });

  // 滚动进度条
  const bar = document.createElement("div");
  bar.id = "progress-bar";
  document.body.prepend(bar);
  window.addEventListener("scroll", () => {
    const total = document.body.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(window.scrollY/total)*100}%` : "0%";
  }, { passive: true });

  // 功能初始化
  initDarkMode();
  initViewToggle();

  // 导出工具栏按钮（工具栏在 #app 外，只需绑定一次）
  document.getElementById("btn-export-do")?.addEventListener("click", exportSelectedPosts);
  document.getElementById("btn-export-exit")?.addEventListener("click", () => {
    exitExportMode(); refresh();
  });
  document.getElementById("btn-export-all")?.addEventListener("click", () => {
    _exportPosts.forEach(p => _selectedPosts.add(p.id));
    document.querySelectorAll(".card-cb").forEach(cb => { cb.checked = true; });
    updateExportBar();
  });
  document.getElementById("btn-export-none")?.addEventListener("click", () => {
    _selectedPosts.clear();
    document.querySelectorAll(".card-cb").forEach(cb => { cb.checked = false; });
    updateExportBar();
  });

  // 写入种子数据（仅首次）
  seedIfEmpty();

  // 注册路由表
  defineRoutes({
    "/":               ()  => renderHome(),
    "/tag/:tag":       p   => renderHome({ tag: p.tag }),
    "/search/:query":  p   => renderHome({ query: decodeURIComponent(p.query) }),
    "/column/:col":    p   => renderHome({ column: p.col }),
    "/post/:id":       p   => renderPost({ id: p.id }),
    "/team":           ()  => renderTeam(),
    "/new":            ()  => renderEditor(),
    "/edit/:id":       p   => renderEditor({ id: p.id })
  });

  // 启动路由
  startRouter();
});
