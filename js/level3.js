/**
 * 第三关 · 拼贴
 * 词库拖拽、自由画布、多诗管理
 */
const Level3 = {
  // Common Chinese function words for the 虚词弹药库
  FUNCTION_WORDS: [
    '的', '了', '是', '在', '和', '就', '把', '被',
    '吧', '吗', '啊', '呢', '呀', '哦',
    '不', '很', '也', '还', '又', '再', '都',
    '这', '那', '什么', '怎么',
    '地', '得', '着', '过',
    '让', '给', '向', '从', '对', '比', '与',
    '但', '而', '或', '却', '可', '才',
    '因为', '所以', '虽然', '但是',
    '而且', '然后', '那么',
    '已', '曾', '刚', '正',
    '能', '会', '要', '像', '如', '似', '般',
  ],

  init(app) {
    this.app = app;
    this.wordBankBody = document.getElementById('wordbank-body');
    this.wordBankCount = document.getElementById('wordbank-count');
    this.funcwordBody = document.getElementById('funcword-body');
    this.funcwordToggle = document.getElementById('funcword-toggle');
    this.funcwordArrow = document.getElementById('funcword-arrow');
    this.canvas = document.getElementById('canvas');
    this.canvasPlaceholder = document.getElementById('canvas-placeholder');
    this.poemTabs = document.getElementById('poem-tabs');
    this.btnAddPoem = document.getElementById('btn-add-poem');
    this.btnCheckAI = document.getElementById('btn-check-ai');
    this.btnDownload = document.getElementById('btn-download');
    this.layoutModeSelector = document.getElementById('layout-mode-selector');

    this.isDragging = false;
    this.dragData = null; // {type: 'bank'|'canvas', wordData, element, offsetX, offsetY}
    this.ghost = null;

    this.btnSaveWork = document.getElementById('btn-save-work');
    this.btnSaveWork.addEventListener('click', () => this.app.saveWork());

    this.authorInput = document.getElementById('author-input');
    this.authorInput.addEventListener('change', () => {
      this.app.state.settings.author = this.authorInput.value.trim();
    });

    this.btnAddPoem.addEventListener('click', () => this.addPoem());
    this.btnCheckAI.addEventListener('click', () => this.showAI());
    this.btnDownload.addEventListener('click', () => this.app.exportModule.export());

    // Global mouse/touch handlers for dragging
    document.addEventListener('mousemove', (e) => this.onDragMove(e));
    document.addEventListener('mouseup', (e) => this.onDragEnd(e));
    document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Close AI overlay
    document.getElementById('ai-close').addEventListener('click', () => this.closeAI());
    document.getElementById('ai-close-btn').addEventListener('click', () => this.closeAI());

    // Style selector
    document.querySelectorAll('.style-btn').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
        this.app.state.settings.style = el.dataset.style;
        this.updateCanvasPreview();
      });
    });

    // Func word panel toggle
    this.funcwordToggle.addEventListener('click', () => {
      this.funcwordToggle.closest('.funcword-panel').classList.toggle('collapsed');
    });

    // Layout mode selector
    document.querySelectorAll('.mode-btn').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
      });
    });
  },

  enter() {
    // Initialize poems if empty
    if (this.app.state.poems.length === 0) {
      this.app.state.poems = [{ id: 0, words: [] }];
      this.app.state.currentPoemIdx = 0;
    }
    this.renderWordBank();
    this.renderFuncWords();
    this.renderPoemTabs();
    this.renderCanvas();
    // Sync author input from settings
    this.authorInput.value = this.app.state.settings.author || '';
    // Sync style selector from settings
    document.querySelectorAll('.style-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.style === this.app.state.settings.style);
    });
    this.updateCanvasPreview();
  },

  // ===== Word Bank =====
  renderWordBank() {
    const words = this.app.state.collectedWords;
    this.wordBankBody.innerHTML = '';
    this.wordBankCount.textContent = words.length;

    if (words.length === 0) {
      this.wordBankBody.innerHTML = '<div style="color:#b0a694;font-size:12px;padding:8px;">暂无词语</div>';
      return;
    }

    for (const w of words) {
      const chip = document.createElement('span');
      chip.className = 'wordbank-word';
      chip.dataset.wordId = w.id;
      chip.textContent = w.text;
      chip.addEventListener('mousedown', (e) => this.onBankWordDown(e, w));
      chip.addEventListener('touchstart', (e) => this.onBankWordTouchStart(e, w), { passive: false });
      this.wordBankBody.appendChild(chip);
    }
  },

  // ===== Function Word Arsenal =====
  renderFuncWords() {
    this.funcwordBody.innerHTML = '';
    for (const w of Level3.FUNCTION_WORDS) {
      const chip = document.createElement('span');
      chip.className = 'funcword-word';
      chip.dataset.word = w;
      chip.textContent = w;
      chip.addEventListener('mousedown', (e) => this.onFuncWordDown(e, w));
      chip.addEventListener('touchstart', (e) => this.onFuncWordTouchStart(e, w), { passive: false });
      this.funcwordBody.appendChild(chip);
    }
  },

  onFuncWordDown(e, wordText) {
    e.preventDefault();
    this.startFuncWordDrag(wordText, e.clientX, e.clientY);
  },

  onFuncWordTouchStart(e, wordText) {
    e.preventDefault();
    const touch = e.touches[0];
    this.startFuncWordDrag(wordText, touch.clientX, touch.clientY);
  },

  startFuncWordDrag(wordText, clientX, clientY) {
    this.isDragging = true;
    this.dragData = { type: 'bank', wordData: { id: 'func_' + wordText, text: wordText, isFunc: true }, offsetX: 20, offsetY: 20 };
    this.createGhost(wordText, clientX, clientY);
  },

  onBankWordDown(e, wordData) {
    e.preventDefault();
    this.startDragFromBank(wordData, e.clientX, e.clientY);
  },

  onBankWordTouchStart(e, wordData) {
    e.preventDefault();
    const touch = e.touches[0];
    this.startDragFromBank(wordData, touch.clientX, touch.clientY);
  },

  startDragFromBank(wordData, clientX, clientY) {
    this.isDragging = true;
    this.dragData = { type: 'bank', wordData, offsetX: 20, offsetY: 20 };
    this.createGhost(wordData.text, clientX, clientY);
  },

  // ===== Canvas =====
  renderCanvas() {
    const poem = this.getCurrentPoem();
    this.canvas.innerHTML = '';

    if (!poem || poem.words.length === 0) {
      this.canvasPlaceholder.classList.remove('hidden');
      return;
    }

    this.canvasPlaceholder.classList.add('hidden');

    for (const w of poem.words) {
      const el = this.createCanvasWordEl(w);
      this.canvas.appendChild(el);
    }
  },

  updateCanvasPreview() {
    const style = this.app.state.settings.style || 'newspaper';
    this.canvas.className = this.canvas.className
      .replace(/preview-\w+/g, '')
      .trim() + ' preview-' + style;
  },

  createCanvasWordEl(w) {
    const el = document.createElement('div');
    el.className = 'canvas-word' + (w.isFunc ? ' func-word' : '');
    el.dataset.wordId = w.id;
    // Assign a stable cut-shape based on word id
    const cutIdx = (typeof w.id === 'string' ? w.id.charCodeAt(0) + w.id.length : w.id) % 6 + 1;
    el.style.setProperty('--cut-shape', `var(--cut-${cutIdx})`);
    el.style.left = w.x + 'px';
    el.style.top = w.y + 'px';
    el.style.transform = `rotate(${w.rotation || 0}deg)`;
    el.style.zIndex = w.zIndex || 1;

    const textSpan = document.createElement('span');
    textSpan.className = 'cw-text';
    textSpan.textContent = w.text;
    textSpan.style.fontSize = (w.fontSize || 24) + 'px';
    el.appendChild(textSpan);

    // Remove button
    const removeBtn = document.createElement('span');
    removeBtn.className = 'cw-remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.removeWord(w.id);
    });
    removeBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      this.removeWord(w.id);
    });
    el.appendChild(removeBtn);

    // Start drag from canvas
    el.addEventListener('mousedown', (e) => {
      if (e.target !== removeBtn) {
        this.startCanvasDrag(e, w);
      }
    });
    el.addEventListener('touchstart', (e) => {
      if (e.target !== removeBtn) {
        this.startCanvasTouchDrag(e, w);
      }
    }, { passive: false });

    return el;
  },

  startCanvasDrag(e, wordData) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    this.isDragging = true;
    this.dragData = {
      type: 'canvas',
      wordData,
      offsetX: e.clientX - wordData.x - rect.left,
      offsetY: e.clientY - wordData.y - rect.top,
      startX: wordData.x,
      startY: wordData.y,
    };
  },

  startCanvasTouchDrag(e, wordData) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.isDragging = true;
    this.dragData = {
      type: 'canvas',
      wordData,
      offsetX: touch.clientX - wordData.x - rect.left,
      offsetY: touch.clientY - wordData.y - rect.top,
      startX: wordData.x,
      startY: wordData.y,
    };
  },

  // ===== Ghost Element for Bank → Canvas Drag =====
  createGhost(text, x, y) {
    this.destroyGhost();
    const ghost = document.createElement('div');
    ghost.className = 'canvas-word';
    ghost.style.position = 'fixed';
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    ghost.style.transform = 'translate(-50%, -50%) rotate(-3deg)';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.opacity = '0.85';

    const textSpan = document.createElement('span');
    textSpan.className = 'cw-text';
    textSpan.textContent = text;
    textSpan.style.fontSize = '28px';
    textSpan.style.padding = '6px 14px';
    textSpan.style.background = 'rgba(192,57,43,0.1)';
    textSpan.style.borderRadius = '8px';
    textSpan.style.border = '2px dashed #c0392b';

    ghost.appendChild(textSpan);
    document.body.appendChild(ghost);
    this.ghost = ghost;
  },

  destroyGhost() {
    if (this.ghost) { document.body.removeChild(this.ghost); this.ghost = null; }
  },

  // ===== Drag Move/End Handlers =====
  onDragMove(e) {
    if (!this.isDragging || !this.dragData) return;
    e.preventDefault();

    if (this.dragData.type === 'bank' && this.ghost) {
      this.ghost.style.left = e.clientX + 'px';
      this.ghost.style.top = e.clientY + 'px';
      // Highlight canvas if over it
      const rect = this.canvas.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        this.canvas.classList.add('drag-over');
      } else {
        this.canvas.classList.remove('drag-over');
      }
    } else if (this.dragData.type === 'canvas') {
      const rect = this.canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left - this.dragData.offsetX;
      const newY = e.clientY - rect.top - this.dragData.offsetY;
      this.dragData.wordData.x = Math.max(0, newX);
      this.dragData.wordData.y = Math.max(0, newY);
      this.renderCanvasWordPositions();
    }
  },

  onDragEnd(e) {
    if (!this.isDragging) return;
    this.canvas.classList.remove('drag-over');

    if (this.dragData.type === 'bank') {
      // Check if dropped on canvas
      const rect = this.canvas.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const x = e.clientX - rect.left - 40;
        const y = e.clientY - rect.top - 16;
        this.addWordToCanvas(this.dragData.wordData, x, y);
      }
      this.destroyGhost();
    } else if (this.dragData.type === 'canvas') {
      // Position is already updated in onDragMove
      this.saveCanvasState();
    }

    this.isDragging = false;
    this.dragData = null;
  },

  onTouchMove(e) {
    if (!this.isDragging || !this.dragData) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (this.dragData.type === 'bank' && this.ghost) {
      this.ghost.style.left = touch.clientX + 'px';
      this.ghost.style.top = touch.clientY + 'px';
      const rect = this.canvas.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        this.canvas.classList.add('drag-over');
      } else {
        this.canvas.classList.remove('drag-over');
      }
    } else if (this.dragData.type === 'canvas') {
      const rect = this.canvas.getBoundingClientRect();
      const newX = touch.clientX - rect.left - this.dragData.offsetX;
      const newY = touch.clientY - rect.top - this.dragData.offsetY;
      this.dragData.wordData.x = Math.max(0, newX);
      this.dragData.wordData.y = Math.max(0, newY);
      this.renderCanvasWordPositions();
    }
  },

  onTouchEnd(e) {
    if (!this.isDragging) return;
    this.canvas.classList.remove('drag-over');

    if (this.dragData.type === 'bank') {
      // Get last touch position
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right && touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const x = touch.clientX - rect.left - 40;
        const y = touch.clientY - rect.top - 16;
        this.addWordToCanvas(this.dragData.wordData, x, y);
      }
      this.destroyGhost();
    } else if (this.dragData.type === 'canvas') {
      this.saveCanvasState();
    }

    this.isDragging = false;
    this.dragData = null;
  },

  // ===== Canvas Word Operations =====
  addWordToCanvas(wordData, x, y) {
    const poem = this.getCurrentPoem();
    if (!poem) return;

    const newWord = {
      id: 'cw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      text: wordData.text,
      x: Math.max(0, x),
      y: Math.max(0, y),
      rotation: wordData.isFunc ? 0 : (Math.random() - 0.5) * 3,
      fontSize: wordData.isFunc ? 14 : 20 + Math.floor(Math.random() * 16),
      zIndex: wordData.isFunc ? 0 : poem.words.length + 1,
      isFunc: wordData.isFunc || false,
    };
    poem.words.push(newWord);
    this.renderCanvas();
    this.saveCanvasState();
  },

  removeWord(wordId) {
    const poem = this.getCurrentPoem();
    if (!poem) return;
    poem.words = poem.words.filter(w => w.id !== wordId);
    this.renderCanvas();
    this.saveCanvasState();
  },

  renderCanvasWordPositions() {
    const poem = this.getCurrentPoem();
    if (!poem) return;
    for (const w of poem.words) {
      const el = this.canvas.querySelector(`[data-word-id="${w.id}"]`);
      if (el) {
        el.style.left = w.x + 'px';
        el.style.top = w.y + 'px';
      }
    }
  },

  getCurrentPoem() {
    return this.app.state.poems[this.app.state.currentPoemIdx] || null;
  },

  // ===== Poem Management =====
  addPoem() {
    this.app.state.poems.push({ id: Date.now(), words: [] });
    this.app.state.currentPoemIdx = this.app.state.poems.length - 1;
    this.renderPoemTabs();
    this.renderCanvas();
  },

  switchPoem(index) {
    this.app.state.currentPoemIdx = index;
    this.renderPoemTabs();
    this.renderCanvas();
  },

  renderPoemTabs() {
    this.poemTabs.innerHTML = '';
    const poems = this.app.state.poems;

    if (poems.length <= 1) {
      this.poemTabs.classList.add('hidden');
      return;
    }

    this.poemTabs.classList.remove('hidden');
    for (let i = 0; i < poems.length; i++) {
      const tab = document.createElement('button');
      tab.className = 'poem-tab' + (i === this.app.state.currentPoemIdx ? ' active' : '');
      tab.textContent = `📝 诗 ${i + 1}` + (poems[i].words.length > 0 ? ` (${poems[i].words.length})` : '');
      tab.addEventListener('click', () => this.switchPoem(i));
      this.poemTabs.appendChild(tab);
    }
  },

  saveCanvasState() {
    // State is already stored in app.state and updated by reference
    // Just re-render the tabs to update word counts
    this.renderPoemTabs();
  },

  // ===== AI Review =====
  showAI() {
    const poem = this.getCurrentPoem();
    if (!poem || poem.words.length === 0) {
      this.app.toast('画布上还没有词语，先拖几个词再生成点评吧');
      return;
    }

    // Local stats (fast, rule-based)
    const result = AIEngine.reviewPoem(poem.words);

    let html = '';

    // Stats row
    html += `<div class="review-stats">
      <span><strong>${result.stats.totalWords}</strong> 个词</span>
      <span><strong>${result.stats.totalChars}</strong> 个字</span>
      <span><strong>${result.stats.verbCount}</strong> 个动词 · <strong>${result.stats.adjCount}</strong> 个形容词 · <strong>${result.stats.colorCount}</strong> 个色彩词</span>
      <span><strong>${result.stats.funcWordCount}</strong> 个虚词</span>
    </div>`;

    // Theme & mood badges
    html += `<div class="review-badges">
      <span class="review-badge theme">● ${result.theme}</span>
      <span class="review-badge mood">◑ ${result.mood}</span>
    </div>`;

    // Loading indicator (visible while API call is in flight)
    html += '<div class="review-loading" id="ai-loading">✂ AI 正在审阅你的诗……</div>';
    // AI response container (hidden until API responds)
    html += '<div id="ai-response" style="display:none;" class="ai-response-text"></div>';

    document.getElementById('ai-result').innerHTML = html;

    // Show overlay
    document.getElementById('ai-overlay').classList.remove('hidden');
    document.getElementById('ai-overlay').classList.add('active');

    // Call DeepSeek API asynchronously
    const sourceTexts = this.app.state.selectedTexts || [];
    AIEngine.reviewWithAI(poem.words, sourceTexts)
      .then(text => {
        const loading = document.getElementById('ai-loading');
        const content = document.getElementById('ai-response');
        if (loading) loading.style.display = 'none';
        if (content) {
          content.style.display = 'block';
          content.innerHTML = this._renderAIResponse(text);
        }
      })
      .catch(err => {
        const loading = document.getElementById('ai-loading');
        if (loading) {
          loading.innerHTML = '❌ ' + err.message + '<br><br>可稍后重试，或检查网络连接与 API Key 是否有效。';
        }
      });
  },

  /** 将 AI 返回的 Markdown 文本渲染为 HTML */
  _renderAIResponse(text) {
    let h = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return '<p>' + h + '</p>';
  },

  closeAI() {
    document.getElementById('ai-overlay').classList.remove('active');
    document.getElementById('ai-overlay').classList.add('hidden');
  },
};
