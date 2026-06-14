/**
 * 第一关 · 选材
 * 浏览文本、选材、换一批
 */
const Level1 = {
  /** @param {App} app */
  init(app) {
    this.app = app;
    this.textGrid = document.getElementById('text-grid');
    this.selectionCount = document.getElementById('selection-count');
    this.btnNext = document.getElementById('btn-next-batch');
    this.btnToLevel2 = document.getElementById('btn-to-level2');
    this.customTexts = []; // {id, title, source, category, content, ageRange}

    this.btnNext.addEventListener('click', () => this.nextBatch());
    this.btnToLevel2.addEventListener('click', () => this.app.goToLevel(2));

    // Custom text section toggle
    document.getElementById('custom-text-toggle').addEventListener('click', () => {
      document.getElementById('custom-text-section').classList.toggle('collapsed');
    });

    // Custom text add button
    document.getElementById('l1-btn-add-custom').addEventListener('click', () => {
      this.handleAddCustomText();
    });
  },

  handleAddCustomText() {
    const textarea = document.getElementById('l1-custom-input');
    const added = this.addCustomText(textarea.value);
    if (added > 0) {
      const count = this.customTexts.length;
      document.getElementById('l1-custom-count').textContent = `已添加 ${count} 篇`;
      textarea.value = '';
      this.render();
    }
  },

  /** 进入关卡 */
  enter() {
    this.render();
  },

  /** 根据年龄段和批次渲染文本网格 */
  render() {
    try {
      const ageGroup = this.app.state.ageGroup;

      if (typeof window.TEXTS === 'undefined' || !window.TEXTS || window.TEXTS.length === 0) {
        this.textGrid.innerHTML = '<div style="text-align:center;padding:60px;color:#b0a694;">⚠ 文本库加载失败，请检查网络连接后刷新页面重试。</div>';
        return;
      }

      const batchSize = 9;

      // Build pool filtered by age group
      let pool = window.TEXTS.filter(t => t.ageRange.includes(ageGroup));
      pool = [...pool, ...this.customTexts.filter(t => t.ageRange.includes(ageGroup))];

    // If pool is too small, get texts from other age groups too
    if (pool.length < batchSize) {
      pool = window.TEXTS.filter(t => !pool.find(pt => pt.id === t.id));
      pool = pool.slice(0, batchSize);
    }

    // Create a category-diverse ordering: round-robin across categories
    const byCat = {};
    for (const t of pool) {
      const cat = t.category || '其他';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(t);
    }
    // Shuffle within each category for randomness
    for (const cat of Object.keys(byCat)) {
      for (let i = byCat[cat].length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [byCat[cat][i], byCat[cat][j]] = [byCat[cat][j], byCat[cat][i]];
      }
    }
    const catOrder = Object.keys(byCat).sort(() => Math.random() - 0.5);
    // Interleave: take 1 from each category, cycling through
    const diverseOrder = [];
    let max = Math.max(...Object.values(byCat).map(a => a.length));
    for (let i = 0; i < max; i++) {
      for (const cat of catOrder) {
        if (i < byCat[cat].length) {
          diverseOrder.push(byCat[cat][i]);
        }
      }
    }

    const start = this.app.state.batchIndex * batchSize;
    const batch = diverseOrder.slice(start, start + batchSize);
    // If at end, loop around
    if (batch.length === 0) {
      this.app.state.batchIndex = 0;
      const nextStart = 0;
      const nextBatch = diverseOrder.slice(nextStart, nextStart + batchSize);
      this.renderCards(nextBatch);
      return;
    }
    this.renderCards(batch);
    } catch (e) {
      console.error('[Level1] render error:', e);
      this.textGrid.innerHTML = '<div style="text-align:center;padding:60px;color:#b0a694;">⚠ 加载出错：' + e.message + '，请刷新页面重试。</div>';
    }
  },

  renderCards(batch) {
    this.currentBatch = batch;
    const selectedIds = this.app.state.selectedTexts.map(t => t.id);
    this.textGrid.innerHTML = '';

    for (const text of batch) {
      const isSelected = selectedIds.includes(text.id);
      const card = document.createElement('div');
      card.className = 'text-card' + (isSelected ? ' selected' : '');
      card.dataset.id = text.id;
      card.innerHTML = `
        <div class="card-source">${text.source || ''}</div>
        <div class="card-title">${text.title}</div>
        <span class="card-category">${text.category}</span>
        <div class="card-content">${text.content}</div>
        <button class="card-select-btn ${isSelected ? 'selected' : 'select'}">
          ${isSelected ? '✓ 已选' : '选择'}
        </button>
      `;

      // Random paper publication effects (visual only)
      const paperTypes = ['newsprint', 'magazine', 'letter', 'notebook', 'aged'];
      const randomPaper = paperTypes[Math.floor(Math.random() * paperTypes.length)];
      card.dataset.paper = randomPaper;
      const randomRot = (Math.random() * 1.6 - 0.8).toFixed(1);
      card.style.transform = `rotate(${randomRot}deg)`;
      // Fold mark (all cards have a subtle vertical fold)
      const fold = document.createElement('div');
      fold.className = 'fold-mark';
      card.appendChild(fold);
      // Random ink stamp (50% chance)
      if (Math.random() > 0.5) {
        const stamp = document.createElement('div');
        stamp.className = 'ink-stamp';
        card.appendChild(stamp);
      }

      const btn = card.querySelector('.card-select-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSelect(text, card, btn);
      });
      this.textGrid.appendChild(card);
    }

    this.updateUI();
  },

  toggleSelect(text, card, btn) {
    const idx = this.app.state.selectedTexts.findIndex(t => t.id === text.id);
    if (idx >= 0) {
      this.app.state.selectedTexts.splice(idx, 1);
      card.classList.remove('selected');
      btn.className = 'card-select-btn select';
      btn.textContent = '选择';
    } else {
      this.app.state.selectedTexts.push({...text});
      card.classList.add('selected');
      btn.className = 'card-select-btn selected';
      btn.textContent = '✓ 已选';
    }
    this.updateUI();
  },

  nextBatch() {
    const ageGroup = this.app.state.ageGroup;
    let pool = window.TEXTS.filter(t => t.ageRange.includes(ageGroup));
    pool = [...pool, ...this.customTexts.filter(t => t.ageRange.includes(ageGroup))];

    const batchSize = 9;
    this.app.state.batchIndex = (this.app.state.batchIndex + 1) % Math.max(1, Math.ceil(pool.length / batchSize));
    this.render();
  },

  updateUI() {
    const count = this.app.state.selectedTexts.length;
    this.selectionCount.textContent = `已选 ${count} 篇`;
    this.btnToLevel2.disabled = count === 0;
  },

  /** 添加自定义文本 */
  addCustomText(content) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    let added = 0;
    for (const para of paragraphs) {
      const id = Date.now() + Math.random() * 10000;
      const title = '自定义素材 #' + (this.customTexts.length + 1);
      this.customTexts.push({
        id,
        title,
        source: '自行添加',
        category: '自定义',
        ageRange: ['kid', 'youth', 'open'],
        content: para.trim(),
      });
      added++;
    }
    this.app.toast(added > 0 ? `已添加 ${added} 篇自定义素材` : '请粘贴更长的文本内容（至少 20 字）');
    this.updateUI();
    return added;
  },
};
