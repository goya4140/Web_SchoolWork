/* ============================================================
   main.js — 个人主页动态逻辑
   技术要点：
     1. 打字机效果        — setTimeout 递归模拟逐字输出
     2. 标签动态渲染      — JS 操作 DOM 生成标签节点
     3. 论文卡片渲染      — 数据驱动，JS 遍历数组构建横向卡片 DOM
     4. 项目卡片渲染      — 同上，构建带封面图的竖向卡片 DOM
     5. 滚动淡入动画      — Intersection Observer API 监听可见性
     6. 导航栏高亮        — Intersection Observer 监听各 section
     7. 页面滚动进度条    — scroll 事件实时计算百分比
   ============================================================ */

/* ── 1. 页面数据 ── */

const TYPING_TEXT = "吉林大学 · CS大二 · RLHF & 多智能体研究";

const TAGS = [
  "RLHF", "Reward Model", "Multi-Agent",
  "ToM Reasoning", "MACM", "Python", "AI Product"
];

/**
 * 论文数据数组
 * links 数组中每项为 { label, url }，JS 会渲染为跳转按钮
 * img 指向本地封面图路径，图片缺失时显示渐变占位背景
 */
const PUBLICATIONS = [
  {
    title:    "MACM: Multi-Agent Collaborative Reasoning with Theory of Mind",
    venue:    "Under Review",
    year:     "2025",
    abstract: "We present MACM, a novel multi-agent framework that incorporates Theory of Mind (ToM) reasoning to enable agents to model the beliefs, intentions, and knowledge states of other agents. Evaluated on complex social reasoning benchmarks, MACM demonstrates significant improvements over single-agent and naive multi-agent baselines, highlighting the importance of belief modeling in collaborative inference tasks.",
    img:      "images/v1_timeline.jpg",
    links:    [
      { label: "ArXiv", url: "#" },
      { label: "Code",  url: "#" }
    ]
  },
  {
    title:    "Towards Scalable Reward Modeling for RLHF: A Preference Aggregation Perspective",
    venue:    "Under Review",
    year:     "2025",
    abstract: "Reward models are central to the success of Reinforcement Learning from Human Feedback (RLHF), yet their scalability and calibration remain open challenges. This paper proposes a preference aggregation framework that improves reward model robustness by ensemble-based preference fusion, achieving better alignment performance across diverse human feedback distributions while mitigating reward hacking.",
    img:      "images/pub_rlhf.jpg",
    links:    [
      { label: "ArXiv", url: "#" }
    ]
  }
];

/**
 * 工程项目数据数组
 * 仅包含 AI 产品、工程实践类项目（非科研论文）
 * img 指向本地封面图路径
 */
const PROJECTS = [
  {
    title: "智研 · AI 科研助手",
    desc:  "面向高校科研人员的 AI 辅助写作与文献管理产品。集成大语言模型实现论文摘要生成、相关文献推荐与实验笔记整理，显著降低科研信息处理成本。",
    img:   "images/proj_aiassist.jpg",
    tags:  ["LLM", "RAG", "Python", "FastAPI"],
    url:   "#"
  },
  {
    title: "RLHF 训练可视化平台",
    desc:  "端到端的 RLHF 流程管理与监控平台，支持奖励模型训练曲线实时可视化、偏好数据标注工作流管理，以及多轮 PPO 微调任务的调度与追踪。",
    img:   "images/proj_rlhf.jpg",
    tags:  ["RLHF", "React", "Python", "WebSocket"],
    url:   "#"
  },
  {
    title: "多智能体对话沙盒",
    desc:  "基于 MACM 框架的交互式多智能体对话演示系统。用户可实时配置智能体角色与 ToM 信念层级，观察智能体在社会推理任务中的协作过程与推断轨迹。",
    img:   "images/proj_sandbox.jpg",
    tags:  ["Multi-Agent", "ToM", "Vue3", "Python"],
    url:   "#"
  }
];

/* ── 2. 工具函数 ── */

/** 创建带 className 和文本内容的 DOM 元素 */
function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

/**
 * 生成 SVG 渐变占位图的 data URI
 * 当图片文件缺失时作为 img.src 的回退值，避免显示浏览器默认破图图标
 */
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

/* ── 3. 打字机效果 ── */

/**
 * 将 text 逐字追加到 container 的 textContent
 * 使用 setTimeout 递归，每 speed 毫秒输出一个字符
 */
function typeWriter(text, container, speed = 60) {
  let i = 0;
  function type() {
    if (i < text.length) {
      container.textContent += text[i++];
      setTimeout(type, speed);
    }
  }
  setTimeout(type, 600);
}

/* ── 4. 标签渲染 ── */

function renderTags() {
  const container = document.getElementById("tags-container");
  TAGS.forEach((tag, i) => {
    const span = createElement("span", "tag", tag);
    span.style.animationDelay = `${0.8 + i * 0.08}s`;
    container.appendChild(span);
  });
}

