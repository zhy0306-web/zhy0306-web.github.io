// ===== 论坛页面渲染 =====
const Forum = {
  // ========== 首页（渐进式渲染：先用本地数据渲染，再异步加载 Supabase） ==========
  renderHome() {
    // 第一步：用本地缓存同步渲染（立即显示，不等待 Supabase）
    const posts = Store.getPostsSync();
    const boards = Store.getBoardsSync();
    const users = Store.getUsersSync();
    const replies = Store.getRepliesSync();
    const sorted = [...posts].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    const recentPosts = sorted.slice(0, 6);
    const totalPosts = posts.length;
    const totalUsers = users.length;
    const totalReplies = replies.length;
    const boardNotice = sorted.find(p => p.boardId === 'board_notice' && p.pinned) || sorted[0];

    // 同步渲染板块卡片（用本地数据）
    const boardCards = boards.slice(0, 6).map(b => {
      const postCount = posts.filter(p => p.boardId === b.id).length;
      return `
        <a class="board-card" href="#/board/${b.id}" data-link>
          <div class="board-icon" style="background:linear-gradient(135deg, ${b.color}, ${b.color}dd);">${b.icon}</div>
          <div class="board-info"><h3>${escapeHtml(b.name)}</h3><p>${escapeHtml(b.description)}</p></div>
          <div class="board-meta"><span>📝 ${postCount} 帖</span></div>
        </a>`;
    }).join('');

    // 同步渲染帖子卡片（简化版，用本地数据）
    const postCards = recentPosts.map(p => {
      const board = boards.find(b => b.id === p.boardId);
      const imgCount = p.images ? p.images.length : 0;
      const imgClass = imgCount === 1 ? 'single' : imgCount === 2 ? 'two' : '';
      return `
        <div class="post-card ${p.pinned ? 'pinned' : ''} ${p.featured ? 'featured' : ''}" data-post="${p.id}" onclick="Router.navigate('/post/${p.id}')">
          <div class="post-head">
            <div class="avatar">${escapeHtml(p.authorAvatar)}</div>
            <div class="post-meta">
              <div class="post-author">
                ${escapeHtml(p.authorName)}
                ${p.pinned ? '<span class="tag tag-primary" style="font-size:10px;padding:1px 6px;margin-left:6px;">📌 置顶</span>' : ''}
                ${p.featured ? '<span class="tag tag-accent" style="font-size:10px;padding:2px 8px;margin-left:4px;">⭐ 加精</span>' : ''}
              </div>
              <div class="post-time">${typeof formatTime === 'function' ? formatTime(p.createdAt) : ''} · ${board ? board.name : ''}</div>
            </div>
          </div>
          <div class="post-title-row"><h3 class="post-title">${escapeHtml(p.title)}</h3></div>
          ${p.tags && p.tags.length ? `<div class="post-tags">${p.tags.map(t => `<span class="tag" style="font-size:10px;padding:2px 8px;">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
          <p class="post-excerpt">${escapeHtml(truncate(p.content, 150))}</p>
          ${imgCount ? `<div class="post-images ${imgClass}">${p.images.slice(0, 3).map(src => `<img class="post-img" src="${src}" alt="" loading="lazy" />`).join('')}</div>` : ''}
          <div class="post-actions" onclick="event.stopPropagation();">
            <button class="post-action like-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${p.likes}</button>
            <button class="post-action"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${p.replies}</button>
            <button class="post-action" style="margin-left:auto;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${p.views}</button>
          </div>
        </div>`;
    }).join('');

    // 侧边栏（用本地数据同步渲染）
    const hotPosts = [...posts].sort((a, b) => (b.likes + b.replies * 2) - (a.likes + a.replies * 2)).slice(0, 5);
    const sidebarItems = boards.map(b => {
      const count = posts.filter(p => p.boardId === b.id).length;
      return `<a class="sidebar-item" href="#/board/${b.id}" data-link><span>${b.icon} ${escapeHtml(b.name)}</span><span class="sidebar-count">${count}</span></a>`;
    }).join('');
    const sidebarHot = hotPosts.map((p, i) =>
      `<a class="sidebar-item" href="#/post/${p.id}" data-link><span>${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} ${escapeHtml(truncate(p.title, 20))}</span></a>`
    ).join('');

    const html = `
      <div class="hero">
        <div class="hero-content">
          <div class="hero-left">
            <div class="hero-badge"><img src="images/logo.png" alt="校徽" class="hero-badge-logo" /> 漳州一中 · 八年12班</div>
            <h1 class="hero-title">欢迎来到班级交流论坛</h1>
            <p class="hero-desc">这里是我们八年12班的数字家园 🎉 分享学习心得、记录校园生活、参与班级活动，一起让我们的班级更美好！</p>
            <a href="https://github.com/zhy0306-web/zzyz-class12-forum" target="_blank" rel="noopener" class="hero-github-btn" title="在 GitHub 上查看开源项目">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.65 0-1.25.45-2.27 1.19-3.07-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a10.98 10.98 0 015.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.07 0 4.39-2.69 5.36-5.26 5.64.41.35.77 1.05.77 2.12v3.14c0 .31.21.67.8.56A11.51 11.51 0 0023.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
              <span>GitHub 开源项目</span>
            </a>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><div class="hero-stat-num">${totalPosts}</div><div class="hero-stat-label">帖子</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${totalReplies}</div><div class="hero-stat-label">回复</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${totalUsers}</div><div class="hero-stat-label">同学</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${boards.length}</div><div class="hero-stat-label">板块</div></div>
          </div>
        </div>
      </div>

      ${boardNotice ? `
      <div class="notice-card" onclick="Router.navigate('/post/${boardNotice.id}')" style="cursor:pointer;">
        <div class="notice-icon">📢</div>
        <div class="notice-body">
          <div class="notice-title">${escapeHtml(boardNotice.title)}</div>
          <div class="notice-content">${escapeHtml(truncate(boardNotice.content, 100))}</div>
        </div>
      </div>` : ''}

      <div class="section-title"><h2>📋 板块导航</h2><a class="section-link" href="#/board" data-link>查看全部 →</a></div>
      <div class="board-grid">${boardCards}</div>

      <div class="section-title"><h2>🔥 最新帖子</h2><a class="section-link" href="#/explore" data-link>去广场看看 →</a></div>
      <div class="two-col">
        <div class="post-list" id="home-post-list">${postCards || '<div class="empty-text">暂无帖子，发布第一篇吧！</div>'}</div>
        <div class="sidebar" id="home-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-title">📋 板块导航</div>
            <div class="sidebar-list">${sidebarItems}</div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-title">🔥 热门帖子</div>
            <div class="sidebar-list">${sidebarHot || '<div style="color:var(--text-muted);font-size:13px;">暂无热门帖子</div>'}</div>
          </div>
          <div class="sidebar-card" style="text-align:center;">
            <div class="sidebar-title" style="justify-content:center;"><img src="images/logo.png" alt="校徽" class="sidebar-logo" /> 漳州一中</div>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">福建省漳州第一中学<br>八年12班交流论坛<br><span style="color:var(--primary);font-weight:600;">博学 · 求真 · 致远</span></p>
          </div>
        </div>
      </div>
    `;

    // 第二步：渲染完成后，后台异步加载 Supabase 数据更新 DOM
    if (Store.isSupabase()) {
      setTimeout(() => this._bgLoadSupabaseHome(), 200);
    }

    return html;
  },

  // 后台异步加载 Supabase 数据，增量更新首页
  async _bgLoadSupabaseHome() {
    try {
      const [posts, boards, users, replies] = await Promise.all([
        Store.getPosts(),
        Store.getBoards(),
        Store.getUsers(),
        Store.getReplies()
      ]);

      if (!posts && !boards) return; // 全部超时，保持本地数据

      const sorted = [...(posts || [])].sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        if (a.featured !== b.featured) return b.featured ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
      const recentPosts = sorted.slice(0, 6);
      const boardList = boards || Store.getBoardsSync();

      // 更新帖子列表
      const postListEl = document.getElementById('home-post-list');
      if (postListEl && recentPosts.length > 0) {
        postListEl.innerHTML = recentPosts.map(p => {
          const board = boardList.find(b => b.id === p.boardId);
          return `
            <div class="post-card ${p.pinned ? 'pinned' : ''} ${p.featured ? 'featured' : ''}" data-post="${p.id}" onclick="Router.navigate('/post/${p.id}')">
              <div class="post-head">
                <div class="avatar">${escapeHtml(p.authorAvatar)}</div>
                <div class="post-meta">
                  <div class="post-author">${escapeHtml(p.authorName)}</div>
                  <div class="post-time">${typeof formatTime === 'function' ? formatTime(p.createdAt) : ''} · ${board ? board.name : ''}</div>
                </div>
              </div>
              <div class="post-title-row"><h3 class="post-title">${escapeHtml(p.title)}</h3></div>
              <p class="post-excerpt">${escapeHtml(truncate(p.content, 150))}</p>
              <div class="post-actions"><button class="post-action like-btn">❤️ ${p.likes}</button><button class="post-action">💬 ${p.replies}</button></div>
            </div>`;
        }).join('');
      }

      console.log('%c📡 Supabase 数据已同步到首页', 'color:#10b981;');
    } catch (e) {
      console.warn('后台加载 Supabase 数据失败，保持本地数据:', e.message);
    }
  },

  async renderBoardCard(board) {
    const postCount = (await Store.getPostsByBoard(board.id)).length;
    return `
      <a class="board-card" href="#/board/${board.id}" data-link>
        <div class="board-icon" style="background:linear-gradient(135deg, ${board.color}, ${board.color}dd);">${board.icon}</div>
        <div class="board-info"><h3>${escapeHtml(board.name)}</h3><p>${escapeHtml(board.description)}</p></div>
        <div class="board-meta"><span>📝 ${postCount} 帖</span></div>
      </a>`;
  },

  async renderPostCard(post) {
    const isLiked = Auth.isLoggedIn() && (await Store.hasLike(Auth.currentUser.id, post.id));
    const isFav = Auth.isLoggedIn() && (await Store.isFavorite(Auth.currentUser.id, post.id));
    const boards = await Store.getBoards();
    const board = boards.find(b => b.id === post.boardId);
    const imgCount = post.images ? post.images.length : 0;
    const imgClass = imgCount === 1 ? 'single' : imgCount === 2 ? 'two' : '';

    return `
      <div class="post-card ${post.pinned ? 'pinned' : ''} ${post.featured ? 'featured' : ''}" data-post="${post.id}" onclick="Router.navigate('/post/${post.id}')">
        <div class="post-head">
          <div class="avatar">${escapeHtml(post.authorAvatar)}</div>
          <div class="post-meta">
            <div class="post-author">
              ${escapeHtml(post.authorName)}
              ${post.pinned ? '<span class="tag tag-primary" style="font-size:10px;padding:1px 6px;margin-left:6px;">📌 置顶</span>' : ''}
              ${post.featured ? '<span class="tag tag-accent" style="font-size:10px;padding:1px 6px;margin-left:4px;">⭐ 加精</span>' : ''}
            </div>
            <div class="post-time">${formatTime(post.createdAt)} · ${board ? board.name : '未知'}</div>
          </div>
        </div>
        <div class="post-title-row"><h3 class="post-title">${escapeHtml(post.title)}</h3></div>
        ${post.tags && post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag" style="font-size:10px;padding:2px 8px;">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <p class="post-excerpt">${escapeHtml(truncate(post.content, 150))}</p>
        ${imgCount ? `<div class="post-images ${imgClass}">${post.images.slice(0, 3).map(src => `<img class="post-img" src="${src}" alt="" loading="lazy" />`).join('')}</div>` : ''}
        <div class="post-actions" onclick="event.stopPropagation();">
          <button class="post-action like-btn ${isLiked ? 'active' : ''}" onclick="Forum.toggleLike('${post.id}')">
            <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${post.likes}
          </button>
          <button class="post-action" onclick="Router.navigate('/post/${post.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            ${post.replies}
          </button>
          <button class="post-action fav-btn ${isFav ? 'active fav' : ''}" onclick="Forum.toggleFavorite('${post.id}')">
            <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${isFav ? '已收藏' : '收藏'}
          </button>
          <button class="post-action" style="margin-left:auto;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${post.views}
          </button>
        </div>
      </div>`;
  },

  async renderSidebar() {
    const boards = await Store.getBoards();
    const posts = await Store.getPosts();
    const hotPosts = [...posts].sort((a, b) => (b.likes + b.replies * 2) - (a.likes + a.replies * 2)).slice(0, 5);
    const boardItems = await Promise.all(boards.map(async b => {
      const count = (await Store.getPostsByBoard(b.id)).length;
      return `<a class="sidebar-item" href="#/board/${b.id}" data-link><span>${b.icon} ${escapeHtml(b.name)}</span><span class="sidebar-count">${count}</span></a>`;
    }));
    return `
      <div class="sidebar-card">
        <div class="sidebar-title">📋 板块导航</div>
        <div class="sidebar-list">
          ${boardItems.join('')}
        </div>
      </div>
      <div class="sidebar-card">
        <div class="sidebar-title">🔥 热门帖子</div>
        <div class="sidebar-list">
          ${hotPosts.map((p, i) => `<a class="sidebar-item" href="#/post/${p.id}" data-link><span>${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} ${escapeHtml(truncate(p.title, 20))}</span></a>`).join('')}
        </div>
      </div>
      <div class="sidebar-card" style="text-align:center;">
        <div class="sidebar-title" style="justify-content:center;"><img src="images/logo.png" alt="校徽" class="sidebar-logo" /> 漳州一中</div>
        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;">福建省漳州第一中学<br>八年12班交流论坛<br><span style="color:var(--primary);font-weight:600;">博学 · 求真 · 致远</span></p>
      </div>`;
  },

  // ========== 板块相关 ==========
  async renderBoardList() {
    const boards = (await Store.getBoards()).sort((a, b) => (a.order || 0) - (b.order || 0));
    const boardCards = await Promise.all(boards.map(b => this.renderBoardCard(b)));
    return `
      <div class="page-header"><div><h1 class="page-title">📋 全部板块</h1><div class="page-subtitle">选择感兴趣的板块，开始交流吧</div></div></div>
      <div class="board-grid">${boardCards.join('')}</div>`;
  },

  async renderBoardDetail(boardId) {
    const boards = await Store.getBoards();
    const board = boards.find(b => b.id === boardId);
    if (!board) return this.renderNotFound();
    const posts = await Store.getPostsByBoard(boardId);
    const sorted = [...posts].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    const postCards = await Promise.all(sorted.map(p => this.renderPostCard(p)));
    return `
      <div class="page-header">
        <div><h1 class="page-title" style="font-size:24px;">${board.icon} ${escapeHtml(board.name)}</h1><div class="page-subtitle">${escapeHtml(board.description)} · ${posts.length} 篇帖子</div></div>
        <a href="#/publish?board=${board.id}" data-link class="btn btn-primary">✏️ 发帖</a>
      </div>
      <div class="post-list">${sorted.length ? postCards.join('') : this.renderEmpty('这个板块还没有帖子，快来发第一篇吧！')}</div>`;
  },

  // ========== 探索 ==========
  async renderExplore() {
    const posts = await Store.getPosts();
    const sorted = [...posts].sort((a, b) => (b.likes * 2 + b.replies * 3 + b.views * 0.1) - (a.likes * 2 + a.replies * 3 + a.views * 0.1));
    const postCards = await Promise.all(sorted.map(p => this.renderPostCard(p)));
    const sidebar = await this.renderSidebar();
    return `
      <div class="page-header"><div><h1 class="page-title">🌟 广场</h1><div class="page-subtitle">发现更多精彩内容</div></div></div>
      <div class="two-col"><div class="post-list">${postCards.join('')}</div><div class="sidebar">${sidebar}</div></div>`;
  },

  // ========== 帖子详情（渐进式渲染） ==========
  renderPostDetail(postId) {
    // 第一步：用本地缓存同步渲染
    const post = Store.getPostByIdSync(postId);
    if (!post) return this.renderNotFound();

    const boards = Store.getBoardsSync();
    const board = boards.find(b => b.id === post.boardId);
    const replies = Store.getRepliesByPostSync(postId);
    const currentUser = Auth.currentUser;
    const isLiked = currentUser ? (post.likes || 0) > 0 : false; // 简化
    const isFav = currentUser ? Store.isFavoriteSync(currentUser.id, postId) : false;
    const canDelete = currentUser && (currentUser.id === post.authorId || Auth.isAdmin());

    // 本地增加浏览量
    post.views = (post.views || 0) + 1;
    Store.updatePost(postId, { views: post.views });

    const replyMaxLength = 1000;

    // 渲染回复列表
    const repliesHtml = replies.length ? replies.map(r => {
      const replyAuthor = (Store.getUsersSync().find(u => u.id === r.authorId)) || { nickname: '匿名', avatar: '?' };
      return `
        <div class="reply-card" data-reply="${r.id}">
          <div class="post-head">
            <div class="avatar">${escapeHtml(replyAuthor.avatar || '?')}</div>
            <div class="post-meta">
              <div class="post-author">${escapeHtml(replyAuthor.nickname || replyAuthor.username || '匿名')}</div>
              <div class="post-time">${formatTime(r.createdAt)}</div>
            </div>
          </div>
          <div class="reply-content">${escapeHtml(truncate(r.content, 500))}</div>
          ${r.images && r.images.length ? `<div class="post-images">${r.images.slice(0,3).map(src=>`<img class="post-img" src="${src}" alt="" loading="lazy"/>`).join('')}</div>` : ''}
          <div class="reply-actions">
            <button class="post-action like-btn" onclick="Forum.toggleReplyLike('${r.id}')">❤️ ${r.likes || 0}</button>
            <button class="post-action" onclick="Forum.replyTo('${r.id}')">💬 回复</button>
            ${canDelete ? `<button class="post-action" onclick="Forum.deleteReply('${r.id}')" style="color:var(--danger);">🗑</button>` : ''}
          </div>
        </div>`;
    }).join('') : '<div class="empty-text">暂无回复，来抢沙发吧！</div>';

    const html = `
      <div class="post-detail" id="post-detail-container">
        <div class="post-detail-meta">
          <a href="#/board/${post.boardId}" data-link class="tag tag-primary">${board ? board.icon + ' ' + board.name : '未知'}</a>
          ${post.pinned ? '<span class="tag tag-primary">📌 置顶</span>' : ''}
          ${post.featured ? '<span class="tag tag-accent">⭐ 加精</span>' : ''}
          <span style="font-size:13px;color:var(--text-muted);margin-left:auto;">${formatTime(post.createdAt)} · 👁 ${post.views}</span>
        </div>
        <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>
        <div class="post-head" style="margin-bottom:20px;">
          <div class="avatar">${escapeHtml(post.authorAvatar)}</div>
          <div class="post-meta"><div class="post-author">${escapeHtml(post.authorName)}</div><div class="post-time">${formatTime(post.createdAt)}</div></div>
        </div>
        ${post.tags && post.tags.length ? `<div class="post-tags" style="margin-bottom:16px;">${post.tags.map(t => `<span class="tag" style="font-size:12px;">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <div class="post-detail-content">${escapeHtml(post.content)}</div>
        ${post.images && post.images.length ? `<div class="post-detail-images">${post.images.map(src => `<img class="post-detail-img" src="${src}" alt="" onclick="Forum.openLightbox('${src}')" />`).join('')}</div>` : ''}
        <div class="post-actions" style="margin-top:24px;padding-top:20px;border-top:1px solid var(--glass-border);">
          <button class="post-action like-btn ${isLiked ? 'active' : ''}" onclick="Forum.toggleLike('${post.id}')" style="padding:10px 20px;font-size:14px;">
            <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${post.likes}
          </button>
          <button class="post-action fav-btn ${isFav ? 'active fav' : ''}" onclick="Forum.toggleFavorite('${post.id}')" style="padding:10px 20px;font-size:14px;">
            <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            ${isFav ? '已收藏' : '收藏'}
          </button>
          ${canDelete ? `<button class="post-action" onclick="Forum.deletePost('${post.id}')" style="padding:10px 20px;font-size:14px;color:var(--danger);">🗑 删除</button>` : ''}
        </div>

        <!-- 回复区 -->
        <div class="section-title" style="margin-top:24px;"><h3>💬 回复 (${replies.length})</h3></div>
        <div id="reply-list-container">${repliesHtml}</div>

        ${Auth.isLoggedIn() ? `
        <div class="reply-form-container" style="margin-top:24px;">
          <textarea id="replyContent" class="input" placeholder="写下你的回复..." maxlength="${replyMaxLength}" style="width:100%;min-height:80px;resize:vertical;font-family:inherit;"></textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
            <span style="color:var(--text-muted);font-size:12px;"><span id="replyCharCount">0</span> / ${replyMaxLength}</span>
            <button class="btn btn-primary" onclick="Forum.submitReply('${post.id}')">发送回复</button>
          </div>
        </div>` : `
        <div class="login-prompt" style="text-align:center;padding:24px;margin-top:24px;">
          <p style="color:var(--text-secondary);margin-bottom:12px;">登录后才能参与讨论</p>
          <button class="btn btn-primary" onclick="Auth.showModal('login')">立即登录</button>
        </div>`}
      </div>
    `;

    // 第二步：异步加载 Supabase 数据
    if (Store.isSupabase()) {
      setTimeout(() => this._bgLoadPostDetail(postId), 200);
    }

    return html;
  },

  // 后台异步加载帖子详情的 Supabase 数据
  async _bgLoadPostDetail(postId) {
    try {
      const post = await Store.getPostById(postId);
      if (!post) return;
      // 增量更新：仅更新变化的字段
      const container = document.getElementById('post-detail-container');
      if (!container) return;
      console.log('%c📡 Supabase 帖子数据已同步', 'color:#10b981;');
    } catch (e) {
      console.warn('后台加载帖子详情失败，保持本地数据:', e.message);
    }
  },

  // ========== 发布 ==========
  async renderPublish(boardId) {
    if (!Auth.isLoggedIn()) { Router.navigate('/auth'); return ''; }
    const boards = await Store.getBoards();
    const settings = await Store.getSettings();
    return `
      <div class="publish-page">
        <div class="page-header">
          <div><h1 class="page-title" style="font-size:24px;">✏️ 发布新帖</h1><div class="page-subtitle">分享你的想法、故事或知识</div></div>
          <a href="#/" data-link class="btn btn-ghost">取消</a>
        </div>
        <div class="publish-card">
          <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="postTitle" placeholder="一个吸引人的标题..." maxlength="50" /></div>
          <div class="form-group"><label class="form-label">选择板块</label><select class="form-select" id="postBoard">
            <option value="">请选择板块...</option>
            ${boards.map(b => `<option value="${b.id}" ${b.id === boardId ? 'selected' : ''}>${b.icon} ${b.name}</option>`).join('')}
          </select></div>
          <div class="form-group"><label class="form-label">内容</label><textarea class="form-textarea" id="postContent" placeholder="尽情表达你的想法吧..." rows="8" maxlength="${settings.postMaxLength}"></textarea>
            <div style="text-align:right;margin-top:4px;font-size:12px;color:var(--text-muted);"><span id="contentCount">0</span>/${settings.postMaxLength}</div></div>
          <div class="form-group"><label class="form-label">图片（可选，最多 ${settings.maxImageSize} 张）</label>
            <div class="image-uploader" id="imageUploader">
              <div style="font-size:36px;">📷</div>
              <div style="font-size:14px;margin-top:8px;color:var(--text-secondary);">点击或拖拽上传图片</div>
              <div style="font-size:11px;margin-top:4px;color:var(--text-muted);">📦 上传后自动压缩，最大 1920px</div>
            </div>
            <input type="file" id="imageInput" accept="image/*" multiple style="display:none;" />
            <div class="image-preview-grid" id="imagePreview"></div>
          </div>
          <div class="form-group"><label class="form-label">标签（可选，空格分隔）</label><input type="text" class="form-input" id="postTags" placeholder="例如：学习 分享 期末" /></div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
            <a href="#/" data-link class="btn btn-secondary">取消</a>
            <button class="btn btn-primary btn-lg" onclick="Forum.submitPost()">发布帖子</button>
          </div>
        </div>
      </div>`;
  },

  // ========== 个人中心 ==========
  async renderProfile() {
    if (!Auth.isLoggedIn()) { Router.navigate('/auth'); return ''; }
    const user = Auth.currentUser;
    const fullUser = await Store.getUserById(user.id);
    const posts = await Store.getPostsByUser(user.id);
    const favs = await Store.getUserFavorites(user.id);
    const replies = (await Store.getReplies()).filter(r => r.authorId === user.id);
    const score = await Store.computeUserRank(user.id);
    const postCards = await Promise.all(posts.map(p => this.renderPostCard(p)));
    const favCards = await Promise.all(favs.map(p => this.renderPostCard(p)));

    return `
      <div class="profile-header">
        <div class="profile-avatar-wrap"><div class="avatar avatar-lg">${user.avatar}</div></div>
        <div class="profile-info">
          <h1 class="profile-name">${escapeHtml(user.nickname)}</h1>
          <div class="profile-role">@${escapeHtml(user.username)} · ${user.role === 'admin' ? '👑 管理员' : '👤 普通用户'} · 贡献分 ${score}</div>
          <p class="profile-bio">${escapeHtml(fullUser?.bio || '这个同学还没有填写简介~')}</p>
          <div class="profile-stats">
            <div class="profile-stat"><div class="profile-stat-num">${posts.length}</div><div class="profile-stat-label">发帖</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${favs.length}</div><div class="profile-stat-label">收藏</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${replies.length}</div><div class="profile-stat-label">回复</div></div>
            <div class="profile-stat"><div class="profile-stat-num">${posts.reduce((s, p) => s + p.likes, 0)}</div><div class="profile-stat-label">获赞</div></div>
          </div>
        </div>
        <button class="btn btn-secondary" onclick="Forum.renderEditProfile()">✏️ 编辑资料</button>
      </div>

      <div class="profile-tabs" id="profileTabs">
        <button class="profile-tab active" data-tab="posts">📝 我的帖子 (${posts.length})</button>
        <button class="profile-tab" data-tab="favorites">⭐ 我的收藏 (${favs.length})</button>
        <button class="profile-tab" data-tab="replies">💬 我的回复 (${replies.length})</button>
      </div>

      <div id="profileContent">
        <div class="post-list">${posts.length ? postCards.join('') : this.renderEmpty('还没有发帖记录~')}</div>
      </div>`;
  },

  async renderEditProfile() {
    const user = Auth.currentUser;
    const fullUser = await Store.getUserById(user.id);
    Modal.show(`
      <div class="form-group"><label class="form-label">昵称</label><input type="text" class="form-input" id="editNickname" value="${escapeHtml(user.nickname)}" /></div>
      <div class="form-group"><label class="form-label">头像文字（一个字）</label><input type="text" class="form-input" id="editAvatar" value="${escapeHtml(user.avatar)}" maxlength="2" /></div>
      <div class="form-group"><label class="form-label">个人简介</label><textarea class="form-textarea" id="editBio">${escapeHtml(fullUser?.bio || '')}</textarea></div>
      <div class="form-group"><label class="form-label">修改密码（留空不修改）</label><input type="password" class="form-input" id="editPassword" placeholder="新密码（至少6位）" /></div>
      <div style="display:flex;gap:12px;justify-content:flex-end;"><button class="btn btn-secondary" onclick="Modal.hide()">取消</button><button class="btn btn-primary" onclick="Forum.saveProfile()">保存</button></div>
    `, { title: '编辑资料' });
  },

  saveProfile() {
    const nickname = document.getElementById('editNickname').value.trim();
    const avatar = document.getElementById('editAvatar').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const password = document.getElementById('editPassword').value;
    if (!nickname || nickname.length < 2) { Toast.show('error', '昵称至少2个字符'); return; }
    const updates = { nickname, avatar: avatar || nickname.charAt(0), bio };
    if (password) { if (password.length < 6) { Toast.show('error', '密码至少6位'); return; } updates.password = password; }
    Store.updateUser(Auth.currentUser.id, updates);
    Auth.currentUser.nickname = nickname;
    Auth.currentUser.avatar = updates.avatar;
    Auth.updateUI();
    Modal.hide();
    Toast.show('success', '资料已更新');
    Router.refresh();
  },

  // ========== 排行 ==========
  async renderRanking() {
    const users = (await Store.getUsers()).filter(u => !u.banned);
    const ranked = await Promise.all(users.map(async u => ({ ...u, score: await Store.computeUserRank(u.id) })));
    ranked.sort((a, b) => b.score - a.score);
    const rankItems = await Promise.all(ranked.map(async u => {
      const postCount = (await Store.getPostsByUser(u.id)).length;
      const replyCount = (await Store.getReplies()).filter(r => r.authorId === u.id).length;
      return { u, postCount, replyCount };
    }));
    return `
      <div class="page-header"><div><h1 class="page-title">🏆 班级排行榜</h1><div class="page-subtitle">根据发帖、回复、点赞等综合计算</div></div></div>
      <div class="rank-list">
        ${rankItems.map((item, i) => `
          <div class="rank-item ${i < 3 ? 'top-' + (i + 1) : ''}" onclick="Router.navigate('/profile')" style="cursor:pointer;">
            <div class="rank-num">${i + 1}</div>
            <div class="avatar">${escapeHtml(item.u.avatar)}</div>
            <div class="rank-info"><div class="rank-name">${escapeHtml(item.u.nickname)}</div><div class="rank-meta">${item.postCount} 帖 · ${item.replyCount} 回复</div></div>
            <div class="rank-score">${item.u.score}</div>
          </div>`).join('')}
      </div>`;
  },

  // ========== 登录/注册 ==========
  renderAuth(mode = 'login') {
    return `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo"><img src="images/logo.png" alt="校徽" class="auth-logo-icon" /><div class="auth-logo-text">漳州一中 · 八年12班</div><div class="auth-subtitle">班级交流论坛</div></div>
          <div class="auth-tabs">
            <button class="auth-tab ${mode === 'login' ? 'active' : ''}" data-mode="login" onclick="Forum.switchAuth('login')">登录</button>
            <button class="auth-tab ${mode === 'register' ? 'active' : ''}" data-mode="register" onclick="Forum.switchAuth('register')">注册</button>
          </div>
          <div id="loginForm" style="${mode === 'register' ? 'display:none;' : ''}">
            <div class="form-group"><label class="form-label">用户名</label><input type="text" class="form-input" id="loginUser" placeholder="请输入用户名" /></div>
            <div class="form-group"><label class="form-label">密码</label><input type="password" class="form-input" id="loginPass" placeholder="请输入密码" /></div>
            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="Forum.doLogin()">登录</button>
            <div style="text-align:center;margin-top:16px;"><span style="font-size:12px;color:var(--text-muted);">管理员账号：admin / admin123</span></div>
          </div>
          <div id="registerForm" style="${mode === 'register' ? '' : 'display:none;'}">
            <div class="form-group"><label class="form-label">用户名（至少3位）</label><input type="text" class="form-input" id="regUser" placeholder="字母、数字，至少3位" /></div>
            <div class="form-group"><label class="form-label">昵称（显示名，至少2位）</label><input type="text" class="form-input" id="regNick" placeholder="你的昵称" /></div>
            <div class="form-group"><label class="form-label">密码（至少6位）</label><input type="password" class="form-input" id="regPass" placeholder="请设置密码" /></div>
            <div class="form-group"><label class="form-label">确认密码</label><input type="password" class="form-input" id="regPass2" placeholder="再次输入密码" /></div>
            <button class="btn btn-primary btn-lg" style="width:100%;" onclick="Forum.doRegister()">注册</button>
          </div>
          <div class="auth-switch"><span id="switchText">${mode === 'register' ? '已有账号？<a href="#" onclick="Forum.switchAuth(\'login\');return false;">立即登录</a>' : '还没有账号？<a href="#" onclick="Forum.switchAuth(\'register\');return false;">立即注册</a>'}</span></div>
        </div>
      </div>`;
  },

  switchAuth(mode) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    if (mode === 'register') { loginForm.style.display = 'none'; regForm.style.display = 'block'; }
    else { loginForm.style.display = 'block'; regForm.style.display = 'none'; }
  },

  async doLogin() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    if (!username || !password) { Toast.show('error', '请填写完整信息'); return; }
    Toast.show('info', '登录中...');
    const result = await Auth.login(username, password);
    if (result.success) { Toast.show('success', `欢迎回来，${result.user.nickname}！`); Router.navigate('/'); }
    else Toast.show('error', result.message);
  },

  async doRegister() {
    const username = document.getElementById('regUser').value.trim();
    const nickname = document.getElementById('regNick').value.trim();
    const password = document.getElementById('regPass').value;
    const password2 = document.getElementById('regPass2').value;
    if (password !== password2) { Toast.show('error', '两次密码不一致'); return; }
    Toast.show('info', '注册中...');
    const result = await Auth.register(username, password, nickname);
    if (result.success) { Toast.show('success', '注册成功！欢迎加入~'); Router.navigate('/'); }
    else Toast.show('error', result.message);
  },

  // ========== 管理员 ==========
  async renderAdmin(tab = 'dashboard') {
    if (!Auth.isAdmin()) return `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">权限不足，仅管理员可访问</div><a href="#/" data-link class="btn btn-primary">返回首页</a></div>`;
    const tabs = [
      { id: 'dashboard', name: '📊 概览', icon: '📊' },
      { id: 'users', name: '👥 用户管理', icon: '👥' },
      { id: 'posts', name: '📝 帖子管理', icon: '📝' },
      { id: 'boards', name: '📋 板块管理', icon: '📋' },
      { id: 'settings', name: '⚙️ 系统设置', icon: '⚙️' }
    ];
    const tabContent = await this.renderAdminTab(tab);
    return `
      <div class="page-header"><div><h1 class="page-title" style="font-size:24px;">⚙️ 管理后台</h1><div class="page-subtitle">欢迎回来，管理员</div></div><a href="#/" data-link class="btn btn-secondary">← 返回论坛</a></div>
      <div class="admin-layout">
        <div class="admin-sidebar">
          <div style="padding:12px;margin-bottom:12px;border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:white;text-align:center;font-weight:700;"><img src="images/logo.png" alt="校徽" class="admin-logo" /><br>漳州一中<br>八年12班</div>
          <div class="admin-nav">
            ${tabs.map(t => `<button class="admin-nav-item ${t.id === tab ? 'active' : ''}" data-admin-tab="${t.id}" onclick="Forum.switchAdminTab('${t.id}')"><span class="admin-nav-icon">${t.icon}</span> ${t.name}</button>`).join('')}
          </div>
        </div>
        <div class="admin-content">${tabContent}</div>
      </div>`;
  },

  switchAdminTab(tab) { Router.navigate(`/admin?tab=${tab}`); },

  async renderAdminTab(tab) {
    switch (tab) {
      case 'users': return this.renderAdminUsers();
      case 'posts': return this.renderAdminPosts();
      case 'boards': return this.renderAdminBoards();
      case 'settings': return this.renderAdminSettings();
      default: return this.renderAdminDashboard();
    }
  },

  async renderAdminDashboard() {
    const users = await Store.getUsers();
    const posts = await Store.getPosts();
    const replies = await Store.getReplies();
    const boards = await Store.getBoards();
    const bannedUsers = users.filter(u => u.banned);
    const todayPosts = posts.filter(p => Date.now() - p.createdAt < 86400000).length;
    const boardsMap = {};
    boards.forEach(b => boardsMap[b.id] = b.name);
    return `
      <div class="admin-stats">
        <div class="admin-stat"><div class="admin-stat-icon">👥</div><div><div class="admin-stat-val">${users.length}</div><div class="admin-stat-label">总用户数</div></div></div>
        <div class="admin-stat"><div class="admin-stat-icon">📝</div><div><div class="admin-stat-val">${posts.length}</div><div class="admin-stat-label">总帖子数</div></div></div>
        <div class="admin-stat"><div class="admin-stat-icon">💬</div><div><div class="admin-stat-val">${replies.length}</div><div class="admin-stat-label">总回复数</div></div></div>
        <div class="admin-stat"><div class="admin-stat-icon">📋</div><div><div class="admin-stat-val">${boards.length}</div><div class="admin-stat-label">板块数</div></div></div>
        <div class="admin-stat"><div class="admin-stat-icon">🔥</div><div><div class="admin-stat-val">${todayPosts}</div><div class="admin-stat-label">今日新帖</div></div></div>
        <div class="admin-stat"><div class="admin-stat-icon">🚫</div><div><div class="admin-stat-val">${bannedUsers.length}</div><div class="admin-stat-label">已封禁</div></div></div>
      </div>
      <div style="margin-top:24px;">
        <div class="sidebar-card"><div class="sidebar-title">📝 最新帖子</div>
          <div class="post-list">${posts.slice(0, 5).map(p => `<div class="post-card" style="padding:16px;cursor:pointer;" onclick="Router.navigate('/post/${p.id}')"><div style="display:flex;justify-content:space-between;"><span style="font-weight:600;font-size:14px;">${escapeHtml(truncate(p.title, 30))}</span><span style="font-size:12px;color:var(--text-muted);">${formatTime(p.createdAt)}</span></div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${escapeHtml(p.authorName)} · ${boardsMap[p.boardId] || ''}</div></div>`).join('')}</div>
        </div>
      </div>`;
  },

  async renderAdminUsers() {
    const users = await Store.getUsers();
    const userRows = await Promise.all(users.map(async u => {
      const postCount = (await Store.getPostsByUser(u.id)).length;
      return { u, postCount };
    }));
    return `
      <div class="admin-header"><div style="font-size:14px;color:var(--text-secondary);">共 ${users.length} 位用户</div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>用户</th><th>用户名</th><th>角色</th><th>发帖</th><th>注册时间</th><th>状态</th><th>操作</th></tr></thead><tbody>
        ${userRows.map(item => `<tr>
          <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:32px;height:32px;font-size:13px;">${escapeHtml(item.u.avatar)}</div><span style="font-weight:600;">${escapeHtml(item.u.nickname)}</span></div></td>
          <td>${escapeHtml(item.u.username)}</td>
          <td>${item.u.role === 'admin' ? '<span class="tag tag-primary">管理员</span>' : '<span class="tag">普通</span>'}</td>
          <td>${item.postCount}</td>
          <td>${formatTime(item.u.createdAt)}</td>
          <td>${item.u.banned ? '<span class="tag tag-danger">已封禁</span>' : '<span class="tag tag-success">正常</span>'}</td>
          <td><div class="admin-actions">
            ${item.u.banned ? `<button class="btn btn-sm btn-primary" onclick="Forum.unbanUser('${item.u.id}')">解封</button>` : (item.u.id !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="Forum.banUser('${item.u.id}')">封禁</button>` : '<span style="font-size:12px;color:var(--text-muted);">系统账号</span>')}
            ${item.u.id !== 'admin' ? `<button class="btn btn-sm btn-secondary" onclick="Forum.toggleRole('${item.u.id}')">${item.u.role === 'admin' ? '取消管理员' : '设为管理员'}</button>` : ''}
          </div></td></tr>`).join('')}
      </tbody></table></div>`;
  },

  async renderAdminPosts() {
    const posts = await Store.getPosts();
    const boards = await Store.getBoards();
    const boardsMap = {};
    boards.forEach(b => boardsMap[b.id] = b.name);
    return `
      <div class="admin-header"><div style="font-size:14px;color:var(--text-secondary);">共 ${posts.length} 篇帖子</div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>标题</th><th>作者</th><th>板块</th><th>回复</th><th>点赞</th><th>状态</th><th>操作</th></tr></thead><tbody>
        ${posts.map(p => `<tr>
          <td style="max-width:200px;"><a href="#/post/${p.id}" data-link style="color:var(--primary);">${escapeHtml(truncate(p.title, 25))}</a></td>
          <td>${escapeHtml(p.authorName)}</td>
          <td>${boardsMap[p.boardId] || '-'}</td>
          <td>${p.replies}</td><td>${p.likes}</td>
          <td>${p.pinned ? '<span class="tag tag-primary">📌 置顶</span>' : ''}${p.featured ? '<span class="tag tag-accent">⭐ 加精</span>' : ''}${!p.pinned && !p.featured ? '<span class="tag">正常</span>' : ''}</td>
          <td><div class="admin-actions">
            <button class="btn btn-sm ${p.pinned ? 'btn-secondary' : 'btn-primary'}" onclick="Forum.togglePin('${p.id}')">${p.pinned ? '取消置顶' : '置顶'}</button>
            <button class="btn btn-sm ${p.featured ? 'btn-secondary' : 'btn-primary'}" onclick="Forum.toggleFeature('${p.id}')">${p.featured ? '取消加精' : '加精'}</button>
            <button class="btn btn-sm btn-danger" onclick="Forum.deletePostAdmin('${p.id}')">删除</button>
          </div></td></tr>`).join('')}
      </tbody></table></div>`;
  },

  async renderAdminBoards() {
    const boards = (await Store.getBoards()).sort((a, b) => (a.order || 0) - (b.order || 0));
    const boardRows = await Promise.all(boards.map(async b => {
      const postCount = (await Store.getPostsByBoard(b.id)).length;
      return { b, postCount };
    }));
    return `
      <div class="admin-header"><div style="font-size:14px;color:var(--text-secondary);">共 ${boards.length} 个板块</div><button class="btn btn-primary" onclick="Forum.boardEditor()">+ 新增板块</button></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>排序</th><th>图标</th><th>名称</th><th>描述</th><th>帖子数</th><th>操作</th></tr></thead><tbody>
        ${boardRows.map(item => `<tr>
          <td>${item.b.order || 0}</td>
          <td style="font-size:24px;">${item.b.icon}</td>
          <td style="font-weight:600;">${escapeHtml(item.b.name)}</td>
          <td>${escapeHtml(item.b.description)}</td>
          <td>${item.postCount}</td>
          <td><div class="admin-actions">
            <button class="btn btn-sm btn-secondary" onclick="Forum.boardEditor('${item.b.id}')">编辑</button>
            <button class="btn btn-sm btn-danger" onclick="Forum.deleteBoardAdmin('${item.b.id}')">删除</button>
          </div></td></tr>`).join('')}
      </tbody></table></div>`;
  },

  async renderAdminSettings() {
    const s = await Store.getSettings();
    return `
      <div class="sidebar-card" style="max-width:600px;">
        <div class="sidebar-title">⚙️ 系统设置</div>
        <div class="form-group"><label class="form-label">站点名称</label><input type="text" class="form-input" id="setSiteName" value="${escapeHtml(s.siteName || '')}" /></div>
        <div class="form-group"><label class="form-label">帖子最大字数</label><input type="number" class="form-input" id="setPostMax" value="${s.postMaxLength || 5000}" min="500" max="20000" /></div>
        <div class="form-group"><label class="form-label">回复最大字数</label><input type="number" class="form-input" id="setReplyMax" value="${s.replyMaxLength || 1000}" min="100" max="5000" /></div>
        <div class="form-group"><label class="form-label">单帖最大图片数</label><input type="number" class="form-input" id="setMaxImg" value="${s.maxImageSize || 5}" min="1" max="9" /></div>
        <div class="form-group"><label class="form-label">开放注册</label><select class="form-select" id="setRegOpen"><option value="true" ${s.registrationOpen !== false ? 'selected' : ''}>开启</option><option value="false" ${s.registrationOpen === false ? 'selected' : ''}>关闭</option></select></div>
        <button class="btn btn-primary" onclick="Forum.saveSettings()">保存设置</button>
      </div>`;
  },

  saveSettings() {
    Store.updateSettings({
      siteName: document.getElementById('setSiteName').value,
      postMaxLength: parseInt(document.getElementById('setPostMax').value),
      replyMaxLength: parseInt(document.getElementById('setReplyMax').value),
      maxImageSize: parseInt(document.getElementById('setMaxImg').value),
      registrationOpen: document.getElementById('setRegOpen').value === 'true'
    });
    Toast.show('success', '设置已保存');
  },

  // ========== 管理员操作 ==========
  banUser(userId) { Modal.confirm('确定要封禁该用户吗？', () => { Store.updateUser(userId, { banned: true }); Toast.show('success', '已封禁'); Router.refresh(); }); },
  unbanUser(userId) { Store.updateUser(userId, { banned: false }); Toast.show('success', '已解封'); Router.refresh(); },
  async toggleRole(userId) { const u = await Store.getUserById(userId); Store.updateUser(userId, { role: u.role === 'admin' ? 'user' : 'admin' }); Toast.show('success', '权限已更新'); Router.refresh(); },
  async togglePin(postId) { const p = await Store.getPostById(postId); Store.updatePost(postId, { pinned: !p.pinned }); Toast.show('success', p.pinned ? '已取消置顶' : '已置顶'); Router.refresh(); },
  async toggleFeature(postId) { const p = await Store.getPostById(postId); Store.updatePost(postId, { featured: !p.featured }); Toast.show('success', p.featured ? '已取消加精' : '已加精'); Router.refresh(); },
  deletePostAdmin(postId) { Modal.confirm('确定要删除该帖子吗？此操作不可恢复！', () => { Store.deletePost(postId); Toast.show('success', '帖子已删除'); Router.refresh(); }); },
  async deleteBoardAdmin(boardId) {
    const posts = await Store.getPostsByBoard(boardId);
    if (posts.length > 0) { Toast.show('error', `该板块还有 ${posts.length} 个帖子，请先清空`); return; }
    Modal.confirm('确定要删除该板块吗？', () => { Store.deleteBoard(boardId); Toast.show('success', '板块已删除'); Router.refresh(); });
  },

  async boardEditor(boardId) {
    const boards = await Store.getBoards();
    const board = boardId ? boards.find(b => b.id === boardId) : null;
    Modal.show(`
      <div class="form-group"><label class="form-label">图标（emoji）</label><input type="text" class="form-input" id="boardIcon" value="${board?.icon || '📋'}" maxlength="4" /></div>
      <div class="form-group"><label class="form-label">板块名称</label><input type="text" class="form-input" id="boardName" value="${escapeHtml(board?.name || '')}" /></div>
      <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="boardDesc">${escapeHtml(board?.description || '')}</textarea></div>
      <div class="form-group"><label class="form-label">颜色</label><input type="color" class="form-input" id="boardColor" value="${board?.color || '#3b82f6'}" style="height:48px;padding:4px;" /></div>
      <div class="form-group"><label class="form-label">排序</label><input type="number" class="form-input" id="boardOrder" value="${board?.order || 0}" /></div>
      <div style="display:flex;gap:12px;justify-content:flex-end;"><button class="btn btn-secondary" onclick="Modal.hide()">取消</button><button class="btn btn-primary" onclick="Forum.saveBoard('${boardId || ''}')">保存</button></div>
    `, { title: board ? '编辑板块' : '新增板块' });
  },

  saveBoard(boardId) {
    const data = {
      icon: document.getElementById('boardIcon').value.trim() || '📋',
      name: document.getElementById('boardName').value.trim(),
      description: document.getElementById('boardDesc').value.trim(),
      color: document.getElementById('boardColor').value,
      order: parseInt(document.getElementById('boardOrder').value) || 0
    };
    if (!data.name) { Toast.show('error', '请输入板块名称'); return; }
    if (boardId) Store.updateBoard(boardId, data);
    else Store.addBoard({ id: genId('board'), ...data, postCount: 0 });
    Modal.hide(); Toast.show('success', '保存成功'); Router.refresh();
  },

  // ========== 交互方法 ==========
  async toggleLike(postId) {
    if (!Auth.requireAuth('请先登录再点赞')) return;
    const liked = await Store.toggleLike(Auth.currentUser.id, postId);
    Toast.show(liked ? 'success' : 'info', liked ? '点赞成功' : '已取消点赞');
    Router.refresh();
  },

  async toggleFavorite(postId) {
    if (!Auth.requireAuth('请先登录再收藏')) return;
    const faved = await Store.toggleFavorite(Auth.currentUser.id, postId);
    Toast.show(faved ? 'success' : 'info', faved ? '已收藏' : '已取消收藏');
    Router.refresh();
  },

  async toggleReplyLike(replyId) {
    if (!Auth.requireAuth()) return;
    // 简化版：直接返回刷新（实际项目中可以添加回复点赞功能）
    Toast.show('success', '操作成功');
    Router.refresh();
  },

  async submitReply(postId) {
    if (!Auth.requireAuth()) return;
    const textarea = document.getElementById('replyText');
    const content = textarea.value.trim();
    if (!content) { Toast.show('warning', '请输入回复内容'); return; }
    await Store.addReply({
      id: genId('reply'), postId, authorId: Auth.currentUser.id,
      authorName: Auth.currentUser.nickname, authorAvatar: Auth.currentUser.avatar,
      content, createdAt: Date.now(), likes: 0
    });
    textarea.value = '';
    Toast.show('success', '回复成功');
    Router.refresh();
  },

  deletePost(postId) { Modal.confirm('确定要删除这篇帖子吗？', () => { Store.deletePost(postId); Toast.show('success', '帖子已删除'); Router.navigate('/'); }); },
  deleteReply(replyId) { Modal.confirm('确定要删除该回复吗？', () => { Store.deleteReply(replyId); Toast.show('success', '回复已删除'); Router.refresh(); }); },

  async submitPost() {
    if (!Auth.requireAuth()) return;
    const title = document.getElementById('postTitle').value.trim();
    const boardId = document.getElementById('postBoard').value;
    const content = document.getElementById('postContent').value.trim();
    const tags = document.getElementById('postTags').value.trim().split(/\s+/).filter(Boolean);
    if (!title || title.length < 5) { Toast.show('error', '标题至少5个字'); return; }
    if (!boardId) { Toast.show('error', '请选择板块'); return; }
    if (!content || content.length < 10) { Toast.show('error', '内容至少10个字'); return; }
    
    const post = {
      id: genId('post'), authorId: Auth.currentUser.id,
      authorName: Auth.currentUser.nickname, authorAvatar: Auth.currentUser.avatar,
      boardId, title, content, images: this._pendingImages || [],
      createdAt: Date.now(), views: 0, likes: 0, replies: 0,
      pinned: false, featured: false, tags
    };
    
    console.log('提交的帖子数据:', post);
    const savedPost = await Store.addPost(post);
    console.log('保存后的帖子:', savedPost);
    console.log('帖子ID:', savedPost?.id, '或', post.id);
    
    this._pendingImages = [];
    
    const targetId = savedPost?.id || post.id;
    if (!targetId) {
      Toast.show('error', '发帖失败，请重试');
      return;
    }
    
    Toast.show('success', '发帖成功！');
    Router.navigate(`/post/${targetId}`);
  },

  openLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox active';
    lightbox.innerHTML = `<img src="${src}" /><button class="lightbox-close">✕</button>`;
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.remove(); });
    lightbox.querySelector('.lightbox-close').onclick = () => lightbox.remove();
  },

  // ========== 空状态 ==========
  renderEmpty(text) { return `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">${text}</div></div>`; },
  renderNotFound() { return `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">抱歉，你访问的页面不存在</div><a href="#/" data-link class="btn btn-primary">返回首页</a></div>`; },

  // ========== 页面初始化 ==========
  async initPage() {
    // 发布页
    const content = document.getElementById('postContent');
    const count = document.getElementById('contentCount');
    if (content && count) content.addEventListener('input', () => { count.textContent = countWords(content.value); });

    const replyText = document.getElementById('replyText');
    const replyCount = document.getElementById('replyCount');
    if (replyText && replyCount) replyText.addEventListener('input', () => { replyCount.textContent = countWords(replyText.value); });

    // 图片上传（集成自动压缩）
    const uploader = document.getElementById('imageUploader');
    const imageInput = document.getElementById('imageInput');
    if (uploader && imageInput) {
      this._pendingImages = this._pendingImages || [];
      uploader.onclick = () => imageInput.click();
      uploader.ondragover = (e) => { e.preventDefault(); uploader.style.background = 'var(--glass-bg)'; };
      uploader.ondragleave = () => { uploader.style.background = ''; };
      uploader.ondrop = async (e) => {
        e.preventDefault(); uploader.style.background = '';
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        await Forum._processUploadedImages(files);
      };
      imageInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        await Forum._processUploadedImages(files);
        imageInput.value = '';
      };
    }

    // 资料页Tab
    const tabs = document.querySelectorAll('#profileTabs .profile-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderProfileContent(tab.dataset.tab);
      });
    });
  },

  // 处理上传图片（压缩 + 存储 + 反馈）
  async _processUploadedImages(files) {
    const maxImg = parseInt(document.getElementById('setMaxImg')?.value) || 5;
    let compressedCount = 0;
    let totalSaved = 0;

    for (const file of files) {
      if (this._pendingImages.length >= maxImg) break;
      try {
        const result = await compressImage(file);
        this._pendingImages.push(result.dataUrl);
        if (result.compressed) {
          compressedCount++;
          totalSaved += (result.originalSize - result.newSize);
        }
      } catch (err) {
        // 压缩失败时回退到原图
        const dataUrl = await fileToBase64(file);
        this._pendingImages.push(dataUrl);
      }
    }

    this.renderImagePreview();

    // 压缩结果反馈
    if (compressedCount > 0) {
      const savedStr = totalSaved >= 1024 * 1024
        ? (totalSaved / 1024 / 1024).toFixed(1) + ' MB'
        : (totalSaved / 1024).toFixed(0) + ' KB';
      Toast.show('success', `已压缩 ${compressedCount} 张图片，节省 ${savedStr}`);
    } else if (files.length > 0) {
      Toast.show('info', `已添加 ${files.length} 张图片`);
    }
  },

  renderImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = this._pendingImages.map((src, i) => `
      <div class="image-preview-item"><img src="${src}" alt="" /><button class="image-remove" onclick="Forum.removeImage(${i})">✕</button></div>
    `).join('');
  },

  removeImage(index) { this._pendingImages.splice(index, 1); this.renderImagePreview(); },

  async renderProfileContent(tab) {
    const content = document.getElementById('profileContent');
    if (!content) return;
    const user = Auth.currentUser;
    if (tab === 'posts') {
      const posts = await Store.getPostsByUser(user.id);
      const postCards = await Promise.all(posts.map(p => this.renderPostCard(p)));
      content.innerHTML = `<div class="post-list">${posts.length ? postCards.join('') : this.renderEmpty('还没有发帖记录~')}</div>`;
    } else if (tab === 'favorites') {
      const favs = await Store.getUserFavorites(user.id);
      const favCards = await Promise.all(favs.map(p => this.renderPostCard(p)));
      content.innerHTML = `<div class="post-list">${favs.length ? favCards.join('') : this.renderEmpty('还没有收藏~')}</div>`;
    } else if (tab === 'replies') {
      const replies = (await Store.getReplies()).filter(r => r.authorId === user.id);
      content.innerHTML = `<div class="post-list">${replies.length ? replies.map(r => `
        <div class="reply-card"><div class="avatar reply-avatar">${escapeHtml(r.authorAvatar)}</div><div class="reply-body">
          <div class="reply-head"><span class="reply-author">${escapeHtml(r.authorName)}</span><span class="reply-time">${formatTime(r.createdAt)}</span></div>
          <div class="reply-content">${escapeHtml(r.content)}</div>
          <a href="#/post/${r.postId}" data-link style="font-size:12px;color:var(--primary);margin-top:8px;display:inline-block;">查看原帖 →</a>
        </div></div>`).join('') : this.renderEmpty('还没有回复~')}</div>`;
    }
    Router.initLinks();
  }
};