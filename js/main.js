// ===== 主入口（支持 async 初始化）=====
document.addEventListener('DOMContentLoaded', async () => {
  // 全局安全超时：初始化超过 10 秒自动降级，避免一直转圈
  const initTimeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('初始化超时')), 10000)
  );

  // 0. 微信浏览器适配：动态检测安全区域
  function updateSafeArea() {
    // 检测是否在微信浏览器中
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isWeChat) {
      // 微信浏览器 - 使用更大的安全区域值确保不被原生 UI 遮挡
      // 状态栏约 44-48px + 顶部导航栏约 44px = ~92px
      // 底部工具栏约 50-60px + 安全区 = ~70px
      document.documentElement.style.setProperty('--safe-top', '44px');
      document.documentElement.style.setProperty('--safe-bottom', '70px');
      document.body.classList.add('wx-browser');
    } else if (isMobile) {
      // 移动端其他浏览器 - 使用 CSS env
      document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
      document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
    } else {
      // 桌面浏览器
      document.documentElement.style.setProperty('--safe-top', '0px');
      document.documentElement.style.setProperty('--safe-bottom', '0px');
    }
    
    // 移动端添加 class
    if (isMobile) {
      document.body.classList.add('mobile-device');
    }
  }
  updateSafeArea();
  window.addEventListener('resize', updateSafeArea);
  window.addEventListener('orientationchange', updateSafeArea);
  // 页面隐藏/显示时重新计算（微信切换标签页后回来可能需要）
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateSafeArea();
  });

  // 安全执行器：带超时的步骤
  async function safeStep(name, fn, timeoutMs = 8000) {
    const p = Promise.resolve().then(() => fn());
    const t = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${name} 超时`)), timeoutMs)
    );
    try {
      return await Promise.race([p, t]);
    } catch (e) {
      console.warn(`${name} 失败（已降级）:`, e.message);
      return null;
    }
  }

  try {
  // 1. 初始化 Supabase 连接（带超时降级）
  if (window.DB && typeof window.DB.init === 'function') {
    await safeStep('Supabase', () => window.DB.init(), 5000);
  }

  // 2. 初始化 Store
  if (typeof Store.init === 'function') {
    await safeStep('Store', () => Store.init(), 5000);
  }

  // 3. 应用主题
  const theme = Store.getTheme();
  document.body.setAttribute('data-theme', theme);

  // 4. 初始化认证
  await safeStep('Auth', () => Auth.init(), 3000);

  // 5. 初始化路由（触发首屏渲染）
  Router.init();

  // 6. 主题切换
  const themeToggle = document.getElementById('themeToggle');
  themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    Store.setTheme(next);
    Auth.updateUI();
  });

  // 7. 移动端菜单
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileMenu.classList.toggle('active');
  });
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });

  // 8. 搜索功能（异步支持）
  const searchBtn = document.getElementById('searchBtn');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchClose = document.getElementById('searchClose');

  searchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    setTimeout(() => searchInput.focus(), 100);
  });
  searchClose.addEventListener('click', () => searchOverlay.classList.remove('active'));
  searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) searchOverlay.classList.remove('active');
  });

  let searchTimeout;
  searchInput.addEventListener('input', async () => {
    const query = searchInput.value.trim().toLowerCase();
    clearTimeout(searchTimeout);
    if (!query) { searchResults.innerHTML = ''; return; }

    searchTimeout = setTimeout(async () => {
      const [posts, boards, users] = await Promise.all([
        Store.getPosts(),
        Store.getBoards(),
        Store.getUsers()
      ]);

      const filteredPosts = posts.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.content && p.content.toLowerCase().includes(query)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
      ).slice(0, 10);

      const filteredBoards = boards.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query)
      );

      const filteredUsers = users.filter(u =>
        (u.nickname || '').toLowerCase().includes(query) ||
        (u.username || '').toLowerCase().includes(query)
      );

      let html = '';
      if (filteredBoards.length) {
        filteredBoards.forEach(b => {
          html += `<div class="search-item" onclick="Router.navigate('/board/${b.id}')">
            <span class="search-item-type">板块</span>
            <span>${b.icon} ${escapeHtml(b.name)}</span>
          </div>`;
        });
      }
      if (filteredPosts.length) {
        filteredPosts.forEach(p => {
          html += `<div class="search-item" onclick="Router.navigate('/post/${p.id}')">
            <span class="search-item-type">帖子</span>
            <span>${escapeHtml(truncate(p.title, 40))}</span>
          </div>`;
        });
      }
      if (filteredUsers.length) {
        filteredUsers.forEach(u => {
          html += `<div class="search-item" onclick="Router.navigate('/profile')">
            <span class="search-item-type">用户</span>
            <span>${escapeHtml(u.nickname)} (@${escapeHtml(u.username)})</span>
          </div>`;
        });
      }
      if (!html) html = '<div style="padding:20px;text-align:center;color:var(--text-muted);">没有找到相关结果</div>';
      searchResults.innerHTML = html;
    }, 200);
  });

  // 9. ESC 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (searchOverlay.classList.contains('active')) {
        searchOverlay.classList.remove('active');
      }
      if (document.getElementById('modalOverlay')?.classList.contains('active')) {
        Modal.hide();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchOverlay.classList.add('active');
      setTimeout(() => searchInput.focus(), 100);
    }
  });

  // 10. FAB 发布
  const fab = document.getElementById('fab');
  fab.addEventListener('click', () => {
    if (!Auth.requireAuth('请先登录再发帖')) return;
    Router.navigate('/publish');
  });

  // 11. 触摸滑动优化 + 滚动性能优化
  let touchStartY = 0;
  
  document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  // 滚动时暂停不必要的动画计算 - 使用 requestAnimationFrame 优化
  let scrolling = false;
  let scrollTimeout;
  let scrollRafId = null;
  
  window.addEventListener('scroll', () => {
    if (!scrolling) {
      scrolling = true;
      // 使用 rAF 确保在下一帧添加类
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      scrollRafId = requestAnimationFrame(() => {
        document.body.classList.add('is-scrolling');
      });
    }
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scrolling = false;
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
        scrollRafId = null;
      }
      document.body.classList.remove('is-scrolling');
    }, 150);
  }, { passive: true });
  
  // 页面加载完成后，确保 fixed 元素正确显示
  window.addEventListener('load', () => {
    // 强制重新计算 fixed 元素位置
    setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 100);
  });
  
  // 移动端防止下拉刷新导致的问题
  let lastTouchY = 0;
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      lastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });

  // 12. 页面可见性
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && searchOverlay.classList.contains('active')) {
      searchOverlay.classList.remove('active');
    }
  });

  // 13. 欢迎 Toast
  if (!localStorage.getItem('zj12_welcomed')) {
    setTimeout(() => {
      Toast.show('info', '👋 欢迎来到漳州一中八年12班论坛！');
      localStorage.setItem('zj12_welcomed', '1');
    }, 800);
  }

  // 14. 控制台信息
  const dbMode = Store.isSupabase() ? 'Supabase 云数据库' : 'localStorage 本地存储';
  console.log('%c🏫 漳州一中 · 八年12班交流论坛', 'color:#3b82f6;font-size:16px;font-weight:bold;');
  console.log(`📦 存储模式：${dbMode}`);
  console.log('开发者：詹航瑜（八年12班）');
  console.log('管理员账号：admin / admin123');
  console.log('💡 要启用云数据库，请配置 js/supabase.js 中的 URL 和 anon key');

  } catch (initErr) {
    // 初始化全局降级：无论哪个步骤超时，都强制启动路由，避免一直转圈
    console.warn('初始化步骤超时或失败，强制启动路由:', initErr.message);
    // 如果路由还没初始化，立即执行
    if (!Router._initialized) {
      Router.init();
    }
  }
});
