// ===== 通用工具 =====
const Toast = {
  show(type, message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

const Modal = {
  show(contentHTML, { title = '' } = {}) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modalContent');
    if (!overlay || !modal) return;

    modal.innerHTML = `
      ${title ? `<div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" id="modalClose">✕</button>
      </div>` : ''}
      ${contentHTML}
    `;
    overlay.classList.add('active');

    const close = () => this.hide();
    modal.querySelectorAll('#modalClose').forEach(b => b.addEventListener('click', close));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  },

  hide() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  confirm(message, onConfirm, { title = '确认操作', confirmText = '确定', cancelText = '取消', danger = true } = {}) {
    this.show(`
      <div class="confirm-modal">
        <div class="confirm-icon">${danger ? '⚠️' : '❓'}</div>
        <p class="confirm-text">${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirmCancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${confirmText}</button>
        </div>
      </div>
    `, { title });

    document.getElementById('confirmCancel').addEventListener('click', () => this.hide());
    document.getElementById('confirmOk').addEventListener('click', () => {
      this.hide();
      if (onConfirm) onConfirm();
    });
  }
};

// 时间格式化
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  if (hour < 24) return `${hour}小时前`;
  if (day < 7) return `${day}天前`;

  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 转义HTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 生成ID
function genId(prefix = 'id') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

// 文本截断
function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  return text.substr(0, maxLen) + '...';
}

// 统计文字（去除空白）
function countWords(text) {
  return text.replace(/\s/g, '').length;
}

// 图片上传转 base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 排名计算
function computeUserRank(userId) {
  const posts = Store.getPostsByUser(userId);
  const replies = Store.getReplies().filter(r => r.authorId === userId);
  const postScore = posts.reduce((sum, p) => sum + p.likes * 2 + p.views * 0.1 + (p.featured ? 10 : 0) + (p.pinned ? 5 : 0), 0);
  const replyScore = replies.reduce((sum, r) => sum + r.likes * 1.5, 0);
  return Math.round(postScore + replyScore);
}
