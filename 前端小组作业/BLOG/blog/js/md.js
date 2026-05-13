/* ============================================================
   md.js — 轻量 Markdown 渲染器
   技术：纯正则 + 字符串替换，将 Markdown 语法转换为 HTML
   安全：先提取并隔离代码块，再对其余文本做 HTML 转义，
         防止用户输入的 <script> 等标签被执行（XSS 防护）

   支持的语法：
     # ## ###       → h1 h2 h3
     **text**       → <strong>
     *text*         → <em>
     `code`         → <code>
     ```...```      → <pre><code>
     > text         → <blockquote>
     - item         → <ul><li>
     1. item        → <ol><li>
     [text](url)    → <a>
     ---            → <hr>
     空行            → 段落分隔
   ============================================================ */

function renderMarkdown(src) {
  /* ── Step 1：提取并保护代码块，防止内部内容被后续规则误处理 ── */

  const fenceBlocks = [];
  const inlineCodes = [];

  // 多行代码块 ``` ... ```
  src = src.replace(/```([^\n]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    const cls = lang.trim() ? ` class="lang-${lang.trim()}"` : "";
    fenceBlocks.push(`<pre><code${cls}>${escaped}</code></pre>`);
    return `\x02FENCE${fenceBlocks.length - 1}\x03`;
  });

  // 行内代码 `code`
  src = src.replace(/`([^`\n]+)`/g, (_, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `\x02INLINE${inlineCodes.length - 1}\x03`;
  });

  /* ── Step 1.5：提取图片 ![alt](url)，保护 URL 不被 escapeHtml 破坏 ── */
  const imgBlocks = [];
  src = src.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safeAlt = alt.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    imgBlocks.push(`<img src="${url}" alt="${safeAlt}" class="md-img" loading="lazy" onerror="this.style.display='none'">`);
    return `\x02IMG${imgBlocks.length - 1}\x03`;
  });

  /* ── Step 2：对剩余文本做 HTML 转义（XSS 安全） ── */
  src = escapeHtml(src);

  /* ── Step 3：按 Markdown 语法逐步替换 ── */

  // 标题 （注意：顺序从多 # 到少 #）
  src = src.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  src = src.replace(/^## (.+)$/gm,  "<h2>$1</h2>");
  src = src.replace(/^# (.+)$/gm,   "<h1>$1</h1>");

  // 水平线
  src = src.replace(/^---$/gm, "<hr>");

  // 引用块
  src = src.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>"); // escapeHtml 已将 > 转为 &gt;

  // 无序列表（连续的 - 行合并为 <ul>）
  src = src.replace(/((?:^- .+\n?)+)/gm, match => {
    const items = match.trim().split("\n")
      .map(l => `<li>${l.replace(/^- /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // 有序列表（连续的 1. 行合并为 <ol>）
  src = src.replace(/((?:^\d+\. .+\n?)+)/gm, match => {
    const items = match.trim().split("\n")
      .map(l => `<li>${l.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // 粗体 **text**（escapeHtml 未处理 *）
  src = src.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

  // 斜体 *text*
  src = src.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  // 链接 [text](url) — url 已被 escapeHtml 转义，还原 &amp; → & 以正确渲染
  src = src.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safeUrl = url.replace(/&amp;/g, "&");
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${text}</a>`;
  });

  /* ── Step 4：段落处理 ── */
  // 将两个以上连续空行视为段落分隔
  const blocks = src.split(/\n{2,}/);
  src = blocks.map(block => {
    block = block.trim();
    if (!block) return "";
    // 已经是块级元素，不再包裹 <p>
    if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr)/.test(block)) return block;
    // 单行内换行转 <br>
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  /* ── Step 5：还原被保护的代码块 ── */
  src = src.replace(/\x02FENCE(\d+)\x03/g, (_, i) => fenceBlocks[i]);
  src = src.replace(/\x02INLINE(\d+)\x03/g, (_, i) => inlineCodes[i]);
  src = src.replace(/\x02IMG(\d+)\x03/g,    (_, i) => imgBlocks[i]);

  return src;
}

/** HTML 转义（防止 XSS） */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
