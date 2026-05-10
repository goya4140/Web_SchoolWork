/* ============================================================
   store.js — localStorage 数据层
   职责：对博客文章进行持久化存储，提供完整的 CRUD 操作
   技术：localStorage 作为本地"数据库"，JSON 序列化存取

   对应 SQL 概念：
     getAllPosts()     → SELECT * FROM posts ORDER BY createdAt DESC
     getPost(id)       → SELECT * FROM posts WHERE id = ?
     createPost(data)  → INSERT INTO posts VALUES (...)
     updatePost(id, d) → UPDATE posts SET ... WHERE id = ?
     deletePost(id)    → DELETE FROM posts WHERE id = ?
     searchPosts(q)    → SELECT * FROM posts WHERE title LIKE ? OR content LIKE ?
     getPostsByTag(t)  → SELECT * FROM posts WHERE tags CONTAINS ?
     getAllTags()       → SELECT tag, COUNT(*) FROM post_tags GROUP BY tag
   ============================================================ */

const DB_KEY = "wlh_blog_posts";

/* ── 工具函数 ── */

/** 生成唯一 ID：时间戳 + 随机后缀，碰撞概率极低 */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 从正文提取纯文字摘要（去除 Markdown 标记） */
function makeExcerpt(content, len = 130) {
  const plain = content
    .replace(/```[\s\S]*?```/g, "")   // 去掉代码块
    .replace(/`[^`]+`/g, "")          // 去掉行内代码
    .replace(/#{1,6}\s/g, "")         // 去掉标题标记
    .replace(/[*_>~]/g, "")           // 去掉粗斜体等标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 去掉链接，保留文字
    .replace(/\n+/g, " ")             // 换行转空格
    .trim();
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
}

/** 估算文章字数 */
function countWords(content) {
  const cjk = (content.match(/[一-鿿]/g) || []).length;
  const eng = (content.match(/\b[a-zA-Z]+\b/g) || []).length;
  return cjk + eng;
}

/* ── 基础读写 ── */

function _readDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
  catch { return []; }
}

function _writeDB(posts) {
  localStorage.setItem(DB_KEY, JSON.stringify(posts));
}

/* ── CRUD 接口 ── */

/** SELECT * — 返回全部文章，按创建时间倒序 */
function getAllPosts() {
  return _readDB().sort((a, b) => b.createdAt - a.createdAt);
}

/** SELECT WHERE id — 按 ID 查找单篇文章，不存在则返回 null */
function getPost(id) {
  return _readDB().find(p => p.id === id) || null;
}

/**
 * INSERT — 新建文章
 * @param {{ title: string, content: string, tags: string[] }} data
 * @returns {object} 新建的文章对象
 */
function createPost({ title, content, tags }) {
  const posts = _readDB();
  const now = Date.now();
  const post = {
    id:        genId(),
    title:     title.trim(),
    content,
    excerpt:   makeExcerpt(content),
    wordCount: countWords(content),
    tags:      tags.map(t => t.trim()).filter(Boolean),
    createdAt: now,
    updatedAt: now
  };
  posts.push(post);
  _writeDB(posts);
  return post;
}

/**
 * UPDATE WHERE id — 更新文章内容
 * @returns {object|null} 更新后的文章，ID 不存在则返回 null
 */
function updatePost(id, { title, content, tags }) {
  const posts = _readDB();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  posts[idx] = {
    ...posts[idx],
    title:     title.trim(),
    content,
    excerpt:   makeExcerpt(content),
    wordCount: countWords(content),
    tags:      tags.map(t => t.trim()).filter(Boolean),
    updatedAt: Date.now()
  };
  _writeDB(posts);
  return posts[idx];
}

/** DELETE WHERE id — 删除文章 */
function deletePost(id) {
  _writeDB(_readDB().filter(p => p.id !== id));
}

/**
 * 全文搜索 — 在标题、正文、标签中查找关键词
 * 对应 SQL: SELECT * WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
 */
function searchPosts(query) {
  const q = query.toLowerCase().trim();
  if (!q) return getAllPosts();
  return getAllPosts().filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
}

/** 按标签筛选 — 对应 SQL: SELECT * WHERE tags CONTAINS ? */
function getPostsByTag(tag) {
  return getAllPosts().filter(p => p.tags.includes(tag));
}

/**
 * 聚合统计所有标签及其文章数
 * 对应 SQL: SELECT tag, COUNT(*) FROM post_tags GROUP BY tag ORDER BY count DESC
 * @returns {{ [tag: string]: number }}
 */
function getAllTags() {
  const map = {};
  _readDB().forEach(p => {
    p.tags.forEach(t => { map[t] = (map[t] || 0) + 1; });
  });
  return Object.fromEntries(
    Object.entries(map).sort((a, b) => b[1] - a[1])
  );
}

/** 全站统计数据（首页展示用） */
function getStats() {
  const posts = _readDB();
  return {
    total:     posts.length,
    tagCount:  Object.keys(getAllTags()).length,
    wordCount: posts.reduce((sum, p) => sum + (p.wordCount || 0), 0)
  };
}

/* ── 种子数据 ── */

/**
 * 首次打开时写入示例文章，让博客不呈现空状态
 * 仅当数据库为空时执行（幂等）
 */
function seedIfEmpty() {
  if (_readDB().length > 0) return;

  const samples = [
    {
      title: "关于奖励模型与 RLHF 的一些思考",
      tags:  ["RLHF", "研究笔记", "AI"],
      content: `## 背景

RLHF（Reinforcement Learning from Human Feedback）是当前大语言模型对齐的核心技术路线之一。奖励模型（Reward Model）在其中扮演"价值判断者"的角色，负责将人类偏好转化为可微分的信号。

## 当前挑战

在实际训练过程中，奖励模型面临几个核心问题：

- **奖励欺骗（Reward Hacking）**：模型学会在奖励函数上"取巧"，而非真正对齐人类偏好
- **分布外泛化**：当生成策略偏离训练分布后，奖励模型的预测往往失真
- **偏好聚合困难**：不同标注者的偏好存在分歧，如何客观聚合是开放问题

## 我的研究方向

目前正在探索**基于偏好集成（Preference Ensemble）**的方法——训练多个独立的奖励模型并聚合其预测，以缓解单一奖励模型的脆弱性。初步实验表明该方法在标准 benchmark 上有一定改善。

## 下一步计划

1. 完成消融实验，量化各模块的贡献
2. 在更大规模的基座模型上验证方法的可扩展性
3. 整理实验记录，准备第一轮投稿

> 研究进展慢于预期，但每天都有新的理解，这本身就是收获。`
    },
    {
      title: "MACM 框架设计日志 #1",
      tags:  ["MACM", "多智能体", "研究笔记"],
      content: `## 动机

Theory of Mind（ToM）—— 即对他人心智状态（信念、意图、知识）的建模能力，是人类社会认知的核心能力。当前大多数多智能体系统缺乏显式的 ToM 推理机制，导致在需要合作、欺骗或信息不对称的任务中表现不佳。

## MACM 的核心思路

MACM（Multi-Agent Collaborative Reasoning with Theory of Mind）让每个智能体维护对其他智能体信念状态的显式建模，并在推理时将这些模型融入决策过程。

\`\`\`
Agent_i 的信念空间：
  B_i = { b_i(j) | j ≠ i }
  其中 b_i(j) 表示 Agent_i 对 Agent_j 所掌握信息的估计
\`\`\`

## 今日进展

- 完成了信念更新模块的初版实现
- 在经典 Sally-Anne 任务上验证了一阶 ToM 推理
- 发现二阶推理（"我认为你认为..."）在当前架构下存在计算开销问题

## 问题记录

当智能体数量超过 4 时，信念空间的维护成本呈指数增长，需要设计近似方法。

**下周计划**：调研稀疏信念表示（Sparse Belief Representation）的相关工作。`
    },
    {
      title: "大二上学期复盘",
      tags:  ["随笔", "复盘", "成长"],
      content: `## 总体感受

这个学期是我真正进入科研状态的学期。从最初对 RLHF 的懵懂了解，到现在能够独立设计实验、分析结果，中间经历了大量的阅读和反复试错。

## 完成的事

- 精读了 InstructGPT、Constitutional AI、RLAIF 等核心论文
- 搭建了完整的 RLHF 训练 pipeline（SFT → RM → PPO）
- 开始了 MACM 框架的早期设计与原型验证
- 完成了全部专业课作业和期末考试

## 没做好的事

- 论文阅读笔记太散，缺乏系统整理
- 和导师的沟通频率不够稳定
- 代码库的文档和注释质量较差

## 对下学期的期待

希望能在 MACM 上产出一个完整的实验结果，并完成第一篇投稿。同时也想在 AI 产品方向做一些实际落地的东西，不能只停留在研究层面。

> "框架优先，执行跟上。" —— 这是我今年给自己定的方法论，也是我理解的科研与产品之间最小公倍数。`
    }
  ];

  // 逆序插入，让第一篇在列表最上方
  [...samples].reverse().forEach(s => createPost(s));
}
