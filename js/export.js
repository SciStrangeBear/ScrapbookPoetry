/**
 * 导出模块
 * 四种拼贴风格 + 两种排版模式（自由拼贴/海报排版）+ html2canvas PNG下载
 */
const ExportModule = {
  MODE_FREE: 'free',
  MODE_POSTER: 'poster',

  init(app) {
    this.app = app;
  },

  getActiveMode() {
    const active = document.querySelector('.mode-btn.active');
    return active ? active.dataset.mode : this.MODE_FREE;
  },

  export() {
    const poem = this.getCurrentPoem();
    if (!poem || poem.words.length === 0) {
      this.app.toast('画布上还没有词语，先拖几个词来拼贴吧');
      return;
    }

    if (typeof html2canvas === 'undefined') {
      this.app.toast('导出库加载失败，请检查网络连接后刷新页面');
      return;
    }

    const style = this.app.state.settings.style || 'newspaper';
    const poemIndex = this.app.state.currentPoemIdx;
    const poemNumber = poemIndex + 1;
    const mode = this.getActiveMode();
    this.app.toast(`正在生成${mode === this.MODE_POSTER ? '海报排版' : '自由拼贴'}…`);

    try {
      const exportEl = mode === this.MODE_POSTER
        ? this.buildPosterElement(poem, style)
        : this.buildFreeElement(poem, style);

      document.body.appendChild(exportEl);

      // Move element into viewport for html2canvas compatibility
      exportEl.style.position = 'fixed';
      exportEl.style.top = '0';
      exportEl.style.left = '0';
      exportEl.style.zIndex = '-1000';
      exportEl.style.pointerEvents = 'none';

      // Wait for fonts to load before capturing
      Promise.race([
        document.fonts.ready,
        new Promise(r => setTimeout(r, 2000))
      ]).then(() => {
        // Extra delay for layout to settle
        setTimeout(() => {
          console.log('Export starting, mode:', mode, 'style:', style, 'words:', poem.words.length);
          try {
            html2canvas(exportEl, {
              backgroundColor: null,
              scale: 2,
              useCORS: false,
              logging: false,
            }).then(canvas => {
              console.log('html2canvas succeeded, mode:', mode, 'canvas:', canvas.width, canvas.height);
              const filename = `拼贴诗_${poemNumber}_${style}${mode === this.MODE_POSTER ? '_海报' : ''}.png`;
              this._deliverImage(canvas, filename)
                .then(() => {
                  document.body.removeChild(exportEl);
                })
                .catch(err => {
                  console.error('Deliver image error:', err);
                  this.app.toast('导出完成，但打开图片失败，请重试');
                  try { document.body.removeChild(exportEl); } catch(e) {}
                });
            }).catch(err => {
              console.error('Export error:', err);
              if (err.name === 'SecurityError') {
                this.app.toast('导出失败：画布包含无法读取的内容，请切换导出风格重试');
              } else {
                this.app.toast('导出失败：' + (err.message || '未知错误，可尝试刷新后重试'));
              }
              try { document.body.removeChild(exportEl); } catch(e) {}
            });
          } catch (e) {
            console.error('Export inner error:', e);
            this.app.toast('导出失败：' + (e.message || '未知错误'));
            try { document.body.removeChild(exportEl); } catch(ex) {}
          }
        }, 600);
      });
    } catch (e) {
      console.error('buildPosterElement error:', e);
      this.app.toast('导出出错：' + e.message);
    }
  },

  async _deliverImage(canvas, filename) {
    if (this._isMobileDevice()) {
      const handled = await this._openImageOnMobile(canvas, filename);
      if (handled) return;
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.app.toast('✅ 诗已诞生！');
  },

  _isMobileDevice() {
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  },

  async _openImageOnMobile(canvas, filename) {
    const dataUrl = canvas.toDataURL('image/png');
    const popup = window.open('', '_blank');

    if (popup) {
      popup.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${filename}</title>
  <style>
    html, body {
      margin: 0;
      background: #111;
      color: #f3efe6;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
    }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
    }
    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      text-align: center;
      opacity: 0.88;
    }
    img {
      display: block;
      width: 100%;
      max-width: 540px;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.28);
      background: white;
    }
  </style>
</head>
<body>
  <p>长按图片即可保存到照片</p>
  <img src="${dataUrl}" alt="${filename}">
</body>
</html>`);
      popup.document.close();
      this.app.toast('✅ 已打开图片，可长按保存到照片');
      return true;
    }

    if (navigator.share && typeof File !== 'undefined') {
      const blob = await this._canvasToBlob(canvas);
      if (!blob) return false;
      const file = new File([blob], filename, { type: 'image/png' });
      const shareData = { files: [file], title: filename };

      if (!navigator.canShare || navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          this.app.toast('✅ 已打开系统分享');
          return true;
        } catch (error) {
          if (error && error.name === 'AbortError') {
            this.app.toast('已取消分享');
            return true;
          }
        }
      }
    }

    return true;
  },

  _canvasToBlob(canvas) {
    return new Promise(resolve => {
      if (!canvas.toBlob) {
        resolve(null);
        return;
      }
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  },

  // ===== 自由拼贴（保留用户原始位置） =====
  buildFreeElement(poem, style) {
    const exportEl = this._createBaseElement(style, 1080, 1440);
    this._applyFreeLayout(exportEl, poem, style);
    return exportEl;
  },

  _applyFreeLayout(container, poem, style) {
    const EXPORT_W = 1080;
    const EXPORT_H = 1440;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    const padding = 64;
    const usableW = EXPORT_W - padding * 2;
    const usableH = EXPORT_H - padding * 2;

    for (const w of poem.words) {
      if (w.x < minX) minX = w.x;
      if (w.y < minY) minY = w.y;
      const estW = w.text.length * (w.fontSize || 24) * 0.7;
      if (w.x + estW > maxX) maxX = w.x + estW;
      if (w.y + (w.fontSize || 24) > maxY) maxY = w.y + (w.fontSize || 24);
    }

    const contentW = maxX - minX + 100;
    const contentH = maxY - minY + 100;
    const scale = Math.min(
      contentW > usableW ? usableW / contentW : 1,
      contentH > usableH ? usableH / contentH : 1,
      1
    );
    const offsetX = padding + (usableW - contentW * scale) / 2 - minX * scale;
    const offsetY = padding + (usableH - contentH * scale) / 2 - minY * scale;

    for (const w of poem.words) {
      const wordEl = document.createElement('div');
      const textSpan = document.createElement('span');
      textSpan.className = 'cw-text';
      textSpan.textContent = w.text;
      wordEl.appendChild(textSpan);

      const fs = (w.fontSize || 24) * scale;
      wordEl.style.cssText = `
        position: absolute;
        left: ${w.x * scale + offsetX}px;
        top: ${w.y * scale + offsetY}px;
        transform: rotate(${w.rotation || 0}deg);
        font-size: ${fs}px;
        line-height: 1.2;
        white-space: nowrap;
        padding: 2px 4px;
        letter-spacing: 1px;
        ${w.isFunc ? 'opacity:0.5;font-size:' + (fs * 0.7) + 'px;' : ''}
      `;

      this._applyStyleDecoration(textSpan, wordEl, style, w);
      container.appendChild(wordEl);
    }

    const finalH = Math.max(EXPORT_H, (maxY + 100) * scale + padding * 2);
    container.style.minHeight = finalH + 'px';
  },

  getFreeHeight(poem) {
    if (!poem || poem.words.length === 0) return 720;
    let maxY = 0;
    for (const w of poem.words) {
      if (w.y > maxY) maxY = w.y;
    }
    return Math.max(720, maxY + 200);
  },

  // ===== 海报排版 =====
  buildPosterElement(poem, style) {
    const W = 1080, H = 1440;
    const exportEl = this._createBaseElement(style, W, H);
    exportEl.style.minHeight = H + 'px';
    exportEl.style.padding = '0';

    // Paper grain texture
    const grain = document.createElement('div');
    grain.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; opacity: 0.15;
      background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.006) 2px, rgba(0,0,0,0.006) 3px);
    `;
    exportEl.appendChild(grain);

    // Arrange words in poster layout
    this._applyPosterLayout(exportEl, poem, style);

    // Footer with author
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
    const authorName = (this.app && this.app.state.settings.author) || '匿名';
    const footer = document.createElement('div');
    footer.style.cssText = `
      position: absolute; bottom: 30px; left: 80px; right: 80px;
      text-align: center; font-size: 10px; color: #c0b8a8;
      letter-spacing: 2px;
      font-family: 'ZCOOL XiaoWei','Noto Serif SC','STSong',serif;
      opacity: 0.6;
    `;
    footer.textContent = `拼贴诗 · ${authorName} · ${dateStr}`;
    exportEl.appendChild(footer);

    return exportEl;
  },

  _applyPosterLayout(container, poem, style) {
    const W = 1080, H = 1440;
    const PAD_X = 60;
    const usableW = W - PAD_X * 2;
    const allWords = poem.words;
    if (allWords.length === 0) return;

    // Font sources — Google Fonts + widely-available Chinese fonts
    const fontSources = [
      "'ZCOOL XiaoWei','Noto Serif SC','STSong',serif",
      "'Source Serif 4','Noto Serif SC','Source Han Serif SC',serif",
      "'STKaiti','KaiTi','Noto Serif SC',serif",
    ];

    // Paper tones
    const paperTones = [
      'rgba(255,252,238,0.92)',
      'rgba(252,248,230,0.90)',
      'rgba(248,242,225,0.92)',
      'rgba(255,250,240,0.88)',
    ];

    // Scissor-cut clip paths (inlined from CSS for html2canvas compatibility)
    const CUT_PATHS = [
      'polygon(2% 0%, 98% 1%, 100% 3%, 99% 97%, 97% 100%, 1% 99%, 0% 96%, 0% 3%)',
      'polygon(0% 1%, 97% 0%, 100% 4%, 99% 96%, 96% 100%, 3% 99%, 0% 97%, 1% 2%)',
      'polygon(1% 2%, 99% 0%, 100% 2%, 98% 98%, 100% 100%, 2% 99%, 0% 97%, 2% 1%)',
      'polygon(2% 0%, 98% 2%, 100% 0%, 97% 97%, 100% 100%, 1% 98%, 0% 100%, 3% 2%)',
      'polygon(0% 0%, 100% 1%, 99% 3%, 96% 97%, 100% 100%, 2% 99%, 0% 96%, 3% 3%)',
      'polygon(1% 2%, 99% 0%, 100% 5%, 98% 95%, 100% 99%, 3% 100%, 0% 97%, 2% 3%)',
    ];

    // Assign deterministic styles to each word
    const LINE_THRESHOLD = 25;
    const styled = allWords.map((w, idx) => {
      const seed = typeof w.id === 'string'
        ? w.id.charCodeAt(0) * 31 + (w.id.length || 1)
        : (w.id || idx) * 17;
      const r = (n) => ((seed * 9301 + 49297 * (n + 1)) % 233280) / 233280;

      const len = w.text.length;
      let fs;
      if (len <= 1) fs = 160 + r(0) * 32;    // 160-191
      else if (len <= 2) fs = 110 + r(1) * 24; // 110-133
      else if (len <= 3) fs = 80 + r(2) * 20;  // 80-99
      else fs = 60 + r(3) * 16;                // 60-75
      fs = Math.round(fs);

      const fontIdx = Math.floor(r(4) * fontSources.length);
      const paperIdx = Math.floor(r(5) * paperTones.length);
      const cutIdx = Math.floor(r(6) * 6) + 1;
      const rotation = (r(7) - 0.5) * (w.isFunc ? 0.5 : 1.5);
      const letterSp = fs >= 30 ? 2 : 1;
      const charEst = fs * 1.0 + letterSp;
      const estW = Math.round(len * charEst + 12);
      const estH = Math.round(fs * 1.3);

      return { ...w, fs, fontIdx, paperIdx, cutIdx, rotation, estW, estH, letterSp };
    });

    // === Group words into lines by canvas Y position ===
    // Sort by Y only for clustering, then sort each line by X
    const byY = [...styled].sort((a, b) => a.y - b.y);

    const lines = [];
    let curLine = [byY[0]];
    for (let i = 1; i < byY.length; i++) {
      if (byY[i].y - byY[i - 1].y > LINE_THRESHOLD) {
        lines.push(curLine);
        curLine = [byY[i]];
      } else {
        curLine.push(byY[i]);
      }
    }
    if (curLine.length > 0) lines.push(curLine);

    // Within each line, sort left to right by X
    for (const line of lines) line.sort((a, b) => a.x - b.x);

    // Scale down any line that's too wide
    for (const line of lines) {
      let lineW = line.reduce((s, w) => s + w.estW + 8, 0) - 8;
      if (lineW > usableW) {
        const scale = (usableW / lineW) * 0.95;
        for (const w of line) {
          w.fs = Math.max(12, Math.round(w.fs * scale));
          w.estW = Math.round(w.estW * scale);
          w.estH = Math.round(w.estH * scale);
          w.letterSp = Math.max(0, Math.round(w.letterSp * Math.min(1, scale)));
        }
      }
    }

    // === Detect stanza breaks from canvas Y gaps ===
    const lineHeights = lines.map(line => Math.max(...line.map(w => w.estH)));
    const lineSpacings = [0]; // space above each line
    for (let i = 1; i < lines.length; i++) {
      const prevMaxY = Math.max(...lines[i - 1].map(w => w.y));
      const currMinY = Math.min(...lines[i].map(w => w.y));
      const gap = currMinY - prevMaxY;
      // Large Y gap = stanza break
      lineSpacings.push(gap > LINE_THRESHOLD * 2.5 ? 64 : 36);
    }

    // === Vertical centering ===
    const blockH = lineHeights.reduce((s, h, i) => s + h + lineSpacings[i], 0);
    const topPadding = Math.max(120, (H - blockH) / 2);
    let cursorY = topPadding;

    // === Render lines ===
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const lineW = line.reduce((s, w) => s + w.estW + 8, 0) - 8;
      const lh = lineHeights[li];
      let cursorX = (W - lineW) / 2;

      for (const w of line) {
        const wordEl = document.createElement('div');
        const textSpan = document.createElement('span');
        textSpan.className = 'cw-text';
        textSpan.textContent = w.text;
        wordEl.appendChild(textSpan);

        textSpan.style.clipPath = CUT_PATHS[w.cutIdx - 1];
        textSpan.style.display = 'inline-block';
        textSpan.style.padding = '1px 0';

        wordEl.style.cssText = `
          position: absolute;
          left: ${Math.round(cursorX)}px;
          top: ${Math.round(cursorY + (lh - w.estH) / 2)}px;
          font-size: ${w.fs}px;
          line-height: 1.3;
          white-space: nowrap;
          font-family: ${fontSources[w.fontIdx]};
          transform: rotate(${w.rotation}deg);
          background: ${paperTones[w.paperIdx]};
          padding: 2px 7px;
          letter-spacing: ${w.letterSp}px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
          ${w.isFunc ? 'opacity:0.4;' : ''}
        `;
        this._applyStyleDecoration(textSpan, wordEl, style, w);
        container.appendChild(wordEl);

        cursorX += w.estW + 8;
      }
      cursorY += lh + lineSpacings[li];
    }
  },

  _generateTitle(poem, style) {
    const words = poem.words.filter(w => !w.isFunc);
    if (words.length === 0) return '无题';

    // Pick the longest non-func word as title anchor
    const sorted = [...words].sort((a, b) => b.text.length - a.text.length);
    const anchor = sorted[0].text;
    const prefix = ['关于', '在', '致', '给', ''][Math.floor(Math.random() * 4)];
    const suffix = ['诗', '小记', '随想', '拾光', '散句', '片段', ''][Math.floor(Math.random() * 6)];

    // Try to create a meaningful title from available words
    if (prefix && suffix) return prefix + anchor + suffix;
    if (suffix) return anchor + suffix;
    if (prefix) return prefix + anchor;
    return anchor;
  },

  _addPosterDecorations(container, style) {
    const W = 1080, H = 1440;
    const accent = this._getAccentColor(style);

    // Top-right corner mark
    const tr = document.createElement('div');
    tr.style.cssText = `position:absolute;top:30px;right:30px;width:40px;height:40px;border:1px solid ${accent};opacity:0.2;`;
    container.appendChild(tr);

    // Bottom-left corner mark
    const bl = document.createElement('div');
    bl.style.cssText = `position:absolute;bottom:30px;left:30px;width:40px;height:40px;border:1px solid ${accent};opacity:0.2;`;
    container.appendChild(bl);

    // Horizontal separator above footer
    const sep = document.createElement('div');
    sep.style.cssText = `
      position:absolute;bottom:65px;left:80px;right:80px;
      height:1px;
      background:linear-gradient(to right, transparent, ${accent}, transparent);
      opacity:0.25;
    `;
    container.appendChild(sep);

    // Washi tape — top-left (semi-transparent strip like masking tape)
    const tape = document.createElement('div');
    tape.style.cssText = `
      position:absolute;top:24px;left:100px;width:50px;height:10px;
      background:rgba(180,200,220,0.2);
      transform:rotate(-2deg);
      border-radius:1px;
      opacity:0.6;
    `;
    container.appendChild(tape);

    // Another tape strip — right side
    const tape2 = document.createElement('div');
    tape2.style.cssText = `
      position:absolute;top:55px;right:90px;width:35px;height:8px;
      background:rgba(200,180,160,0.2);
      transform:rotate(3deg);
      border-radius:1px;
      opacity:0.5;
    `;
    container.appendChild(tape2);

    // Subtle "coffee ring" stain at bottom-right
    const stain = document.createElement('div');
    stain.style.cssText = `
      position:absolute;bottom:120px;right:50px;
      width:80px;height:80px;
      border-radius:50%;
      background:radial-gradient(circle, rgba(180,160,130,0.06) 30%, transparent 70%);
      pointer-events:none;
    `;
    container.appendChild(stain);
  },

  _getAccentColor(style) {
    const colors = {
      newspaper: '#c0392b',
      journal: '#d4a76a',
      ink: '#3a3a3a',
      modern: '#888',
    };
    return colors[style] || '#c0392b';
  },

  _createBaseElement(style, w, h) {
    const el = document.createElement('div');
    el.className = `export-canvas export-${style}`;
    el.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${w}px;
      min-height: ${h}px;
      padding: 48px;
      overflow: hidden;
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
    `;

    // Style-specific backgrounds
    if (style === 'newspaper') {
      el.style.background = '#efe6cc';
      el.style.backgroundImage = `
        radial-gradient(ellipse at 20% 40%, rgba(160,140,100,0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 60%, rgba(160,140,100,0.1) 0%, transparent 50%),
        repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(180,160,120,0.05) 40px, rgba(180,160,120,0.05) 41px)
      `;
      el.style.fontFamily = "'Noto Serif SC','STSong','Source Han Serif SC',serif";
    } else if (style === 'journal') {
      el.style.background = '#fffdf3';
      el.style.backgroundImage = `
        linear-gradient(rgba(200,180,160,0.15) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200,180,160,0.15) 1px, transparent 1px)
      `;
      el.style.backgroundSize = '20px 20px';
      el.style.fontFamily = "'ZCOOL XiaoWei','Noto Serif SC','STSong',serif";
    } else if (style === 'ink') {
      el.style.background = '#f5f0e6';
      el.style.backgroundImage = `
        radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.03) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.03) 0%, transparent 50%),
        repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.008) 3px, rgba(0,0,0,0.008) 4px)
      `;
      el.style.fontFamily = "'ZCOOL XiaoWei','STKaiti','KaiTi','Noto Serif SC',serif";
      el.style.color = '#1a1a1a';
    } else if (style === 'modern') {
      el.style.background = '#ffffff';
      el.style.backgroundImage = 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)';
      el.style.fontFamily = "'Source Serif 4','Noto Serif SC','PingFang SC',serif";
      el.style.fontWeight = '300';
      el.style.border = '1px solid #e8e8e8';
    }
    return el;
  },

  _applyStyleDecoration(textSpan, wordEl, style, wordData) {
    if (style === 'newspaper') {
      wordEl.style.filter = 'sepia(0.3)';
      const extraRotate = (Math.random() - 0.5) * 1;
      const currentRotate = wordEl.style.transform;
      if (currentRotate) {
        wordEl.style.transform = currentRotate.replace(/rotate\([^)]+\)/, `rotate(${(wordData.rotation || 0) + extraRotate}deg)`);
      }
    } else if (style === 'journal') {
      textSpan.style.borderBottom = '2px solid #e8c8a0';
      textSpan.style.paddingBottom = '4px';
      textSpan.style.color = '#3a3a3a';
    } else if (style === 'ink') {
      textSpan.style.color = '#1a1a1a';
      textSpan.style.letterSpacing = '3px';
    } else if (style === 'modern') {
      textSpan.style.color = '#555';
      textSpan.style.fontWeight = '300';
      textSpan.style.letterSpacing = '2px';
    }
  },

  getCurrentPoem() {
    return this.app.state.poems[this.app.state.currentPoemIdx] || null;
  },
};
