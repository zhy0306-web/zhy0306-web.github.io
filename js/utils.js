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

// ===== 图片压缩 =====
// 使用 Canvas API 压缩上传图片，减轻服务器负担
// 默认: 最大边 1920px, JPEG 质量 0.8, 仅压缩 >200KB 的图片
async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    minSize = 200 * 1024,
    preservePng = true
  } = options;

  // 非图片格式直接返回
  if (!file.type.startsWith('image/')) {
    return { dataUrl: await fileToBase64(file), compressed: false, originalSize: file.size, newSize: file.size };
  }

  // 不支持的格式 (HEIC 等) 直接返回原图
  const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
  if (!supported.includes(file.type)) {
    return { dataUrl: await fileToBase64(file), compressed: false, originalSize: file.size, newSize: file.size };
  }

  // 小图跳过压缩
  if (file.size < minSize) {
    return { dataUrl: await fileToBase64(file), compressed: false, originalSize: file.size, newSize: file.size };
  }

  // 加载图片
  const img = await loadImage(file);
  const originalW = img.naturalWidth;
  const originalH = img.naturalHeight;
  const originalSize = file.size;

  // 判断是否需要缩放
  const ratio = Math.min(maxWidth / originalW, maxHeight / originalH, 1);
  const targetW = Math.round(originalW * ratio);
  const targetH = Math.round(originalH * ratio);

  // PNG 保留透明通道: 如果原图是 PNG 且 preservePng=true，检查是否有透明像素
  const isPng = file.type === 'image/png';
  let needPng = isPng && preservePng;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (needPng) {
    // PNG: 用 PNG 格式保留透明
    // 检查原图是否有透明像素
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalW;
    tempCanvas.height = originalH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);
    try {
      const alphaData = tempCtx.getImageData(0, 0, originalW, originalH).data;
      let hasAlpha = false;
      for (let i = 3; i < alphaData.length; i += 4) {
        if (alphaData[i] < 250) { hasAlpha = true; break; }
      }
      needPng = hasAlpha;
    } catch (e) {
      needPng = false; // 跨域污染时退化为 JPEG
    }
  }

  // 绘制
  if (needPng) {
    // 透明背景
    ctx.clearRect(0, 0, targetW, targetH);
  } else {
    // JPEG 白底
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // 导出
  const outputType = needPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise(resolve => canvas.toBlob(resolve, outputType, quality));

  // 如果压缩后反而更大，用原图
  if (blob && blob.size < originalSize) {
    const dataUrl = await fileToBase64(blob);
    return { dataUrl, compressed: true, originalSize, newSize: blob.size, width: targetW, height: targetH };
  } else {
    return { dataUrl: await fileToBase64(file), compressed: false, originalSize, newSize: originalSize };
  }
}

// 加载图片为 HTMLImageElement（支持本地文件）
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = (e) => { reject(e); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 排名计算
function computeUserRank(userId) {
  const posts = Store.getPostsByUser(userId);
  const replies = Store.getReplies().filter(r => r.authorId === userId);
  const postScore = posts.reduce((sum, p) => sum + p.likes * 2 + p.views * 0.1 + (p.featured ? 10 : 0) + (p.pinned ? 5 : 0), 0);
  const replyScore = replies.reduce((sum, r) => sum + r.likes * 1.5, 0);
  return Math.round(postScore + replyScore);
}
