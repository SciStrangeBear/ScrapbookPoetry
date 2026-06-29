/**
 * 应用主控制器
 * 状态管理 + 导航 + 初始化
 */

const AppState = {
  ageGroup: null,           // 'kid' | 'youth' | 'open'
  currentLevel: 0,          // 0=welcome, 1, 2, 3
  selectedTexts: [],        // full text objects selected in level 1
  batchIndex: 0,            // pagination index for level 1
  collectedWords: [],       // [{id, text}] from level 2
  level2Visited: false,     // whether Level 2 has been entered in this session
  poems: [],                // [{id, words: [{id, text, x, y, rotation, fontSize, zIndex}]}]
  currentPoemIdx: 0,
  settings: {
    style: 'newspaper',     // 'newspaper' | 'journal' | 'ink' | 'modern'
  },
};

class App {
  constructor() {
    this.state = AppState;
    this.level1 = Level1;
    this.level2 = Level2;
    this.level3 = Level3;
    this.exportModule = ExportModule;

    this.screens = {};
    this.header = null;
  }

  init() {
    // Cache DOM references
    this.screens = {
      welcome: document.getElementById('screen-welcome'),
      level1: document.getElementById('screen-level1'),
      level2: document.getElementById('screen-level2'),
      level3: document.getElementById('screen-level3'),
    };
    this.header = document.getElementById('main-header');
    this.toastEl = document.getElementById('toast');

    // Welcome screen: age selection
    document.querySelectorAll('.age-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.age-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.state.ageGroup = btn.dataset.age;
        document.getElementById('age-hint').textContent = '✓ 已选择「' + btn.textContent.trim() + '」模式';
        document.getElementById('btn-start-level1').disabled = false;
      });
    });

    document.getElementById('btn-start-level1').addEventListener('click', () => {
      this.goToLevel(1);
    });

    // Settings
    document.getElementById('btn-settings').addEventListener('click', () => this.openSettings());
    document.getElementById('settings-close').addEventListener('click', () => this.closeSettings());
    document.getElementById('btn-restart').addEventListener('click', () => this.confirmRestart());
    document.getElementById('confirm-cancel').addEventListener('click', () => this.closeConfirm());
    document.getElementById('confirm-ok').addEventListener('click', () => {
      this.closeConfirm();
      this.restart();
    });

    // Help overlay
    document.getElementById('btn-help').addEventListener('click', () => this.openHelp());
    document.getElementById('help-close').addEventListener('click', () => this.closeHelp());
    document.getElementById('help-gotit').addEventListener('click', () => this.closeHelp());

    // Gallery
    document.getElementById('btn-gallery').addEventListener('click', () => this.openGallery());
    document.getElementById('gallery-close').addEventListener('click', () => this.closeGallery());
    document.getElementById('gallery-close-btn').addEventListener('click', () => this.closeGallery());

    // Settings: age group
    document.querySelectorAll('#settings-age .setting-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#settings-age .setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.ageGroup = btn.dataset.age;
      });
    });

    // Settings: default style
    document.querySelectorAll('#settings-style .setting-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#settings-style .setting-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.settings.style = btn.dataset.style;
        // Also sync the style selector in level 3 canvas
        document.querySelectorAll('.style-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.style === btn.dataset.style);
        });
      });
    });

    // Level navigation: make level dots clickable
    document.querySelectorAll('.level-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const lvl = parseInt(dot.dataset.level);
        if (lvl < this.state.currentLevel) {
          this.goToLevel(lvl);
        }
      });
    });

    // Initialize modules
    this.level1.init(this);
    this.level2.init(this);
    this.level3.init(this);
    this.exportModule.init(this);

