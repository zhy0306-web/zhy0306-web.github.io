// ===== 数据存储层 - 双模式（localStorage / Supabase）=====
const Store = {
  KEYS: {
    CURRENT_USER: 'zj12_current_user',
    THEME: 'zj12_theme',
    LOCAL_CACHE: 'zj12_local_cache'
  },

  // 本地缓存（未连接 Supabase 时使用）
  localCache: {
    users: [],
    posts: [],
    replies: [],
    boards: [],
    likes: {},
    favorites: {},
    history: [],
    settings: {}
  },

  async init() {
    // 初始化本地缓存
    this.loadLocalCache();

    // 尝试连接 Supabase
    if (window.DB && window.DB.isSupabase()) {
      await this.initSupabaseMode();
    } else {
      this.initLocalMode();
    }

    console.log(`📦 存储模式: ${this.isSupabase() ? 'Supabase（云数据库）' : 'localStorage（本地）'}`);
  },

  loadLocalCache() {
    const cache = JSON.parse(localStorage.getItem(this.KEYS.LOCAL_CACHE) || 'null');
    if (cache) {
      this.localCache = { ...this.localCache, ...cache };
    } else {
      // 初始化默认数据
      this.localCache.boards = [
        { id: 'board_notice', name: '班级通知', icon: '📢', description: '重要通知、活动安排、放假消息等', color: '#ef4444', order: 1 },
        { id: 'board_academic', name: '学术交流', icon: '📚', description: '学习心得、难题讨论、知识分享', color: '#3b82f6', order: 2 },
        { id: 'board_life', name: '班级日常', icon: '🎈', description: '校园生活、班级趣事、同学动态', color: '#10b981', order: 3 },
        { id: 'board_interest', name: '兴趣社群', icon: '🎨', description: '美术、音乐、运动、编程等兴趣交流', color: '#f59e0b', order: 4 },
        { id: 'board_activity', name: '活动组织', icon: '🏆', description: '班委活动、社团招新、比赛报名', color: '#8b5cf6', order: 5 },
        { id: 'board_feedback', name: '建议反馈', icon: '💡', description: '对班级、对学校的建议与想法', color: '#ec4899', order: 6 }
      ];
      this.localCache.settings = {
        siteName: '漳州一中 · 八年12班交流论坛',
        registrationOpen: true,
        maxImageSize: 5,
        postMaxLength: 5000,
        replyMaxLength: 1000
      };
      this.saveLocalCache();
    }
  },

  saveLocalCache() {
    localStorage.setItem(this.KEYS.LOCAL_CACHE, JSON.stringify(this.localCache));
  },

  isSupabase() {
    return window.DB && window.DB.isSupabase();
  },

  // 同步获取本地缓存数据（用于首屏即时渲染，不等 Supabase）
  // 返回值与异步版本兼容，但不发起任何网络请求
  getPostsSync() {
    return [...this.localCache.posts].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  },

  getBoardsSync() {
    return this.localCache.boards.map(b => ({ ...b }));
  },

  getUsersSync() {
    return this.localCache.users.map(u => this.serializeUser(u));
  },

  getRepliesSync() {
    return [...this.localCache.replies];
  },

  getPostByIdSync(id) {
    return this.localCache.posts.find(p => p.id === id) || null;
  },

  getRepliesByPostSync(postId) {
    return this.localCache.replies
      .filter(r => r.postId === postId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  // 超时保护的 Supabase 查询包装
  // 使用: this.safeQuery(() => db.client.from('...').select('...'), [默认值], 3000)
  async safeQuery(fn, fallback = null, timeoutMs = 3000) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('查询超时')), timeoutMs)
    );
    try {
      const result = await Promise.race([fn(), timeout]);
      return result;
    } catch (e) {
      console.warn(`Supabase 查询超时/失败 (${timeoutMs}ms)，降级:`, e.message);
      return fallback;
    }
  },

  initLocalMode() {
    // 本地模式：初始化 admin 账号
    if (!this.localCache.users.find(u => u.username === 'admin')) {
      this.localCache.users.push({
        id: 'admin', username: 'admin', password: 'admin123',
        nickname: '系统管理员', avatar: '管', role: 'admin',
        bio: '漳州一中八年12班论坛管理员', createdAt: Date.now(), banned: false
      });
      this.saveLocalCache();
    }
  },

  async initSupabaseMode() {
    // Supabase 模式：确保有 admin 账号
    const { data } = await window.DB.client
      .from('profiles')
      .select('*')
      .eq('username', 'admin')
      .maybeSingle();

    if (!data) {
      // 创建 admin（通过 auth + profiles）
      // 这需要管理员手动在 Supabase Dashboard 创建，或通过 SQL
      console.warn('请在 Supabase SQL Editor 执行初始化脚本创建 admin 账号');
    }
  },

  // ========== 认证相关（在 auth.js 中处理）==========

  async login(username, password) {
    if (this.isSupabase()) {
      return window.DB.login(username, password);
    }
    // 本地模式
    const user = this.localCache.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { error: '用户不存在' };
    if (user.banned) return { error: '账号已被封禁' };
    if (user.password !== password) return { error: '密码错误' };
    return { data: { user: this.serializeUser(user) } };
  },

  async register(username, password, nickname) {
    if (this.isSupabase()) {
      return window.DB.register(username, password, nickname);
    }
    // 本地模式
    if (!username || username.length < 3) return { error: '用户名至少3位' };
    if (!password || password.length < 6) return { error: '密码至少6位' };
    if (!nickname || nickname.length < 2) return { error: '昵称至少2位' };
    if (this.localCache.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { error: '用户名已被占用' };
    }
    const newUser = {
      id: 'u_' + Date.now(),
      username, password, nickname,
      avatar: nickname.charAt(0).toUpperCase(),
      role: 'user', bio: '漳州一中八年12班同学',
      createdAt: Date.now(), banned: false
    };
    this.localCache.users.push(newUser);
    this.saveLocalCache();
    return { data: { user: this.serializeUser(newUser) } };
  },

  serializeUser(u) {
    return {
      id: u.id, username: u.username, nickname: u.nickname,
      avatar: u.avatar, role: u.role, bio: u.banned ? u.bio : (u.bio || ''),
      banned: u.banned || false
    };
  },

  // ========== 用户 ==========
  async getUsers() {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client.from('profiles').select('*');
      return error ? [] : (data || []).map(this.mapSupabaseUser);
    }
    return this.localCache.users.map(u => this.serializeUser(u));
  },

  async getUserById(id) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('profiles').select('*').eq('id', id).single();
      return data ? this.mapSupabaseUser(data) : null;
    }
    const u = this.localCache.users.find(u => u.id === id);
    return u ? this.serializeUser(u) : null;
  },

  async updateUser(id, updates) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('profiles').update(updates).eq('id', id).select().single();
      return data ? this.mapSupabaseUser(data) : null;
    }
    const idx = this.localCache.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.localCache.users[idx] = { ...this.localCache.users[idx], ...updates };
      this.saveLocalCache();
      return this.serializeUser(this.localCache.users[idx]);
    }
    return null;
  },

  mapSupabaseUser(u) {
    return {
      id: u.id, username: u.username, nickname: u.nickname,
      avatar: u.avatar || 'U', role: u.role || 'user',
      bio: u.bio || '', banned: u.banned || false,
      createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now()
    };
  },

  // ========== 板块 ==========
  async getBoards() {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client.from('boards').select('*').order('sort_order');
      if (error || !data || data.length === 0) {
        // Fallback: 如果数据库没有数据，使用本地默认板块
        console.warn('Supabase boards 为空，使用默认板块');
        return [
          { id: 'board_notice', name: '班级通知', icon: '📢', description: '重要通知、活动安排、放假消息等', color: '#ef4444', order: 1, postCount: 0 },
          { id: 'board_academic', name: '学术交流', icon: '📚', description: '学习心得、难题讨论、知识分享', color: '#3b82f6', order: 2, postCount: 0 },
          { id: 'board_life', name: '班级日常', icon: '🎈', description: '校园生活、班级趣事、同学动态', color: '#10b981', order: 3, postCount: 0 },
          { id: 'board_interest', name: '兴趣社群', icon: '🎨', description: '美术、音乐、运动、编程等兴趣交流', color: '#f59e0b', order: 4, postCount: 0 },
          { id: 'board_activity', name: '活动组织', icon: '🏆', description: '班委活动、社团招新、比赛报名', color: '#8b5cf6', order: 5, postCount: 0 },
          { id: 'board_feedback', name: '建议反馈', icon: '💡', description: '对班级、对学校的建议与想法', color: '#ec4899', order: 6, postCount: 0 }
        ];
      }
      return data.map(b => this.mapBoard(b));
    }
    return this.localCache.boards.map(b => ({ ...b }));
  },

  async getBoard(id) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('boards').select('*').eq('id', id).single();
      return data ? this.mapBoard(data) : null;
    }
    return this.localCache.boards.find(b => b.id === id);
  },

  mapBoard(b) {
    return { id: b.id, name: b.name, icon: b.icon || '📋', description: b.description || '', color: b.color || '#3b82f6', order: b.sort_order || 0, postCount: 0 };
  },

  async addBoard(board) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('boards').insert({
        id: board.id, name: board.name, icon: board.icon,
        description: board.description, color: board.color, sort_order: board.order
      }).select().single();
      return data;
    }
    this.localCache.boards.push(board);
    this.saveLocalCache();
    return board;
  },

  async updateBoard(id, updates) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('boards').update(updates).eq('id', id).select().single();
      return data ? this.mapBoard(data) : null;
    }
    const idx = this.localCache.boards.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.localCache.boards[idx] = { ...this.localCache.boards[idx], ...updates };
      this.saveLocalCache();
      return this.localCache.boards[idx];
    }
    return null;
  },

  async deleteBoard(id) {
    if (this.isSupabase()) {
      await window.DB.client.from('boards').delete().eq('id', id);
    } else {
      this.localCache.boards = this.localCache.boards.filter(b => b.id !== id);
      this.saveLocalCache();
    }
  },

  // ========== 帖子 ==========
  async getPosts() {
    if (this.isSupabase()) {
      const { data, error } = await this.safeQuery(
        () => window.DB.client
          .from('posts')
          .select('*')
          .order('pinned', { ascending: false })
          .order('featured', { ascending: false })
          .order('created_at', { ascending: false }),
        { data: null, error: { message: '查询超时' } },
        3000
      ) || { data: null, error: { message: '查询超时' } };
      return error ? [] : (data || []).map(p => this.mapPost(p));
    }
    return [...this.localCache.posts].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  },

  async getPostById(id) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('posts').select('*').eq('id', id).single();
      return data ? this.mapPost(data) : null;
    }
    return this.localCache.posts.find(p => p.id === id);
  },

  async getPostsByBoard(boardId) {
    if (this.isSupabase()) {
      const { data, error } = await this.safeQuery(
        () => window.DB.client
          .from('posts').select('*').eq('board_id', boardId)
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        { data: null, error: { message: '查询超时' } },
        3000
      ) || { data: null, error: { message: '查询超时' } };
      return error ? [] : (data || []).map(p => this.mapPost(p));
    }
    return this.localCache.posts.filter(p => p.boardId === boardId);
  },

  async getPostsByUser(userId) {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client
        .from('posts').select('*').eq('author_id', userId)
        .order('created_at', { ascending: false });
      return error ? [] : (data || []).map(p => this.mapPost(p));
    }
    return this.localCache.posts.filter(p => p.authorId === userId);
  },

  mapPost(p) {
    return {
      id: p.id, authorId: p.author_id, authorName: p.author_name,
      authorAvatar: p.author_avatar || 'U', boardId: p.board_id,
      title: p.title, content: p.content,
      images: p.images || [], tags: p.tags || [],
      views: p.views || 0, likes: p.likes || 0, replies: p.replies || 0,
      pinned: p.pinned || false, featured: p.featured || false,
      createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now()
    };
  },

  async addPost(post) {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client.from('posts').insert({
        author_id: post.authorId, author_name: post.authorName,
        author_avatar: post.authorAvatar, board_id: post.boardId,
        title: post.title, content: post.content,
        images: post.images, tags: post.tags,
        views: 0, likes: 0, replies: 0,
        pinned: false, featured: false
      }).select().single();
      if (error) {
        console.error('addPost error:', error);
        return post;
      }
      return data ? this.mapPost(data) : post;
    }
    post.id = post.id || 'p_' + Date.now();
    post.views = post.views || 0;
    post.likes = post.likes || 0;
    post.replies = post.replies || 0;
    post.createdAt = Date.now();
    this.localCache.posts.unshift(post);
    this.saveLocalCache();
    return post;
  },

  async updatePost(id, updates) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('posts').update(updates).eq('id', id).select().single();
      return data ? this.mapPost(data) : null;
    }
    const idx = this.localCache.posts.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.localCache.posts[idx] = { ...this.localCache.posts[idx], ...updates };
      this.saveLocalCache();
      return this.localCache.posts[idx];
    }
    return null;
  },

  async deletePost(id) {
    if (this.isSupabase()) {
      await window.DB.client.from('posts').delete().eq('id', id);
    } else {
      this.localCache.posts = this.localCache.posts.filter(p => p.id !== id);
      this.localCache.replies = this.localCache.replies.filter(r => r.postId !== id);
      this.saveLocalCache();
    }
  },

  // ========== 回复 ==========
  async getRepliesByPost(postId) {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client
        .from('replies').select('*').eq('post_id', postId)
        .order('created_at');
      return error ? [] : (data || []).map(r => this.mapReply(r));
    }
    return this.localCache.replies.filter(r => r.postId === postId);
  },

  async getReplies() {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client.from('replies').select('*');
      return error ? [] : (data || []).map(r => this.mapReply(r));
    }
    return this.localCache.replies;
  },

  mapReply(r) {
    return {
      id: r.id, postId: r.post_id, authorId: r.author_id,
      authorName: r.author_name, authorAvatar: r.author_avatar || 'U',
      content: r.content, likes: r.likes || 0,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now()
    };
  },

  async addReply(reply) {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client.from('replies').insert({
        post_id: reply.postId, author_id: reply.authorId,
        author_name: reply.authorName, author_avatar: reply.authorAvatar,
        content: reply.content, likes: 0
      }).select().single();
      if (error) console.error('addReply error:', error);
      // 更新帖子回复数
      const post = await this.getPostById(reply.postId);
      if (post) {
        await this.updatePost(reply.postId, { replies: post.replies + 1 });
      }
      return data ? this.mapReply(data) : reply;
    }
    reply.id = reply.id || 'r_' + Date.now();
    reply.likes = 0;
    reply.createdAt = Date.now();
    this.localCache.replies.push(reply);
    const post = this.localCache.posts.find(p => p.id === reply.postId);
    if (post) post.replies = (post.replies || 0) + 1;
    this.saveLocalCache();
    return reply;
  },

  async deleteReply(id) {
    if (this.isSupabase()) {
      const reply = (await this.getReplies()).find(r => r.id === id);
      const postId = reply?.postId;
      await window.DB.client.from('replies').delete().eq('id', id);
      if (postId) {
        const post = await this.getPostById(postId);
        if (post && post.replies > 0) {
          await this.updatePost(postId, { replies: post.replies - 1 });
        }
      }
    } else {
      const reply = this.localCache.replies.find(r => r.id === id);
      if (reply) {
        const post = this.localCache.posts.find(p => p.id === reply.postId);
        if (post && post.replies > 0) post.replies--;
      }
      this.localCache.replies = this.localCache.replies.filter(r => r.id !== id);
      this.saveLocalCache();
    }
  },

  // ========== 点赞 ==========
  async hasLike(userId, postId) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client
        .from('likes').select('*').eq('user_id', userId).eq('post_id', postId).maybeSingle();
      return !!data;
    }
    return this.localCache.likes[postId]?.includes(userId);
  },

  async toggleLike(userId, postId) {
    if (this.isSupabase()) {
      const hasLiked = await this.hasLike(userId, postId);
      if (hasLiked) {
        await window.DB.client.from('likes').delete().eq('user_id', userId).eq('post_id', postId);
        const post = await this.getPostById(postId);
        if (post) await this.updatePost(postId, { likes: Math.max(0, post.likes - 1) });
        return false;
      } else {
        await window.DB.client.from('likes').insert({ user_id: userId, post_id: postId });
        const post = await this.getPostById(postId);
        if (post) await this.updatePost(postId, { likes: post.likes + 1 });
        return true;
      }
    }
    // 本地模式
    const likes = this.localCache.likes;
    if (!likes[postId]) likes[postId] = [];
    const idx = likes[postId].indexOf(userId);
    const liked = idx === -1;
    if (liked) {
      likes[postId].push(userId);
      const post = this.localCache.posts.find(p => p.id === postId);
      if (post) post.likes = (post.likes || 0) + 1;
    } else {
      likes[postId].splice(idx, 1);
      const post = this.localCache.posts.find(p => p.id === postId);
      if (post && post.likes > 0) post.likes--;
    }
    this.saveLocalCache();
    return liked;
  },

  // ========== 收藏 ==========
  isFavoriteSync(userId, postId) {
    return !!(this.localCache.favorites[userId]?.includes(postId));
  },

  async isFavorite(userId, postId) {
    if (this.isSupabase()) {
      const { data } = await window.DB.client
        .from('favorites').select('*').eq('user_id', userId).eq('post_id', postId).maybeSingle();
      return !!data;
    }
    return this.localCache.favorites[userId]?.includes(postId);
  },

  async toggleFavorite(userId, postId) {
    if (this.isSupabase()) {
      const isFav = await this.isFavorite(userId, postId);
      if (isFav) {
        await window.DB.client.from('favorites').delete().eq('user_id', userId).eq('post_id', postId);
        return false;
      } else {
        await window.DB.client.from('favorites').insert({ user_id: userId, post_id: postId });
        return true;
      }
    }
    const favs = this.localCache.favorites;
    if (!favs[userId]) favs[userId] = [];
    const idx = favs[userId].indexOf(postId);
    const faved = idx === -1;
    if (faved) favs[userId].push(postId);
    else favs[userId].splice(idx, 1);
    this.saveLocalCache();
    return faved;
  },

  async getUserFavorites(userId) {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client
        .from('favorites').select('post_id').eq('user_id', userId);
      if (error) return [];
      const postIds = (data || []).map(f => f.post_id);
      const posts = [];
      for (const id of postIds) {
        const p = await this.getPostById(id);
        if (p) posts.push(p);
      }
      return posts;
    }
    const postIds = this.localCache.favorites[userId] || [];
    return postIds.map(id => this.localCache.posts.find(p => p.id === id)).filter(Boolean);
  },

  // ========== 历史 ==========
  async addHistory(userId, postId) {
    if (this.isSupabase()) {
      // Upsert history
      await window.DB.client.from('history').upsert({
        user_id: userId, post_id: postId, viewed_at: new Date().toISOString()
      });
    } else {
      let history = JSON.parse(localStorage.getItem(this.KEYS.LOCAL_CACHE) || 'null')?.history || [];
      history = history.filter(h => h.postId !== postId);
      history.unshift({ postId, viewedAt: Date.now() });
      this.localCache.history = history.slice(0, 50);
      this.saveLocalCache();
    }
  },

  async getHistory(userId) {
    if (this.isSupabase()) {
      const { data, error } = await window.DB.client
        .from('history').select('post_id, viewed_at').eq('user_id', userId)
        .order('viewed_at', { ascending: false }).limit(50);
      if (error) return [];
      const posts = [];
      for (const h of (data || [])) {
        const p = await this.getPostById(h.post_id);
        if (p) posts.push(p);
      }
      return posts;
    }
    const postIds = (this.localCache.history || []).map(h => h.postId);
    return postIds.map(id => this.localCache.posts.find(p => p.id === id)).filter(Boolean);
  },

  // ========== 主题 ==========
  getTheme() {
    return localStorage.getItem(this.KEYS.THEME) || 'light';
  },

  setTheme(theme) {
    localStorage.setItem(this.KEYS.THEME, theme);
    document.body.setAttribute('data-theme', theme);
  },

  // ========== 设置 ==========
  async getSettings() {
    if (this.isSupabase()) {
      const { data } = await window.DB.client.from('settings').select('*').single();
      if (data) {
        return {
          siteName: data.site_name,
          registrationOpen: data.registration_open,
          maxImageSize: data.max_image_size,
          postMaxLength: data.post_max_length,
          replyMaxLength: data.reply_max_length
        };
      }
    }
    return this.localCache.settings;
  },

  async updateSettings(updates) {
    if (this.isSupabase()) {
      await window.DB.client.from('settings').upsert({
        id: 1, site_name: updates.siteName,
        registration_open: updates.registrationOpen,
        max_image_size: updates.maxImageSize,
        post_max_length: updates.postMaxLength,
        reply_max_length: updates.replyMaxLength
      });
    } else {
      this.localCache.settings = { ...this.localCache.settings, ...updates };
      this.saveLocalCache();
    }
  },

  // ========== 管理员操作 ==========
  async banUser(userId) {
    return this.updateUser(userId, { banned: true });
  },

  async unbanUser(userId) {
    return this.updateUser(userId, { banned: false });
  },

  async toggleRole(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    return this.updateUser(userId, { role: newRole });
  },

  async computeUserRank(userId) {
    const posts = await this.getPostsByUser(userId);
    const replies = (await this.getReplies()).filter(r => r.authorId === userId);
    return posts.reduce((sum, p) => sum + p.likes * 2 + p.views * 0.1 + (p.featured ? 10 : 0) + (p.pinned ? 5 : 0), 0)
      + replies.reduce((sum, r) => sum + r.likes * 1.5, 0);
  }
};

// 向后兼容（同步包装，仅在本地模式简单使用）
window.Store = Store;
