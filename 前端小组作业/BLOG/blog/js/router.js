/* ============================================================
   router.js — 基于 URL Hash 的 SPA 路由
   技术：监听 hashchange 事件，解析 location.hash，匹配路由规则
   效果：URL 变化时无需刷新页面，直接切换视图（动态页面技术）

   路由规则示例：
     "/"          → 首页
     "/post/:id"  → 文章详情，:id 为动态参数
     "/new"       → 新建文章
     "/edit/:id"  → 编辑文章
     "/tag/:tag"  → 按标签筛选
   ============================================================ */

let _routes = {};   // { pattern: handlerFn }

/**
 * 注册路由表
 * @param {{ [pattern: string]: function }} routes
 */
function defineRoutes(routes) {
  _routes = routes;
}

/**
 * 跳转到指定 hash 路由（修改 location.hash 会触发 hashchange）
 * @param {string} path  例如 "/post/abc123"
 */
function navigate(path) {
  window.location.hash = path;
}

/** 获取当前路由路径（去掉 "#" 前缀，默认返回 "/"） */
function currentPath() {
  return decodeURIComponent(window.location.hash.slice(1)) || "/";
}

/**
 * 路由匹配：将 URL 路径与路由模式匹配，提取动态参数
 * ":param" 模式会被转换为 ([^/]+) 正则，捕获该段的值
 *
 * 例如：
 *   pattern = "/post/:id"，path = "/post/abc123"
 *   → { handler: fn, params: { id: "abc123" } }
 */
function _match(path) {
  for (const [pattern, handler] of Object.entries(_routes)) {
    const regex = new RegExp(
      "^" + pattern.replace(/:([^/]+)/g, "([^/]+)") + "$"
    );
    const m = path.match(regex);
    if (m) {
      const keys = [...pattern.matchAll(/:([^/]+)/g)].map(x => x[1]);
      const params = Object.fromEntries(keys.map((k, i) => [k, m[i + 1]]));
      return { handler, params };
    }
  }
  return null;
}

/** 执行一次路由分发（读取当前 hash，匹配并调用对应 handler） */
function _dispatch() {
  const path = currentPath();
  const matched = _match(path);
  if (matched) {
    matched.handler(matched.params);
  } else {
    // 未匹配时回退到首页
    _routes["/"]?.({});
  }
}

/**
 * 启动路由器
 * - 监听 hashchange，每次 URL 变化自动分发
 * - 立即执行一次，处理页面初始 URL
 */
function startRouter() {
  window.addEventListener("hashchange", _dispatch);
  _dispatch();
}

/** 原地重新分发当前路由（视图切换时用，不触发 hashchange） */
function refresh() { _dispatch(); }