//     // Debug bar (disabled)
//     var dbg = document.createElement('div');
//     dbg.id = 'debug-bar';
//     dbg.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#333;color:#fff;font-size:12px;padding:8px;z-index:9999;font-family:monospace;';
//     dbg.textContent = 'TEXTS=' + (typeof TEXTS !== 'undefined' ? TEXTS.length + '篇' : 'NOT LOADED') +
//       ' | Level1=' + (typeof Level1 !== 'undefined' ? 'OK' : 'MISSING') +
//       ' | App=OK';
//     document.body.appendChild(dbg);

    console.log('CollagePoem App initialized');
  }

  goToLevel(level) {
    const prevLevel = this.state.currentLevel;
    this.state.currentLevel = level;

    // Clear Level 2 state only on first visit (not when returning from Level 1)
    if (level === 2 && !this.state.level2Visited) {
      this.state.collectedWords = [];
      this.level2.cuts.clear();
      this.state.level2Visited = true;
    }

    // Hide all screens
    Object.values(this.screens).forEach(s => s.classList.remove('active'));

    // Show header (hide on welcome, show otherwise)
    this.header.classList.toggle('active', level > 0);

    // Show target screen
    const screenKey = level === 0 ? 'welcome' : 'level' + level;
    if (this.screens[screenKey]) this.screens[screenKey].classList.add('active');

    // Update level indicators and make them clickable
    document.querySelectorAll('.level-dot').forEach(dot => {
      const lvl = parseInt(dot.dataset.level);
      dot.classList.remove('active', 'done');
      if (lvl === level) dot.classList.add('active');
      else if (lvl < level) dot.classList.add('done');
      // Make previously completed levels clickable for navigation
      dot.style.cursor = lvl < level ? 'pointer' : 'default';
    });

    // Trigger level enter
    if (level === 1) this.level1.enter();
    else if (level === 2) this.level2.enter();
    else if (level === 3) this.level3.enter();
  }

  toast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), 2500);
  }

  openSettings() {
    // Sync current settings
    document.querySelectorAll('#settings-age .setting-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.age === this.state.ageGroup);
    });
    document.querySelectorAll('#settings-style .setting-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.style === this.state.settings.style);
    });
    document.getElementById('settings-overlay').classList.remove('hidden');
    document.getElementById('settings-overlay').classList.add('active');
  }

  closeSettings() {
    document.getElementById('settings-overlay').classList.remove('active');
    document.getElementById('settings-overlay').classList.add('hidden');
  }

  confirmRestart() {
    document.getElementById('confirm-msg').textContent = '确定要重新开始吗？当前所有进度将会丢失。';
    document.getElementById('confirm-overlay').classList.remove('hidden');
    document.getElementById('confirm-overlay').classList.add('active');
  }

  closeConfirm() {
    document.getElementById('confirm-overlay').classList.remove('active');
    document.getElementById('confirm-overlay').classList.add('hidden');
  }

  openHelp() {
    document.getElementById('help-overlay').classList.remove('hidden');
    document.getElementById('help-overlay').classList.add('active');
  }

  closeHelp() {
    document.getElementById('help-overlay').classList.remove('active');
    document.getElementById('help-overlay').classList.add('hidden');
  }

  restart() {
    // Reset state
    this.state.selectedTexts = [];
    this.state.batchIndex = 0;
    this.state.collectedWords = [];
    this.state.poems = [];
    this.state.currentPoemIdx = 0;
    this.state.level2Visited = false;
    // Reset level2 cuts
    this.level2.cuts.clear();
    // Go back to welcome
    this.goToLevel(0);
    this.toast('已重新开始');
  }

  // ===== Gallery (localStorage) =====

  loadWorks() {
    try {
      return JSON.parse(localStorage.getItem('collage_poetry_works') || '[]');
    } catch (e) {
      return [];
    }
  }

  saveWork() {
    const poem = this.level3.getCurrentPoem();
    if (!poem || poem.words.length === 0) {
      this.toast('画布上还没有词语，先拼贴再保存吧');
      return;
    }

    const works = this.loadWorks();
    const work = {
      id: Date.now(),
      date: new Date().toISOString(),
      style: this.state.settings.style,
      poemIndex: this.state.currentPoemIdx,
      words: JSON.parse(JSON.stringify(poem.words)),
      wordCount: poem.words.length,
    };
    works.unshift(work);
    localStorage.setItem('collage_poetry_works', JSON.stringify(works));
    this.toast('✅ 已存到作品集');
  }

  deleteWork(id) {
    let works = this.loadWorks();
    works = works.filter(w => w.id !== id);
    localStorage.setItem('collage_poetry_works', JSON.stringify(works));
    this.renderGallery();
  }

  openGallery() {
    this.renderGallery();
    document.getElementById('gallery-overlay').classList.remove('hidden');
    document.getElementById('gallery-overlay').classList.add('active');
  }

  closeGallery() {
    document.getElementById('gallery-overlay').classList.remove('active');
    document.getElementById('gallery-overlay').classList.add('hidden');
  }

  renderGallery() {
    const works = this.loadWorks();
    const body = document.getElementById('gallery-body');

    if (works.length === 0) {
      body.innerHTML = '<div class="gallery-empty">还没有保存的作品<br>在拼贴页面点击「📂 存到作品集」按钮来保存你的诗</div>';
      return;
    }

    body.innerHTML = works.map(w => {
      const date = new Date(w.date);
      const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      const styleNames = { newspaper: '旧报', journal: '手账', ink: '墨韵', modern: '现代' };
      const previewChar = w.words.length > 0 ? w.words[0].text[0] : '?';

      return `
        <div class="gallery-item" data-id="${w.id}">
          <div class="gallery-item-icon">${previewChar}</div>
          <div class="gallery-item-info">
            <div class="gallery-item-title">${w.wordCount} 个词</div>
            <div class="gallery-item-meta">${dateStr} · ${styleNames[w.style] || w.style}</div>
          </div>
          <div class="gallery-item-actions">
            <button class="gallery-item-del" data-id="${w.id}">删除</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach delete handlers
    body.querySelectorAll('.gallery-item-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteWork(parseInt(btn.dataset.id));
      });
    });

    // Attach click-to-restore handlers
    body.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', () => {
        this.restoreWork(parseInt(item.dataset.id));
      });
    });
  }

  restoreWork(id) {
    const works = this.loadWorks();
    const work = works.find(w => w.id === id);
    if (!work) {
      this.toast('未找到该作品');
      return;
    }

    // Load the work into current state
    this.state.poems = [{ id: Date.now(), words: JSON.parse(JSON.stringify(work.words)) }];
    this.state.currentPoemIdx = 0;
    this.state.settings.style = work.style;

    this.closeGallery();
    this.goToLevel(3);
    this.toast('已恢复作品');
  }
}

// ===== Bootstrap =====
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
