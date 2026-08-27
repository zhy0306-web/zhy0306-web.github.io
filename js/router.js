// ===== 哈希路由（支持 async 渲染）=====
const Router = {
  routes: {
    '/': async () => Forum.renderHome(),
    '/board': async () => Forum.renderBoardList(),
    '/explore': async () => Forum.renderExplore(),
    '/ranking': async () => Forum.renderRanking(),
    '/auth': async (params) => Forum.renderAuth(params.tab || 'login'),
    '/profile': async () => {
      if (!Auth.isLoggedIn()) return '';
      return Forum.renderProfile();
    },
    '/favorites': async () => {
      if (!Auth.isLoggedIn()) return '';
      return Forum.renderProfileWithTab('favorites');
    },
    '/history': async () => {
      if (!Auth.isLoggedIn()) return '';
      return Forum.renderProfileWithTab('history');
    },
    '/admin': async (params) => {
      if (!Auth.isAdmin()) return '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">权限不足</div></div>';
      return Forum.renderAdmin(params.tab || 'dashboard');
    }
  },

  init() {
    if (this._initialized) return; // 防止重复初始化
    this._initialized = true;
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());
    this.handleRoute();
  },

  parseHash() {
    const hash = location.hash.slice(1) || '/';
    const [path, queryStr] = hash.split('?');
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach(kv => {
        const [k, v] = kv.split('=');
        params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, params };
  },

  async handleRoute() {
    const { path, params } = this.parseHash();
    const app = document.getElementById('app');
    if (!app) return;

    // 显示加载状态（仅异步渲染页面使用）
    app.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;padding:60px;min-height:300px;"><div class="loader" style="width:40px;height:40px;border:3px solid var(--glass-border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;"></div></div>';

    try {
      // 首页是同步渲染，不需要超时保护
      let content;
      const isHome = path === '/' || path === '';

      if (isHome) {
        // 同步渲染：立即返回，不等待 Supabase
        content = Forum.renderHome();
      } else {
        // 异步渲染 + 超时保护（10 秒，微信浏览器网络较慢）
        const renderPromise = (async () => {
          if (path.startsWith('/board/')) {
            const boardId = path.slice(7);
            return await Forum.renderBoardDetail(boardId);
          } else if (path.startsWith('/post/')) {
            const postId = path.slice(6);
            return await Forum.renderPostDetail(postId);
          } else if (path.startsWith('/publish')) {
            return await Forum.renderPublish(params.board);
          } else if (path.startsWith('/admin')) {
            return await this.routes['/admin'](params);
          } else if (this.routes[path]) {
            return await this.routes[path](params);
          } else {
            return Forum.renderNotFound();
          }
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('渲染超时')), 10000)
        );

        content = await Promise.race([renderPromise, timeoutPromise]);
      }

      if (!content) {
        throw new Error('渲染返回空内容');
      }

      app.innerHTML = content;

      // 更新导航高亮
      this.updateActiveNav(path);

      // 初始化页面交互
      if (typeof Forum.initPage === 'function') {
        await Forum.initPage();
      }

      // 绑定链接
      this.initLinks();

      // 滚动到顶部
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // 更新页面标题
      this.updateTitle(path);
    } catch (err) {
      console.error('路由错误:', err);
      app.innerHTML = `
        <div class="empty-state" style="padding:60px 20px;">
          <div class="empty-icon">⚠️</div>
          <div class="empty-text" style="margin:12px 0;">页面加载失败</div>
          <div style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">${escapeHtml(err.message || '网络超时，请检查连接')}</div>
          <button class="btn btn-primary" onclick="Router.refresh()" style="margin-right:8px;">🔄 重试</button>
          <button class="btn btn-secondary" onclick="Router.navigate('/')">🏠 返回首页</button>
        </div>`;
    }
  },

  navigate(path) {
    location.hash = '#' + path;
  },

  refresh() {
    // 强制重新渲染当前路由
    this._initialized = false; // 重置防重入标记
    this.handleRoute();
  },

  redirect(path) {
    location.hash = '#' + path;
    return '';
  },

  refresh() {
    this.handleRoute();
  },

  updateActiveNav(path) {
    document.querySelectorAll('.nav-link').forEach(link => {
      const route = link.dataset.route;
      if (route) {
        link.classList.toggle('active', path === route || (route !== '/' && path.startsWith(route)));
      }
    });
  },

  updateTitle(path) {
    const titles = {
      '/': '漳州一中 · 八年12班交流论坛',
      '/board': '板块 · 漳州一中论坛',
      '/explore': '广场 · 漳州一中论坛',
      '/ranking': '排行榜 · 漳州一中论坛',
      '/auth': '登录 · 漳州一中论坛',
      '/profile': '个人中心 · 漳州一中论坛',
      '/admin': '管理后台 · 漳州一中论坛'
    };
    document.title = titles[path] || '漳州一中 · 八年12班交流论坛';
  },

  initLinks() {
    document.querySelectorAll('[data-link]').forEach(el => {
      el.addEventListener('click', (e) => {
        const href = el.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const path = href.slice(1);
          this.navigate(path);
          // 关闭移动端菜单
          document.getElementById('mobileMenu')?.classList.remove('active');
          // 关闭搜索
          document.getElementById('searchOverlay')?.classList.remove('active');
        }
      });
    });
  }
};

window.Router = Router;

// 为 Forum 添加 renderProfileWithTab 方法
Forum.renderProfileWithTab = async function(tab) {
  if (!Auth.isLoggedIn()) return '';
  const html = await this.renderProfile();
  // 自动切换tab
  setTimeout(() => {
    const tabs = document.querySelectorAll('#profileTabs .profile-tab');
    const tabMap = { favorites: 'favorites', history: 'posts', posts: 'posts', replies: 'replies' };
    const targetTab = tabMap[tab] || 'posts';
    tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === targetTab);
    });
    if (this['renderProfileContent']) {
      this.renderProfileContent(targetTab);
    }
  }, 50);
  return html;
};

// 补充加载动画的 CSS
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
