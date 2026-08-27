// ===== Supabase 云数据库配置 =====
// 纯数据库模式：注册登录直接走 profiles 表，不依赖 Supabase Auth

const SUPABASE_CONFIG = {
  url: 'https://lfgkdlzvcsbilketvhwi.supabase.co',
  anonKey: 'sb_publishable_fHo6spdrXQgfvDaypjQ5dg_Wt3O3qwm'
};

// 数据库封装
const DB = {
  client: null,
  mode: 'local',
  connected: false,
  currentUserId: null,

  async init() {
    if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL') {
      try {
        this.client = window.supabase.createClient(
          SUPABASE_CONFIG.url,
          SUPABASE_CONFIG.anonKey
        );
        // 带超时的连接检测（5 秒，防止无限挂起）
        const queryPromise = this.client.from('settings').select('*').limit(1);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase 连接超时')), 5000)
        );
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
        if (!error) {
          this.mode = 'supabase';
          this.connected = true;
          console.log('%c✅ Supabase 连接成功（云数据库模式）', 'color:#10b981;font-weight:bold;');
          return;
        } else {
          console.warn('Supabase 连接失败，降级为本地存储:', error.message);
        }
      } catch (e) {
        console.warn('Supabase 初始化失败，降级为本地存储:', e.message);
      }
    }
    console.log('%c💾 使用本地存储模式（localStorage）', 'color:#6b7280;');
    this.mode = 'local';
    this.connected = false;
  },

  isSupabase() {
    return this.mode === 'supabase' && this.connected;
  },

  // 纯数据库登录（不用 auth.users）
  async login(username, password) {
    if (!this.isSupabase()) return { error: '需要配置 Supabase' };

    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .limit(1)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!data) return { error: '用户名或密码错误' };
    if (data.banned) return { error: '账号已被封禁' };

    this.currentUserId = data.id;
    return { data: data };
  },

  // 纯数据库注册
  async register(username, password, nickname) {
    if (!this.isSupabase()) return { error: '需要配置 Supabase' };

    // 检查用户名是否存在
    const { data: existing, error: checkErr } = await this.client
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();
    if (existing) return { error: '用户名已被占用' };

    // 检查是否关闭注册
    const { data: settings } = await this.client
      .from('settings')
      .select('registration_open')
      .limit(1)
      .maybeSingle();
    if (settings && settings.registration_open === false) {
      return { error: '当前注册已关闭' };
    }

    const avatar = nickname.charAt(0).toUpperCase();
    const { data, error } = await this.client
      .from('profiles')
      .insert({
        username, password, nickname, avatar,
        role: 'user', bio: '漳州一中八年12班同学'
      })
      .select()
      .single();

    if (error) return { error: error.message };
    if (!data) return { error: '注册失败' };

    this.currentUserId = data.id;
    return { data: data };
  },

  async signOut() {
    this.currentUserId = null;
  },

  async getCurrentUser() {
    if (!this.currentUserId) return null;
    return this.getProfile(this.currentUserId);
  },

  async getProfile(userId) {
    if (!this.isSupabase()) return null;
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  },

  async updateProfile(userId, updates) {
    if (!this.isSupabase()) return null;
    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) return null;
    return data;
  },

  getUserId() {
    return this.currentUserId;
  }
};

window.DB = DB;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
