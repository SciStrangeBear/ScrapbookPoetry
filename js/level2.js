/**
 * 第二关 · 剪裁
 * 划词选中、剪下、收集框管理、重复检测
 */
const Level2 = {
  init(app) {
    this.app = app;
    this.cuts = new Map(); // textId -> [{start, end, text}]
    this.sourceTextsEl = document.getElementById('source-texts');
    this.collectionBody = document.getElementById('collection-body');
    this.wordCount = document.getElementById('word-count');
    this.btnClear = document.getElementById('btn-clear-words');
    this.btnToLevel3 = document.getElementById('btn-to-level3');
    this.cutFloatBtn = document.getElementById('cut-float-btn');
    this.toast = document.getElementById('toast');

    this.btnClear.addEventListener('click', () => this.clearWords());
    this.btnToLevel3.addEventListener('click', () => this.app.goToLevel(3));
    this.cutFloatBtn.addEventListener('click', () => this.performCut());

    // Listen for mouseup to show cut button
    this.sourceTextsEl.addEventListener('mouseup', (e) => this.onTextMouseUp(e));
    this.sourceTextsEl.addEventListener('touchend', (e) => this.onTextTouchEnd(e));
    // Also listen for selectionchange on the whole document
    document.addEventListener('selectionchange', () => this.onSelectionChange());

    // Hide cut button when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!this.cutFloatBtn.contains(e.target) && e.target !== this.cutFloatBtn) {
        this.hideCutBtn();
      }
    });
  },

  /** 进入关卡 */
  enter() {
    this.renderSourceTexts();
    this.renderCollection();
    this.updateUI();
  },

  renderSourceTexts() {
    const texts = this.app.state.selectedTexts;
    this.sourceTextsEl.innerHTML = '';

    if (texts.length === 0) {
      this.sourceTextsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#b0a694;">还没有选择素材，请先回第一关选材。</div>';
      return;
    }

    for (const text of texts) {
      const item = document.createElement('div');
      item.className = 'source-text-item';
      item.dataset.textId = text.id;
      item.dataset.paper = this.getPaperType(text);

      const cuts = this.cuts.get(text.id) || [];

      let contentHtml = '';
      let lastEnd = 0;
      for (const cut of cuts) {
        if (cut.start > lastEnd) {
          contentHtml += this.escapeHtml(text.content.slice(lastEnd, cut.start));
        }
        contentHtml += `<span class="highlight-cut">${this.escapeHtml(text.content.slice(cut.start, cut.end))}</span>`;
        lastEnd = cut.end;
      }
      if (lastEnd < text.content.length) {
        contentHtml += this.escapeHtml(text.content.slice(lastEnd));
      }

      item.innerHTML = `
        <div class="sti-header">
          <span class="sti-title">${this.escapeHtml(text.title)}</span>
          <span>— ${this.escapeHtml(text.source || '')}</span>
        </div>
        <div class="sti-content" data-fulltext="${this.escapeAttr(text.content)}">${contentHtml}</div>
      `;

      const fold = document.createElement('div');
      fold.className = 'sti-fold-mark';
      item.appendChild(fold);

      if (this.shouldShowStamp(text)) {
        const stamp = document.createElement('div');
        stamp.className = 'sti-ink-stamp';
        item.appendChild(stamp);
      }

      this.sourceTextsEl.appendChild(item);
    }
  },

  getPaperType(text) {
    const paperTypes = ['newsprint', 'magazine', 'letter', 'notebook', 'aged'];
    const seed = String(text.id) + (text.title || '') + (text.source || '');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return paperTypes[hash % paperTypes.length];
  },

  shouldShowStamp(text) {
    const seed = String(text.id) + (text.category || '');
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 17 + seed.charCodeAt(i)) >>> 0;
    }
    return hash % 3 !== 0;
  },

  onTextMouseUp(e) {
    // Small delay to let selection stabilize
    setTimeout(() => this.checkSelection(e), 50);
  },

  onTextTouchEnd(e) {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        this.showCutBtnNear(e);
      }
    }, 300);
  },

  onSelectionChange() {
    // Only show if selection is within source texts
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return;
    }
    // Check if selection is within source-texts
    let node = selection.anchorNode;
    while (node) {
      if (node === this.sourceTextsEl || (node.classList && node.classList.contains('sti-content'))) {
        return; // Selection is valid
      }
      if (node === document.body) break;
      node = node.parentNode;
    }
  },

  checkSelection(e) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      this.hideCutBtn();
      return;
    }

    // Check selection is within source texts
    let node = selection.anchorNode;
    let valid = false;
    while (node) {
      if (node.classList && node.classList.contains('sti-content')) {
        valid = true;
        break;
      }
      if (node === document.body || !node.parentNode) break;
      node = node.parentNode;
    }
    if (!valid) { this.hideCutBtn(); return; }

    const x = e.clientX;
    const y = e.clientY;
    this.cutFloatBtn.style.left = Math.min(x - 30, window.innerWidth - 100) + 'px';
    this.cutFloatBtn.style.top = Math.max(y - 50, 10) + 'px';
    this.cutFloatBtn.classList.remove('hidden');
    this.lastSelectionInfo = {
      node,
      range: selection.getRangeAt(0).cloneRange(),
      text: selection.toString().trim()
    };
  },

  showCutBtnNear(e) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0) return;

    let node = selection.anchorNode;
    let valid = false;
    while (node) {
      if (node.classList && node.classList.contains('sti-content')) {
        valid = true;
        break;
      }
      if (node === document.body || !node.parentNode) break;
      node = node.parentNode;
    }
    if (!valid) return;

    this.cutFloatBtn.style.left = Math.min(rect.left + rect.width / 2 - 30, window.innerWidth - 100) + 'px';
    this.cutFloatBtn.style.top = Math.max(rect.top - 45, 10) + 'px';
    this.cutFloatBtn.classList.remove('hidden');
    this.lastSelectionInfo = {
      node,
      range: selection.getRangeAt(0).cloneRange(),
      text: selection.toString().trim()
    };
  },

  hideCutBtn() {
    this.cutFloatBtn.classList.add('hidden');
    this.lastSelectionInfo = null;
  },

  performCut() {
    if (!this.lastSelectionInfo) return;
    const { range, text: selectedText } = this.lastSelectionInfo;

    if (!selectedText) { this.hideCutBtn(); return; }
    const textContent = range.startContainer.textContent;

    // Find the parent sti-content element
    let contentEl = range.startContainer;
    while (contentEl && !(contentEl.classList && contentEl.classList.contains('sti-content'))) {
      contentEl = contentEl.parentNode;
    }
    if (!contentEl) { this.hideCutBtn(); return; }

    // Find the source text item
    const textItem = contentEl.closest('.source-text-item');
    if (!textItem) { this.hideCutBtn(); return; }
    const textId = parseFloat(textItem.dataset.textId);

    // Calculate character offset relative to full text
    const startChar = this.getTextOffset(contentEl, range.startContainer, range.startOffset);
    const endChar = this.getTextOffset(contentEl, range.endContainer, range.endOffset);

    // Validate
    if (startChar >= endChar || endChar - startChar > 100) {
      this.showToast('选中的内容太长了，请选择更短的词或短语');
      this.hideCutBtn(); return;
    }

    // Check overlap
    const existingCuts = this.cuts.get(textId) || [];
    const overlaps = existingCuts.some(c => !(endChar <= c.start || startChar >= c.end));
    if (overlaps) {
      this.showToast('这部分内容已经被剪过啦，试试点别的词吧 ✂');
      this.hideCutBtn(); return;
    }

    // Add cut
    const cutId = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    existingCuts.push({ start: startChar, end: endChar, text: selectedText, cutId: cutId });
    existingCuts.sort((a, b) => a.start - b.start);
    this.cuts.set(textId, existingCuts);

    // Add to collected words (with cutId and textId for removal)
    this.app.state.collectedWords.push({
      id: cutId,
      text: selectedText,
      cutId: cutId,
      textId: textId,
      cutStart: startChar,
      cutEnd: endChar,
    });

    // Re-render
    this.renderSourceTexts();
    this.renderCollection();
    this.updateUI();
    this.hideCutBtn();

    // Clear selection
    window.getSelection().removeAllRanges();
    this.showToast('✂ 已剪下：「' + selectedText + '」');
  },

  getTextOffset(root, node, offset) {
    let charOffset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return charOffset + offset;
      }
      charOffset += walker.currentNode.textContent.length;
    }
    return charOffset + offset;
  },

  renderCollection() {
    const words = this.app.state.collectedWords;
    this.collectionBody.innerHTML = '';

    if (words.length === 0) {
      this.collectionBody.classList.add('empty');
      this.collectionBody.textContent = '剪下的词会出现在这里';
      return;
    }

    this.collectionBody.classList.remove('empty');
    for (const word of words) {
      const chip = document.createElement('span');
      chip.className = 'word-chip';
      chip.dataset.id = word.id;
      chip.innerHTML = `${this.escapeHtml(word.text)} <span class="chip-del" data-id="${word.id}">✕</span>`;
      chip.querySelector('.chip-del').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeWord(word.id);
      });
      this.collectionBody.appendChild(chip);
    }
  },

  removeWord(id) {
    const idx = this.app.state.collectedWords.findIndex(w => w.id === id);
    if (idx >= 0) {
      const w = this.app.state.collectedWords[idx];
      this.app.state.collectedWords.splice(idx, 1);

      // Remove the cut highlight from source text
      if (w.textId) {
        const cuts = this.cuts.get(w.textId);
        if (cuts) {
          const cutIdx = cuts.findIndex(c => c.cutId === w.cutId);
          if (cutIdx >= 0) {
            cuts.splice(cutIdx, 1);
            if (cuts.length === 0) this.cuts.delete(w.textId);
          }
        }
      }

      this.renderSourceTexts();
      this.renderCollection();
      this.updateUI();
      this.showToast('已移除：「' + w.text + '」');
    }
  },

  clearWords() {
    if (this.app.state.collectedWords.length === 0) return;
    this.app.state.collectedWords = [];
    this.cuts.clear();
    this.renderSourceTexts();
    this.renderCollection();
    this.updateUI();
    this.showToast('已清空所有剪裁的词');
  },

  updateUI() {
    const count = this.app.state.collectedWords.length;
    this.wordCount.textContent = count + ' 个词';
    this.btnToLevel3.disabled = count < 3;
  },

  showToast(msg) {
    this.toast.textContent = msg;
    this.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.add('hidden'), 2000);
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
