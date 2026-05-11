# 王邻皓前端作品说明文档

> 作者：王邻皓（WLH）  
> 课程：前端开发技术  
> 仓库：`前端小组作业/Personal_Page_WLH` · `前端小组作业/BLOG`

---

## 目录

1. [作品总览](#1-作品总览)
2. [个人主页 Personal_Page_WLH](#2-个人主页-personal_page_wlh)
   - [文件结构](#21-文件结构)
   - [HTML 结构解读](#22-html-结构解读)
   - [CSS 设计解读](#23-css-设计解读)
   - [JavaScript 功能解读](#24-javascript-功能解读)
3. [博客系统 BLOG](#3-博客系统-blog)
   - [文件结构](#31-文件结构)
   - [整体架构：单页应用（SPA）](#32-整体架构单页应用spa)
   - [store.js — 数据层](#33-storejs--数据层)
   - [router.js — 路由层](#34-routerjs--路由层)
   - [md.js — Markdown 渲染器](#35-mdjs--markdown-渲染器)
   - [app.js — 视图层](#36-appjs--视图层)
   - [CSS 设计解读](#37-css-设计解读)
4. [核心技术要点汇总](#4-核心技术要点汇总)

---

## 1. 作品总览

本人负责小组作业中的两个独立作品：

| 作品 | 路径 | 技术特点 |
|------|------|---------|
| **个人主页** | `Personal_Page_WLH/` | 单 HTML 文件，纯原生 JS，Intersection Observer 驱动的滚动动画 |
| **博客系统** | `BLOG/blog/` | 四层 SPA 架构，Hash 路由，localStorage 持久化，自实现 Markdown 渲染器 |

两个作品均采用**极简白底蓝色主调**的设计语言，共享同一套 CSS 变量体系（`--accent: #2563eb`），视觉风格统一。

---

## 2. 个人主页 Personal_Page_WLH

### 2.1 文件结构

```
Personal_Page_WLH/
├── index.html          # 页面骨架（语义化 HTML）
├── css/
│   └── style.css       # 全部样式（CSS 变量 + 组件化分区）
├── js/
│   └── main.js         # 全部动态逻辑（11 个功能模块）
└── images/
    └── wanglinhao.jpg  # 头像图片
```

### 2.2 HTML 结构解读

`index.html` 采用**语义化 HTML5 骨架**，全部动态内容交由 JS 渲染，HTML 只保留最小结构。

```html
<!-- 固定导航栏：初始 opacity:0，由 JS 控制出场动画 -->
<nav id="navbar">
  <div class="nav-inner">
    <span class="nav-logo">WLH</span>
    <ul class="nav-links">
      <li><a href="#about"        class="nav-link">关于我</a></li>
      <li><a href="#publications" class="nav-link">论文发表</a></li>
      <li><a href="#projects"     class="nav-link">工程项目</a></li>
    </ul>
  </div>
</nav>
```

- `href="#about"` 是**锚点导航**，点击后浏览器平滑滚动到对应 `<section id="about">`。
- 导航高亮通过 Intersection Observer 监听各 section 的可见性来实现，与普通 `scroll` 事件监听相比，**性能更优**（不阻塞主线程）。

```html
<!-- 关于我：头像 + 文字区，打字机和标签均由 JS 动态填充 -->
<section id="about" class="section fade-target">
  <div class="about-wrap">

    <div class="avatar-box">
      <!-- onerror 回调：图片加载失败时隐藏 img，显示文字占位 -->
      <img src="images/wanglinhao.jpg" id="avatar"
           onerror="this.style.display='none';
                    document.getElementById('avatar-fallback').style.display='flex';" />
      <div id="avatar-fallback" class="avatar-fallback">WLH</div>
    </div>

    <div class="about-text">
      <h1 class="name">王邻皓</h1>
      <!-- typing-output 由 typeWriter() 逐字填充，cursor 用 CSS 闪烁动画 -->
      <p class="subtitle">
        <span id="typing-output"></span><span class="cursor">|</span>
      </p>
      <p class="bio">...</p>
      <!-- tags-container 由 renderTags() 动态插入 <span> 节点 -->
      <div class="tags" id="tags-container"></div>
      <div class="social-links">...</div>
    </div>
  </div>
</section>

<!-- 论文和项目：只给出容器，内容完全由 JS 数据驱动渲染 -->
<section id="publications" class="section fade-target">
  <div class="pub-list" id="pub-list"></div>
</section>
<section id="projects" class="section fade-target">
  <div class="projects-grid" id="projects-grid"></div>
</section>
```

> **设计理念**：HTML 只描述页面的语义结构，所有内容数据集中写在 `main.js` 的常量中，日后更新论文或项目只需修改 JS 数据，无需改动 HTML。

**社交图标的实现**：直接内嵌 SVG（而非 `<img>` 引用外部图片），好处是：
1. 图标颜色可以通过 CSS `color` 属性控制（`fill="currentColor"`）。
2. 无需额外 HTTP 请求，页面加载更快。
3. 图标不会因外部资源失效而显示破图。

### 2.3 CSS 设计解读

#### CSS 自定义变量（设计令牌）

```css
:root {
  --bg:        #f7f8fc;   /* 页面背景：极浅灰蓝，避免纯白刺眼 */
  --surface:   #ffffff;   /* 卡片/浮层背景 */
  --border:    #e4e7ef;   /* 边框颜色 */
  --text:      #1a1d2e;   /* 主文字：深蓝黑，比纯黑更柔和 */
  --muted:     #6b7280;   /* 次要文字：灰色 */
  --accent:    #2563eb;   /* 强调色：蓝色，所有交互高亮使用此色 */
  --accent-lt: #eff6ff;   /* 强调色的浅底色，用于标签背景 */
  --radius:    12px;      /* 统一的卡片圆角 */
  --shadow:    0 4px 24px rgba(0,0,0,0.07);  /* 统一阴影 */
  --nav-h:     64px;      /* 导航栏高度，用于计算页面偏移 */
  --trans:     0.3s ease; /* 统一过渡时长 */
}
```

将颜色、尺寸等设计决策提取为变量，**两个作品之间视觉一致**，后期调整主题色只需改一行。

#### 导航栏出场动画

```css
#navbar {
  opacity: 0;
  transform: translateY(-100%);  /* 初始状态：隐藏在顶部上方 */
  transition: opacity 0.5s ease, transform 0.5s ease, box-shadow var(--trans);
}
/* JS 在 DOMContentLoaded 后 200ms 添加此类，触发滑入动画 */
#navbar.nav-visible { opacity: 1; transform: translateY(0); }
/* 滚动超过 20px 后 JS 添加此类，导航栏出现阴影层次感 */
#navbar.scrolled    { box-shadow: var(--shadow); }
```

#### 导航链接下划线动画

```css
.nav-link {
  position: relative;   /* 为伪元素提供定位基准 */
}
.nav-link::after {
  content: "";
  position: absolute;
  bottom: -4px; left: 0;
  width: 0;       /* 默认宽度为 0，不可见 */
  height: 2px;
  background: var(--accent);
  transition: width var(--trans);  /* 宽度变化有过渡动画 */
}
/* 悬停或激活时宽度变为 100%，产生从左向右展开的下划线效果 */
.nav-link:hover::after,
.nav-link.active::after { width: 100%; }
```

#### 头像入场动画

```css
@keyframes avatarIn {
  from { opacity: 0; transform: scale(0.8) rotate(-6deg); }
  to   { opacity: 1; transform: scale(1)   rotate(0deg); }
}
.avatar-box { animation: avatarIn 0.8s ease forwards; }
```

- `scale(0.8) rotate(-6deg)` → `scale(1) rotate(0)`：先小后大、带轻微旋转的弹入效果。
- `forwards`：动画结束后保持终态，防止头像闪回初始状态。

#### 打字光标闪烁

```css
.cursor {
  display: inline-block;
  animation: blink 0.75s step-end infinite;
  color: var(--accent);
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

- `step-end`（而非默认的 `ease`）产生**突变闪烁**，比渐变更像真实终端光标。

#### 论文封面图的层叠定位

```css
.pub-img-wrap {
  position: relative;
  background: linear-gradient(135deg, #dbeafe, #c7d2fe); /* 渐变占位背景 */
}
/* img 绝对定位覆盖占位背景，图片加载失败时自动降级为渐变色 */
.pub-img-wrap img {
  position: absolute;
  inset: 0;           /* 等价于 top:0; right:0; bottom:0; left:0; */
  width: 100%; height: 100%;
  object-fit: cover;  /* 裁剪填充，不拉伸变形 */
  z-index: 1;
}
/* 悬停时图片轻微放大，封面图不超出容器（overflow:hidden 裁剪） */
.pub-card:hover .pub-img-wrap img { transform: scale(1.04); }
```

#### 项目卡片的等比封面图

```css
.proj-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;  /* 固定 16:9 宽高比，随卡片宽度自动等比缩放 */
  position: relative;
  overflow: hidden;
}
```

使用 `aspect-ratio` 替代固定高度，是现代 CSS 的最佳实践——无论卡片宽度如何变化，封面图始终保持 16:9 比例，无需 JavaScript 计算。

#### 滚动进度条

```css
#progress-bar {
  position: fixed;
  top: 0; left: 0;
  height: 2px;
  background: var(--accent);
  width: 0%;               /* 初始宽度由 JS 实时更新 */
  z-index: 200;            /* 高于导航栏，始终可见 */
  transition: width 0.1s linear;
}
```

### 2.4 JavaScript 功能解读

`main.js` 按职责分为 11 个模块，以下逐一解析。

#### 数据层（常量）

```js
const TYPING_TEXT = "吉林大学 · CS大二 · RLHF & 多智能体研究";

const TAGS = ["RLHF", "Reward Model", "Multi-Agent", "ToM Reasoning", "MACM", "Python", "AI Product"];

const PUBLICATIONS = [
  {
    title:    "MACM: Multi-Agent Collaborative Reasoning with Theory of Mind",
    venue:    "Under Review",
    year:     "2025",
    abstract: "...",
    img:      "images/v1_timeline.jpg",
    links:    [{ label: "ArXiv", url: "#" }, { label: "Code", url: "#" }]
  },
  // ...
];

const PROJECTS = [
  {
    title: "智研 · AI 科研助手",
    desc:  "...",
    img:   "images/proj_aiassist.jpg",
    tags:  ["LLM", "RAG", "Python", "FastAPI"],
    url:   "#"
  },
  // ...
];
```

数据与渲染逻辑**完全分离**。添加一篇新论文只需在 `PUBLICATIONS` 数组中追加一个对象，页面自动更新，无需改动任何渲染代码。

#### 工具函数：`createElement`

```js
function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;  // textContent 而非 innerHTML，防 XSS
  return el;
}
```

封装了频繁的"创建元素→设置类名→设置文字"三步操作，减少代码重复。使用 `textContent`（而非 `innerHTML`）赋值文字，防止数据中的 HTML 字符被当做标签执行（XSS 防护）。

#### 工具函数：`svgPlaceholder`

```js
function svgPlaceholder(bg1, bg2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="220">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="220" fill="url(#g)"/>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
```

当图片文件不存在时，`onerror` 回调将 `img.src` 替换为此函数生成的 SVG 渐变图的 Data URI，**完全避免破图图标**，同时保持视觉一致性。

#### 打字机效果

```js
function typeWriter(text, container, speed = 60) {
  let i = 0;
  function type() {
    if (i < text.length) {
      container.textContent += text[i++];  // 每次追加一个字符
      setTimeout(type, speed);             // 60ms 后递归调用自身
    }
  }
  setTimeout(type, 600);  // 延迟 600ms 开始，等待头像动画先播完
}
```

用**递归 setTimeout** 而非 `setInterval` 的原因：每次调用完成后才安排下一次调用，时序更精准，不存在因执行时间超过间隔导致的"积压"问题。

#### 标签渲染

```js
function renderTags() {
  const container = document.getElementById("tags-container");
  TAGS.forEach((tag, i) => {
    const span = createElement("span", "tag", tag);
    // 每个标签的动画延迟递增，形成依次弹出的视觉效果
    span.style.animationDelay = `${0.8 + i * 0.08}s`;
    container.appendChild(span);
  });
}
```

CSS 中 `.tag` 带有 `@keyframes tagPop`（从 `scale(0.7)` 到 `scale(1)`），配合递增的 `animationDelay`，标签逐个弹出，视觉层次丰富。

#### 论文卡片渲染

```js
function renderPublications() {
  const list = document.getElementById("pub-list");

  PUBLICATIONS.forEach((pub, i) => {
    const card = createElement("div", "pub-card");
    card.style.animationDelay = `${i * 0.15}s`;

    // 左侧：封面图区（渐变背景 + img 层叠）
    const imgWrap = createElement("div", "pub-img-wrap");
    const img = document.createElement("img");
    img.src = pub.img;
    img.onerror = () => { img.src = svgPlaceholder("#dbeafe", "#c7d2fe"); };
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    // 右侧：徽章 → 标题 → 年份 → 摘要 → 链接按钮
    const body = createElement("div", "pub-body");
    const badge = createElement("div", "pub-badge");
    badge.appendChild(createElement("span", "pub-badge-dot")); // 蓝色圆点
    badge.appendChild(document.createTextNode(pub.venue));     // 发表状态文字
    body.appendChild(badge);

    body.appendChild(createElement("h3", "pub-title", pub.title));

    const meta = createElement("div", "pub-meta");
    meta.appendChild(createElement("span", null, `📅 ${pub.year}`));
    body.appendChild(meta);

    body.appendChild(createElement("p", "pub-abstract", pub.abstract));

    // 动态生成链接按钮
    const linkRow = createElement("div", "pub-links");
    pub.links.forEach(({ label, url }) => {
      const a = document.createElement("a");
      a.className = "pub-link";
      a.textContent = label;
      a.href = url;
      if (url !== "#") a.target = "_blank";  // 非占位链接才新标签页打开
      linkRow.appendChild(a);
    });
    body.appendChild(linkRow);

    card.appendChild(body);
    list.appendChild(card);
  });
}
```

#### 滚动淡入：Intersection Observer

```js
function initScrollAnimation() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible"); // 添加 visible 类触发 CSS 过渡
          observer.unobserve(entry.target);      // 只触发一次，触发后取消观察，节省资源
        }
      });
    },
    { threshold: 0.1 }  // 元素出现 10% 时触发
  );
  document.querySelectorAll(".fade-target").forEach(el => observer.observe(el));
}
```

`fade-target` 的 CSS 初始状态为 `opacity:0; transform:translateY(32px)`，添加 `visible` 后过渡到 `opacity:1; transform:translateY(0)`，实现向上飘入效果。

与 `scroll` 事件监听相比，Intersection Observer 的优势：
- 由浏览器原生异步处理，**不占用主线程**
- 代码量更少，逻辑更清晰
- 支持自动停止观察（`unobserve`），避免内存泄漏

#### 导航高亮：Intersection Observer

```js
function initNavHighlight() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          // 当某 section 进入视口，对应导航链接加 active 类
          navLinks.forEach(link =>
            link.classList.toggle("active", link.getAttribute("href") === `#${id}`)
          );
        }
      });
    },
    // rootMargin 将触发区域限制在视口中间 5%，避免滚动时多个 section 同时高亮
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach(s => observer.observe(s));
}
```

#### 滚动进度条

```js
function initProgressBar() {
  const bar = document.createElement("div");
  bar.id = "progress-bar";
  document.body.prepend(bar);  // 插入到 body 最前，配合 CSS position:fixed 浮于顶部

  window.addEventListener("scroll", () => {
    // 总可滚动距离 = 文档总高度 - 视口高度
    const total = document.body.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0%";
  }, { passive: true });  // passive:true 告知浏览器此监听不会调用 preventDefault，允许滚动优化
}
```

#### 入口函数

```js
document.addEventListener("DOMContentLoaded", () => {
  typeWriter(TYPING_TEXT, document.getElementById("typing-output"));
  renderTags();
  renderPublications();
  renderProjects();
  initScrollAnimation();
  initNavHighlight();
  initProgressBar();
  initNavbar();
});
```

`DOMContentLoaded` 在 HTML 解析完成后立即触发（无需等待图片等资源加载），确保所有 `getElementById` 都能找到目标元素。

---

## 3. 博客系统 BLOG

### 3.1 文件结构

```
BLOG/blog/
├── index.html      # SPA 宿主页面（只有一个 HTML 文件）
├── css/
│   └── style.css   # 全部样式
└── js/
    ├── store.js    # 数据层：localStorage CRUD
    ├── router.js   # 路由层：Hash 路由解析与分发
    ├── md.js       # 渲染层：Markdown → HTML 转换器
    └── app.js      # 视图层：页面渲染 + 事件绑定 + 路由注册
```

脚本加载顺序（`index.html` 中顺序不可打乱，后者依赖前者）：
```
store.js → router.js → md.js → app.js
```

### 3.2 整体架构：单页应用（SPA）

传统多页网站每次跳转都需要浏览器重新请求并渲染整个 HTML 页面。SPA（Single Page Application）只加载**一次** HTML，此后所有"页面切换"均由 JavaScript 在同一个页面内完成：

```
用户操作
    ↓
URL Hash 变化（#/post/abc123）
    ↓
hashchange 事件触发
    ↓
router.js 解析路径，匹配路由规则
    ↓
调用对应的渲染函数（如 renderPost）
    ↓
app.js 生成 HTML 字符串，写入 <main id="app">
    ↓
页面内容更新，无需刷新
```

```html
<!-- index.html 中唯一的内容挂载点 -->
<main id="app" class="app-container"></main>
```

所有"页面"的 HTML 都动态写入这一个 `<main>` 元素的 `innerHTML`。

### 3.3 store.js — 数据层

博客的数据持久化方案是 **localStorage**，相当于浏览器内置的键值数据库。

#### 为何选择 localStorage？

课程要求纯前端实现，无后端服务器。localStorage 能在用户关闭页面后保留数据，再次打开时文章仍在，满足"持久化"需求，且 API 极为简单。

#### 数据结构

每篇文章以如下 JSON 对象存储，所有文章组成数组序列化为字符串：

```js
{
  id:        "lp1a2b3c",      // 唯一 ID（时间戳+随机串）
  title:     "文章标题",
  content:   "# Markdown 正文...",
  excerpt:   "自动提取的纯文字摘要...",  // 用于首页卡片预览
  wordCount: 328,             // 字数统计（中文字符 + 英文单词）
  tags:      ["RLHF", "笔记"],
  createdAt: 1714800000000,   // Unix 时间戳（毫秒）
  updatedAt: 1714800000000
}
```

#### ID 生成

```js
function genId() {
  return Date.now().toString(36)           // 时间戳转 36 进制（8位以内）
       + Math.random().toString(36).slice(2, 6);  // 随机4位后缀
}
// 示例输出："lp1zkqb7"
```

`Date.now()` 保证单调递增，`Math.random()` 提供随机性，两者结合使碰撞概率极低。

#### 摘要提取

```js
function makeExcerpt(content, len = 130) {
  const plain = content
    .replace(/```[\s\S]*?```/g, "")          // 删除多行代码块（避免 ``` 出现在摘要中）
    .replace(/`[^`]+`/g, "")                 // 删除行内代码
    .replace(/#{1,6}\s/g, "")                // 删除 # 标题符号
    .replace(/[*_>~]/g, "")                  // 删除粗斜体等 Markdown 标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接 [文字](url) → 只保留文字
    .replace(/\n+/g, " ")                    // 换行转空格
    .trim();
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
}
```

#### 全部 CRUD 接口

```js
// 私有：读取全部数据（加 try-catch 防止 JSON 损坏时崩溃）
function _readDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
  catch { return []; }
}
// 私有：写入全部数据
function _writeDB(posts) {
  localStorage.setItem(DB_KEY, JSON.stringify(posts));
}

// SELECT *：返回全部文章，按创建时间倒序（最新的在最前）
function getAllPosts() {
  return _readDB().sort((a, b) => b.createdAt - a.createdAt);
}

// SELECT WHERE id：按 ID 查单篇，不存在返回 null
function getPost(id) {
  return _readDB().find(p => p.id === id) || null;
}

// INSERT：新建文章，自动计算摘要和字数
function createPost({ title, content, tags }) {
  const posts = _readDB();
  const now = Date.now();
  const post = { id: genId(), title: title.trim(), content,
                 excerpt: makeExcerpt(content), wordCount: countWords(content),
                 tags: tags.map(t => t.trim()).filter(Boolean),
                 createdAt: now, updatedAt: now };
  posts.push(post);
  _writeDB(posts);
  return post;
}

// UPDATE：更新标题/内容/标签，自动刷新摘要字数和更新时间
function updatePost(id, { title, content, tags }) {
  const posts = _readDB();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], title: title.trim(), content,
                 excerpt: makeExcerpt(content), wordCount: countWords(content),
                 tags: tags.map(t => t.trim()).filter(Boolean),
                 updatedAt: Date.now() };
  _writeDB(posts);
  return posts[idx];
}

// DELETE：过滤掉目标 ID 后重写数据库
function deletePost(id) {
  _writeDB(_readDB().filter(p => p.id !== id));
}

// 全文搜索：在标题、正文、标签中查找（大小写不敏感）
function searchPosts(query) {
  const q = query.toLowerCase().trim();
  if (!q) return getAllPosts();
  return getAllPosts().filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
}

// 按标签筛选
function getPostsByTag(tag) {
  return getAllPosts().filter(p => p.tags.includes(tag));
}

// 标签聚合统计：{ tag: count }，按数量降序
function getAllTags() {
  const map = {};
  _readDB().forEach(p => {
    p.tags.forEach(t => { map[t] = (map[t] || 0) + 1; });
  });
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
}
```

#### 种子数据

```js
function seedIfEmpty() {
  if (_readDB().length > 0) return; // 幂等：已有数据则跳过，不重复写入
  const samples = [ /* 3 篇示例文章 */ ];
  [...samples].reverse().forEach(s => createPost(s));
  // 逆序插入原因：createPost 记录当前时间戳，先插入的时间戳更小
  // 逆序后，samples[0] 最后插入，时间戳最大，在按时间倒序的列表中排在最前
}
```

### 3.4 router.js — 路由层

#### 核心原理

浏览器 URL 中 `#` 后面的部分称为 **Hash**。改变 Hash 不会触发页面刷新，但会触发 `hashchange` 事件——这是 Hash 路由的基础。

```
URL: http://localhost/blog/index.html#/post/abc123
                                      ↑
                               location.hash = "#/post/abc123"
```

#### 路由注册

```js
// 在 app.js 中调用，将 URL 模式映射到渲染函数
defineRoutes({
  "/":              () => renderHome(),
  "/tag/:tag":      p  => renderHome({ tag: p.tag }),    // :tag 是动态参数
  "/search/:query": p  => renderHome({ query: decodeURIComponent(p.query) }),
  "/post/:id":      p  => renderPost({ id: p.id }),
  "/team":          () => renderTeam(),
  "/new":           () => renderEditor(),
  "/edit/:id":      p  => renderEditor({ id: p.id })
});
```

#### 路由匹配（核心算法）

```js
function _match(path) {
  for (const [pattern, handler] of Object.entries(_routes)) {
    // 将路由模式转换为正则表达式
    // 例如："/post/:id" → /^\/post\/([^/]+)$/
    const regex = new RegExp(
      "^" + pattern.replace(/:([^/]+)/g, "([^/]+)") + "$"
    );
    const m = path.match(regex);
    if (m) {
      // 提取参数名（如 ["id"]）
      const keys = [...pattern.matchAll(/:([^/]+)/g)].map(x => x[1]);
      // 将参数名与捕获组的值一一对应（如 { id: "abc123" }）
      const params = Object.fromEntries(keys.map((k, i) => [k, m[i + 1]]));
      return { handler, params };
    }
  }
  return null; // 无匹配时返回 null，由调用方决定降级处理
}
```

#### 路由分发与启动

```js
function _dispatch() {
  const path = currentPath(); // 读取当前 hash（去掉 "#" 前缀）
  const matched = _match(path);
  if (matched) {
    matched.handler(matched.params); // 调用对应渲染函数，传入参数
  } else {
    _routes["/"]?.({}); // 未匹配则降级到首页
  }
}

function startRouter() {
  window.addEventListener("hashchange", _dispatch); // 此后每次 hash 变化自动分发
  _dispatch(); // 立即执行一次，处理初始 URL
}
```

### 3.5 md.js — Markdown 渲染器

这是 BLOG 的技术亮点之一：**自实现的轻量 Markdown 渲染器**，不依赖任何第三方库。

#### 整体处理流程（5步）

```
原始 Markdown 文本
      ↓
Step 1：提取并替换代码块（用占位符保护，防止被后续规则误处理）
      ↓
Step 2：对剩余文本做 HTML 转义（防 XSS 注入）
      ↓
Step 3：按 Markdown 语法逐步替换（标题、列表、粗体、链接等）
      ↓
Step 4：段落处理（双空行分段，非块级元素包裹 <p>）
      ↓
Step 5：还原被保护的代码块
      ↓
最终 HTML 字符串
```

#### 代码块保护机制

```js
const fenceBlocks = [];  // 存储已提取的代码块 HTML

// 用特殊控制字符（\x02 \x03）作为占位符，这些字符不会出现在正常文本中
src = src.replace(/```([^\n]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
  const escaped = escapeHtml(code.trimEnd()); // 代码内容单独转义，不参与后续规则
  fenceBlocks.push(`<pre><code>${escaped}</code></pre>`);
  return `\x02FENCE${fenceBlocks.length - 1}\x03`; // 替换为占位符
});

// Step 5 再还原
src = src.replace(/\x02FENCE(\d+)\x03/g, (_, i) => fenceBlocks[i]);
```

**为什么要先提取代码块？**  
代码块中可能出现 `##`、`**`、`- ` 等字符，如果不保护，后续规则会错误地将它们解析为标题、粗体、列表，导致代码内容损坏。

#### XSS 安全防护

```js
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")   // 必须第一个替换，否则后续替换产生的 & 也会被再次替换
    .replace(/</g, "&lt;")    // 防止 <script> 被执行
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

用户输入的文章内容在 Step 2 经过 `escapeHtml` 全面转义后，`<script>alert(1)</script>` 这类攻击代码会变成纯文本显示，**不会被浏览器执行**。

#### 引用块的特殊处理

```js
// escapeHtml 已将 > 转为 &gt;，所以匹配的是 &gt; 而非 >
src = src.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
```

这是一个需要理解处理顺序才能写对的细节：Step 2 的 `escapeHtml` 将 `>` 转成 `&gt;`，所以 Step 3 匹配引用块时必须匹配 `&gt;`。

### 3.6 app.js — 视图层

#### 挂载函数

```js
function mount(html) {
  const app = document.getElementById("app");
  app.innerHTML = html;            // 整体替换，相当于完整的"页面跳转"
  window.scrollTo({ top: 0, behavior: "smooth" }); // 切换页面后滚回顶部
}
```

#### 标签颜色算法

```js
const TAG_PALETTE = [
  ["#dbeafe", "#1d4ed8"], // 蓝
  ["#dcfce7", "#15803d"], // 绿
  // ...共 8 种配色
];

function tagColor(tag) {
  // 对标签名做字符串哈希（简单多项式哈希）
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  // 哈希值对配色数量取余，取绝对值防止负数
  return TAG_PALETTE[Math.abs(h) % TAG_PALETTE.length];
}
```

同一个标签名在任何地方（卡片、标签栏、详情页）颜色始终一致，因为哈希结果是确定的。

#### 首页渲染

```js
function renderHome({ tag = "", query = "" } = {}) {
  setNavActive("nav-home");

  // 根据当前路由参数决定显示哪些文章
  const posts = tag   ? getPostsByTag(decodeURIComponent(tag))
              : query ? searchPosts(query)
              : getAllPosts();

  mount(`
    <!-- Banner：统计数据实时从 store 读取 -->
    <div class="home-banner">
      <h1>WLH Blog</h1>
      <div class="stats-row">
        <strong>${stats.total}</strong> 篇文章 ·
        <strong>${stats.tagCount}</strong> 个标签
      </div>
    </div>

    <!-- 搜索框：300ms debounce 防止每次按键都触发路由跳转 -->
    <input id="search-input" value="${escapeHtml(query)}" />

    <!-- 标签过滤栏 -->
    ${renderTagFilter(allTags, decodeURIComponent(tag))}

    <!-- 文章卡片列表 -->
    <div id="post-list">${renderCards(posts)}</div>
  `);

  // 挂载后绑定搜索事件（innerHTML 替换后旧监听器自动失效，需重新绑定）
  let timer;
  document.getElementById("search-input").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = e.target.value.trim();
      navigate(q ? `/search/${encodeURIComponent(q)}` : "/");
    }, 300); // debounce 300ms
  });
}
```

#### 编辑器（新建与编辑复用）

```js
function renderEditor({ id } = {}) {
  const post = id ? getPost(id) : null;  // 有 id 则是编辑模式，否则是新建模式
  const isEdit = !!post;

  // 根据模式决定初始值：编辑模式填入现有内容，新建模式为空
  const title   = isEdit ? post.title   : "";
  const content = isEdit ? post.content : "";

  mount(`...编辑器 HTML...`);

  // 保存按钮：根据模式调用不同的 store 接口
  document.getElementById("btn-save").addEventListener("click", () => {
    if (isEdit) {
      updatePost(id, { title, content, tags }); // 更新已有文章
    } else {
      const p = createPost({ title, content, tags }); // 创建新文章
      setTimeout(() => navigate(`/post/${p.id}`), 800); // 发布后跳转到详情页
    }
  });
}
```

### 3.7 CSS 设计解读

BLOG 的 CSS 与个人主页共享同一套设计语言，重点介绍几个独特设计。

#### 导航栏毛玻璃效果

```css
#navbar {
  background: rgba(255, 255, 255, 0.92); /* 92% 不透明度，透出底部内容 */
  backdrop-filter: blur(10px);           /* 背景虚化，产生磨砂玻璃质感 */
}
```

#### 文章卡片顶部色条

```css
.card-accent-bar {
  height: 4px;
  width: 100%;
  /* background 由 JS 根据文章第一个标签的颜色动态设置 */
}
```

卡片顶部的彩色细线由 `cardAccent(post)` 函数生成渐变色，使不同标签的文章在视觉上能快速区分。

#### Markdown 正文排版

```css
.markdown-body h2 {
  padding-left: 12px;
  border-left: 4px solid var(--accent); /* 左侧蓝色竖线，层次感强 */
}
.markdown-body blockquote {
  border-left: 4px solid var(--accent);
  background: var(--accent-lt);         /* 浅蓝背景区分引用内容 */
  font-style: italic;
}
.markdown-body pre {
  background: #1e293b;  /* 深色代码块，与浅色页面形成对比 */
  color: #e2e8f0;
}
```

---

## 4. 核心技术要点汇总

| 技术点 | 位置 | 说明 |
|--------|------|------|
| **打字机效果** | `main.js: typeWriter()` | 递归 setTimeout，逐字追加 textContent |
| **SVG 占位图** | `main.js: svgPlaceholder()` | 生成渐变 SVG 的 Data URI，作为图片加载失败的降级 |
| **Intersection Observer** | `main.js: initScrollAnimation()` | 监听元素进入视口，触发滚动淡入动画，性能优于 scroll 事件 |
| **导航高亮** | `main.js: initNavHighlight()` | 同上，`rootMargin` 限制触发区域避免多项同时高亮 |
| **滚动进度条** | `main.js: initProgressBar()` | `scrollY / (scrollHeight - innerHeight)` 计算百分比 |
| **localStorage CRUD** | `store.js` | 封装 JSON 序列化/反序列化，提供类 SQL 接口 |
| **Hash 路由** | `router.js` | 正则匹配 URL 模式，提取动态参数，无刷新切换视图 |
| **Markdown 渲染** | `md.js: renderMarkdown()` | 5步管道：保护代码→XSS转义→正则替换→段落→还原 |
| **XSS 防护** | `md.js: escapeHtml()` | 用户输入全面 HTML 转义，防止脚本注入 |
| **标签颜色哈希** | `app.js: tagColor()` | 多项式字符串哈希取余调色板，保证同名标签颜色一致 |
| **Debounce 搜索** | `app.js: renderHome()` | 300ms 防抖，避免每次按键都触发路由跳转 |
| **数据驱动渲染** | `main.js` / `app.js` | 数据存放于常量数组，渲染函数遍历数组构建 DOM，数据与视图分离 |
| **CSS 变量设计令牌** | 两份 `style.css` | 颜色、尺寸统一定义在 `:root`，保证两个作品视觉一致 |
| **aspect-ratio** | `Personal_Page_WLH/style.css` | 项目卡片封面图等比缩放，无需 JS 计算 |
| **`passive: true`** | `main.js` / `app.js` | scroll 事件监听声明为被动，允许浏览器优化滚动性能 |