/* ── 5. 论文卡片渲染 ── */

/**
 * 遍历 PUBLICATIONS 构建横向卡片：
 *   左侧 .pub-img-wrap（封面图 + 渐变占位背景）
 *   右侧 .pub-body（徽章 · 标题 · 元信息 · 摘要 · 链接按钮）
 */
function renderPublications() {
  const list = document.getElementById("pub-list");

  PUBLICATIONS.forEach((pub, i) => {
    const card = createElement("div", "pub-card");
    card.style.animationDelay = `${i * 0.15}s`;

    /* 封面图区 */
    const imgWrap = createElement("div", "pub-img-wrap");
    const placeholder = createElement("span", "pub-img-icon", "📄");
    imgWrap.appendChild(placeholder);

    const img = document.createElement("img");
    img.src = pub.img;
    img.alt = pub.title;
    img.onerror = () => { img.src = svgPlaceholder("#dbeafe", "#c7d2fe"); };
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    /* 正文区 */
    const body = createElement("div", "pub-body");

    /* 状态徽章 */
    const badge = createElement("div", "pub-badge");
    badge.appendChild(createElement("span", "pub-badge-dot"));
    badge.appendChild(document.createTextNode(pub.venue));
    body.appendChild(badge);

    /* 标题 */
    body.appendChild(createElement("h3", "pub-title", pub.title));

    /* 元信息：年份 */
    const meta = createElement("div", "pub-meta");
    const yearSpan = createElement("span", null, `📅 ${pub.year}`);
    meta.appendChild(yearSpan);
    body.appendChild(meta);

    /* 摘要 */
    body.appendChild(createElement("p", "pub-abstract", pub.abstract));

    /* 链接按钮组 */
    if (pub.links && pub.links.length) {
      const linkRow = createElement("div", "pub-links");
      pub.links.forEach(({ label, url }) => {
        const a = document.createElement("a");
        a.className = "pub-link";
        a.textContent = label;
        a.href = url;
        if (url !== "#") a.target = "_blank";
        linkRow.appendChild(a);
      });
      body.appendChild(linkRow);
    }

    card.appendChild(body);
    list.appendChild(card);
  });
}

/* ── 6. 项目卡片渲染 ── */

/**
 * 遍历 PROJECTS 构建竖向卡片：
 *   上方 .proj-img-wrap（封面图 + 渐变占位背景）
 *   下方 .proj-body（标题 · 描述 · 标签 · 跳转链接）
 */
function renderProjects() {
  const grid = document.getElementById("projects-grid");

  PROJECTS.forEach((proj, i) => {
    const card = createElement("div", "project-card");
    card.style.animationDelay = `${i * 0.12}s`;

    /* 封面图区 */
    const imgWrap = createElement("div", "proj-img-wrap");
    imgWrap.appendChild(createElement("span", "proj-img-icon", "🚀"));

    const img = document.createElement("img");
    img.src = proj.img;
    img.alt = proj.title;
    img.onerror = () => { img.src = svgPlaceholder("#e0f2fe", "#ddd6fe"); };
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    /* 内容区 */
    const body = createElement("div", "proj-body");
    body.appendChild(createElement("h3", "proj-title", proj.title));
    body.appendChild(createElement("p", "proj-desc", proj.desc));

    /* 标签 */
    const tagRow = createElement("div", "proj-tags");
    proj.tags.forEach(t => tagRow.appendChild(createElement("span", "proj-tag", t)));
    body.appendChild(tagRow);

    /* 跳转链接 */
    const linkRow = createElement("div", "proj-link-row");
    const a = document.createElement("a");
    a.className = "proj-link";
    a.href = proj.url;
    if (proj.url !== "#") a.target = "_blank";
    a.innerHTML = `查看项目 <span class="proj-link-arrow">→</span>`;
    linkRow.appendChild(a);
    body.appendChild(linkRow);

    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* ── 7. Intersection Observer — 滚动淡入 ── */

function initScrollAnimation() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".fade-target").forEach(el => observer.observe(el));
}

/* ── 8. Intersection Observer — 导航高亮 ── */

function initNavHighlight() {
  const sections = document.querySelectorAll(".section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link =>
            link.classList.toggle("active", link.getAttribute("href") === `#${id}`)
          );
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach(s => observer.observe(s));
}

/* ── 9. 滚动进度条 ── */

function initProgressBar() {
  const bar = document.createElement("div");
  bar.id = "progress-bar";
  document.body.prepend(bar);

  window.addEventListener("scroll", () => {
    const total = document.body.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(window.scrollY / total) * 100}%` : "0%";
  }, { passive: true });
}

/* ── 10. 导航栏出场动画 + 滚动阴影 ── */

function initNavbar() {
  const nav = document.getElementById("navbar");
  setTimeout(() => nav.classList.add("nav-visible"), 200);
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });
}

/* ── 11. 入口 ── */

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
