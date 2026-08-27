// ===== 认证模块 - 纯数据库模式 =====
const Auth = {
  currentUser: null,

  async init() {
    // 从 localStorage 恢复登录状态
    const savedUser = localStorage.getItem(Store.KEYS.CURRENT_USER);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // 验证用户是否还存在于数据库中
        if (Store.isSupabase()) {
          const profile = await Store.getUserById(parsed.id);
          if (profile) {
            this.currentUser = this.normalizeUser(profile);
            localStorage.setItem(Store.KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
          }
        } else {
          this.currentUser = parsed;
        }
        if (this.currentUser && this.currentUser.banned) {
          this.logout();
          Toast.show('warning', '账号已被封禁');
          return;
        }
      } catch(e) {
        console.warn('恢复登录状态失败:', e);
      }
    }
    this.updateUI();
  },

  normalizeUser(user) {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar || 'U',
      role: user.role || 'user',
      bio: user.bio || '',
      banned: user.banned || false
    };
  },

  async login(username, password) {
    try {
      const result = await Store.login(username, password);
      console.log('login result:', result);
      if (result.error) {
        return { success: false, message: result.error };
      }

      let userData;
      if (Store.isSupabase()) {
        // 纯数据库模式：DB.login 直接返回 profile 对象
        const profile = result.data;
        if (profile) {
          userData = this.normalizeUser(profile);
        }
      } else {
        userData = result.data.user;
      }

      if (!userData) return { success: false, message: '登录失败，请重试' };
      if (userData.banned) return { success: false, message: '账号已被封禁，请联系管理员' };

      this.currentUser = userData;
      localStorage.setItem(Store.KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      this.updateUI();
      return { success: true, user: this.currentUser };
    } catch (e) {
      console.error('login error:', e);
      return { success: false, message: e.message || '登录出错' };
    }
  },

  async register(username, password, nickname) {
    try {
      const result = await Store.register(username, password, nickname);
      if (result.error) {
        return { success: false, message: result.error };
      }

      let userData;
      if (Store.isSupabase()) {
        const profile = result.data;
        if (profile) userData = this.normalizeUser(profile);
      } else {
        userData = result.data.user;
      }

      if (!userData) return { success: false, message: '注册失败' };

      this.currentUser = userData;
      localStorage.setItem(Store.KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      this.updateUI();
      return { success: true, user: this.currentUser };
    } catch (e) {
      console.error('register error:', e);
      return { success: false, message: e.message || '注册出错' };
    }
  },

  async logout() {
    if (Store.isSupabase()) {
      await window.DB.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem(Store.KEYS.CURRENT_USER);
    this.updateUI();
  },

  isLoggedIn() {
    return this.currentUser !== null;
  },

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  },

  requireAuth(redirectMsg = '请先登录') {
    if (!this.isLoggedIn()) {
      Toast.show('warning', redirectMsg);
      Router.navigate('/auth');
      return false;
    }
    return true;
  },

  updateUI() {
    const userArea = document.getElementById('navUserArea');
    if (!userArea) return;

    if (this.currentUser) {
      const isAdmin = this.isAdmin();
      userArea.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          ${isAdmin ? '<button class="tag tag-primary" onclick="Router.navigate(\'/admin\')" style="text-decoration:none;font-size:11px;border:none;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:4px 10px;border-radius:8px;cursor:pointer;">⚙️ 管理</button>' : ''}
          <button onclick="Router.navigate('/profile')" style="display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:12px;background:var(--glass-bg-weak);border:1px solid var(--glass-border);text-decoration:none;color:var(--text);transition:all 0.3s;cursor:pointer;font-family:inherit;">
            <span class="avatar" style="width:28px;height:28px;font-size:13px;">${this.currentUser.avatar}</span>
            <span style="font-size:13px;font-weight:600;">${this.currentUser.nickname}</span>
          </button>
          <button class="icon-btn" id="logoutBtn" title="退出登录" style="width:36px;height:36px;font-size:14px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          Modal.confirm('确定要退出登录吗？', async () => {
            await this.logout();
            Toast.show('success', '已退出登录');
            Router.navigate('/');
          });
        });
      }
    } else {
      userArea.innerHTML = `
        <div style="display:flex;gap:8px;">
          <button onclick="Router.navigate('/auth')" class="btn btn-primary" style="padding:8px 20px;font-size:13px;">登录</button>
        </div>
      `;
    }

    // 更新管理员菜单可见性
    document.querySelectorAll('.admin-only').forEach(el => {
      if (this.isAdmin()) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }
};

window.Auth = Auth;
