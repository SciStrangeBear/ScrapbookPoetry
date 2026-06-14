/**
 * AI 拼贴诗 · 分析点评引擎
 * 词性分类 + 主题识别 + 情绪分析 + 结构化点评
 */
const AIEngine = {
  // 常见动词
  verbs: new Set([
    '在','是','有','看','听','走','跑','飞','说','想','知道','觉得','来','去',
    '到','过','了','着','被','把','让','给','出','进','回','起','落','飘','摇',
    '照亮','闪过','穿过','划过','升起','落下','飘荡','流淌','蔓延','绽放',
    '拥抱','亲吻','抚摸','眺望','倾听','歌唱','跳舞','奔跑','飞翔','闪烁',
    '发光','生长','消失','出现','等待','寻找','遇见','告别','思念','回忆',
    '呼吸','沉睡','苏醒','燃烧','沸腾','融化','凝结','编织','缠绕','摇晃',
    '停留','经过','抵达','逃离','坠落','漂浮','生长','开放','凋零',
  ]),

  // 常见名词
  nouns: new Set([
    '天空','大地','海洋','河流','山川','风','云','雨','雪','雾','光','影',
    '太阳','月亮','星星','银河','宇宙',
    '春天','夏天','秋天','冬天','清晨','黄昏','夜晚','黎明','午后','深夜',
    '梦','记忆','时间','远方','故乡','旅程','方向','秘密','答案',
    '路','桥','窗','门','灯','火','花','草','树','叶','鸟','鱼','虫',
    '声音','颜色','味道','影子','形状','季节','岁月','年华',
    '城市','街道','巷子','站台','港口','灯塔','花园','森林','沙漠','岛屿',
    '眼睛','头发','手指','心跳','背影','翅膀','羽毛','贝壳','星星','云朵',
    '诗','歌','画','书','信','话','字','句子','故事','旋律',
    '阳光','月光','星光','烟火','尘埃','露水','涟漪','波浪','潮汐','海浪',
    '少年','孩子','大人','朋友','路人','旅人','过客','归人','陌生人',
    '手掌','呼吸','眼泪','微笑','沉默','叹息','背影','侧影',
  ]),

  // 常见形容词
  adjectives: new Set([
    '大','小','长','短','高','低','远','近','快','慢','多','少',
    '明亮','昏暗','温暖','寒冷','潮湿','干燥','柔软','坚硬','光滑','粗糙',
    '安静','喧嚣','热闹','寂寞','孤独','热闹','荒凉','繁华','空旷','拥挤',
    '美丽','丑陋','善良','凶狠','温柔','暴躁','快乐','悲伤','幸福','痛苦',
    '遥远','邻近','古老','年轻','新鲜','陈旧','熟悉','陌生','清晰','模糊',
    '甜蜜','苦涩','酸楚','辛辣','平淡','浓烈','轻盈','沉重','简单','复杂',
    '漫长','短暂','永恒','瞬间','蔚蓝','金黄','翠绿','洁白','漆黑','绯红',
    '灿烂','暗淡','优雅','粗犷','精致','凌乱','完整','破碎','寂静','喧闹',
    '缓慢','匆忙','深沉','浅薄','清澈','浑浊','饱满','干瘪',
  ]),

  // 配色词
  colors: new Set(['蔚蓝','金黄','翠绿','洁白','漆黑','绯红','深蓝','浅绿','淡紫','银白','通红','嫩绿','土黄','天蓝','雪白']),

  // 时间词
  timeWords: new Set(['春天','夏天','秋天','冬天','清晨','黄昏','夜晚','黎明','午后','深夜','早晨','中午','傍晚','午夜','春天里','夏天里','秋天里','冬天里','春光里','月光下','阳光下','星光下','晨曦中','暮色中','夜色里','风雨中']),

  // 情绪分类词库
  moodWords: {
    bright: ['阳光','温暖','明亮','春天','花开','灿烂','金黄','微笑','快乐','幸福','绚烂','夏花','星光','黎明','金色','嫩绿','洁白','雪白','绯红'],
    dark: ['黑暗','黄昏','夜晚','暗淡','沉重','孤独','寂寞','悲伤','忧郁','痛苦','泪水','沉默','漆黑','破碎','凋零','荒凉'],
    warm: ['温暖','炉火','拥抱','温柔','甜蜜','柔软','暖','亲切','故乡','家','灯火'],
    cold: ['寒冷','冬天','冰雪','冷','北风','霜','雪','冰','寒冬','凛冽'],
    calm: ['安静','寂静','缓慢','宁静','沉默','柔软','平稳','深','远处','慢','黄昏','月光','清澈'],
    dynamic: ['奔跑','飞翔','燃烧','沸腾','流淌','风','海浪','汹涌','飞','跑','升起','落下','飘','闪烁','绽放'],
  },

  // 主题词库
  themeWords: {
    '自然': ['风','云','雨','雪','天空','大地','海洋','花','草','树','叶','鸟','阳光','月光','山','河','海','森林'],
    '时间': ['春天','夏天','秋天','冬天','清晨','黄昏','夜晚','黎明','时间','岁月','年华','季节','日','年','月'],
    '情感': ['思念','回忆','等待','遇见','告别','温柔','孤独','寂寞','悲伤','快乐','幸福','爱','眼泪','微笑'],
    '旅程': ['路','远方','旅行','方向','站台','港口','旅人','过客','出发','归来','出发','抵达','流浪'],
    '城市': ['城市','街道','巷子','灯火','人群','霓虹','高楼','地铁','便利店'],
    '故乡': ['故乡','家','童年','外婆','炊烟','老屋','巷口','庭院','老家'],
  },

  classify(word) {
    if (this.verbs.has(word)) return 'verb';
    if (this.nouns.has(word)) return 'noun';
    if (this.adjectives.has(word)) return 'adj';
    if (this.colors.has(word)) return 'color';
    if (this.timeWords.has(word)) return 'time';
    if (word.endsWith('的') || word.endsWith('地')) return 'adj';
    if (word.length >= 3) return 'noun';
    if (word.length === 1) return 'func';
    return 'noun';
  },

  /**
   * 点评一首拼贴诗
   * @param {Array} words - [{text, isFunc, ...}]
   * @returns {Object} 点评数据
   */
  reviewPoem(words) {
    if (!words || words.length === 0) {
      return { error: '画布上还没有词语。' };
    }

    const wordTexts = words.map(w => w.text);
    const types = words.map(w => ({ text: w.text, type: this.classify(w.text) }));

    // 基础统计
    const stats = this._buildStats(words, types);

    // 主题识别
    const theme = this._detectTheme(wordTexts);

    // 情绪分析
    const mood = this._analyzeMood(wordTexts);

    // 亮点点评
    const highlights = this._generateHighlights(types, wordTexts);

    // 色彩分析
    const colorWords = types.filter(t => t.type === 'color').map(t => t.text);

    // 综合评语
    const comment = this._generateComment(theme, mood, highlights, stats, colorWords);

    return { stats, theme, mood, highlights, colorWords, comment };
  },

  _buildStats(words, types) {
    const totalWords = words.length;
    const totalChars = words.reduce((s, w) => s + w.text.length, 0);
    const funcWordCount = words.filter(w => w.isFunc).length;
    const verbCount = types.filter(t => t.type === 'verb').length;
    const nounCount = types.filter(t => t.type === 'noun').length;
    const adjCount = types.filter(t => t.type === 'adj').length;
    const colorCount = types.filter(t => t.type === 'color').length;
    return { totalWords, totalChars, funcWordCount, verbCount, nounCount, adjCount, colorCount };
  },

  _detectTheme(wordTexts) {
    const scores = {};
    for (const [theme, keywords] of Object.entries(this.themeWords)) {
      scores[theme] = keywords.filter(k => wordTexts.some(w => w.includes(k))).length;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top = sorted.filter(s => s[1] > 0);
    if (top.length === 0) return '自由';
    if (top.length === 1) return top[0][0];
    return top.slice(0, 2).map(t => t[0]).join('·');
  },

  _analyzeMood(wordTexts) {
    const scores = {};
    for (const [mood, keywords] of Object.entries(this.moodWords)) {
      scores[mood] = keywords.filter(k => wordTexts.some(w => w.includes(k))).length;
    }
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top = sorted.filter(s => s[1] > 0).slice(0, 2);
    if (top.length === 0) return '中性';
    const moodNames = {
      bright: '明亮', dark: '沉郁', warm: '温暖', cold: '冷冽', calm: '宁静', dynamic: '动感'
    };
    return top.map(t => moodNames[t[0]] || t[0]).join(' · ');
  },

  _generateHighlights(types, wordTexts) {
    const highlights = [];

    const verbs = [...new Set(types.filter(t => t.type === 'verb').map(t => t.text))];
    const nouns = [...new Set(types.filter(t => t.type === 'noun').map(t => t.text))];
    const adjs = [...new Set(types.filter(t => t.type === 'adj').map(t => t.text))];
    const colors = [...new Set(types.filter(t => t.type === 'color').map(t => t.text))];

    // 动词点评
    if (verbs.length >= 3) {
      highlights.push(`动词丰富（${verbs.slice(0, 4).join('、')}），句子有流动感，画面是活的`);
    } else if (verbs.length >= 1) {
      highlights.push(`有「${verbs.slice(0, 2).join('」「')}」等动词，给画面注入了动作`);
    } else {
      highlights.push('偏静态，适合营造画面感和氛围，像一幅静物画');
    }

    // 形容词点评
    if (adjs.length >= 2) {
      highlights.push(`形容词选得好（${adjs.slice(0, 3).join('、')}），情绪的基调定得很清楚`);
    } else if (adjs.length === 1) {
      highlights.push(`一个「${adjs[0]}」定下了整首诗的调子`);
    } else {
      highlights.push('形容词不多，语言简练克制');
    }

    // 意象点评
    if (nouns.length >= 4) {
      highlights.push(`意象丰富——${nouns.slice(0, 5).join('、')}等，构建了一个可以走进去的世界`);
    } else if (nouns.length >= 2) {
      highlights.push(`「${nouns.slice(0, 3).join('」「')}」这几个意象放在一起，产生了奇妙的化学反应`);
    }

    // 色彩点评
    if (colors.length >= 2) {
      highlights.push(`色彩感很好！${colors.join('、')}出现在同一首诗中，像一幅调色盘`);
    } else if (colors.length === 1) {
      highlights.push(`一抹「${colors[0]}」让整首诗染上了颜色`);
    }

    // 长短搭配
    const shortCount = wordTexts.filter(w => w.length <= 1).length;
    const longCount = wordTexts.filter(w => w.length >= 4).length;
    if (shortCount >= 2 && longCount >= 2) {
      highlights.push('长短词搭配有节奏感，像呼吸一样自然');
    } else if (shortCount >= 2) {
      highlights.push('多用短词，语言简洁干脆，像俳句一样有力');
    } else if (longCount >= 2) {
      highlights.push('偏长的词给诗句带来一种舒缓的节奏');
    }

    // 虚词使用
    const funcWords = types.filter(t => t.text.length === 1);
    if (funcWords.length >= 3) {
      highlights.push('虚词的运用让句子之间的连接更自然，有口语的温度');
    } else if (funcWords.length >= 1) {
      highlights.push('适当使用了虚词，有助于串联意象');
    }

    return highlights;
  },

  _generateComment(theme, mood, highlights, stats, colorWords) {
    const comments = {
      '自然': [
        '你选的词里有一种对自然的亲近感，仿佛能闻到风穿过树林的味道。',
        '这些意象让人想起山野和天空，有一种开阔的自由感。',
        '你的词在捕捉自然中的细微动静——露水、风声、光影变化。',
      ],
      '时间': [
        '你的选词流露出对时间的敏感，像在捕捉某个即将消逝的瞬间。',
        '这些词像日历上的标注，每一页都藏着一段记忆的碎片。',
        '你在和时间对话，那些关于季节和日子的词里有很深的情绪。',
      ],
      '情感': [
        '这些词有温度，能感受到背后涌动的情感。',
        '你的词像一封没有完全寄出的信，藏着没说出口的话。',
        '情感的浓度很高，每一个词都不是随便选的。',
      ],
      '旅程': [
        '你选的词有一种出发的冲动，像站在路口的人终于迈出了脚步。',
        '这些意象让人想起旅途中的风景和陌生人的面孔。',
        '你的词里有方向感，有风尘仆仆的故事感。',
      ],
      '城市': [
        '你的词里有城市的脉搏——灯火、街道、人群，孤独和热闹并存。',
        '城市在你的词里变成了一个有呼吸的背景。',
      ],
      '故乡': [
        '你的选词有故乡的温度，是对某个地方的深深回望。',
        '故乡是你这些词的底色——即使没有明说，也隐隐透出来。',
      ],
      '自由': [
        '你的选词很自由，不受约束，这正是拼贴诗的魅力所在。',
        '这些词不拘一格，放在一起形成了一种独特的张力。',
        '你的词跳出了固定的主题框架，充满了意外。',
      ],
    };

    const defaultComments = [
      '你的选词放在一起有一种独特的氛围，像一首还没写出来的诗。',
      '这些词之间隐藏着一条叙事线索，等着你去发现。',
      '词的组合让人产生联想，你已经抓住了拼贴诗的乐趣。',
      '每个词都是你亲手挑的，它们在一起就是你的心情素描。',
    ];

    // Pick by theme
    let pool = [];
    for (const [key, val] of Object.entries(comments)) {
      if (theme.includes(key)) {
        pool = val;
        break;
      }
    }
    if (pool.length === 0) {
      pool = defaultComments;
    }

    let comment = pool[Math.floor(Math.random() * pool.length)];

    // Add mood color if applicable
    if (mood && !mood.includes('中性')) {
      const moodAppend = {
        '明亮': '整体氛围是明亮向上的。',
        '沉郁': '有一种淡淡的沉郁感。',
        '温暖': '整体给人温暖的感觉。',
        '冷冽': '透着一点清冷的气息。',
        '宁静': '有一种安静的治愈力。',
        '动感': '充满了动感和生命力。',
      };
      for (const [key, val] of Object.entries(moodAppend)) {
        if (mood.includes(key)) {
          comment += ' ' + val;
          break;
        }
      }
    }

    // Add color flourish if there are colors
    if (colorWords.length >= 2 && !comment.includes('调色盘')) {
      comment += ` ${colorWords.slice(0, 3).join('、')}——这些颜色在你笔下相遇。`;
    }

    return comment;
  },

  // === DeepSeek API（通过 Cloudflare Pages Functions 代理，Key 不暴露给客户端）===

  /** 使用 DeepSeek API 进行 AI 点评 */
  async reviewWithAI(words, sourceTexts) {
    if (!words || words.length === 0) return '画布上还没有词语。';

    const poemText = this._buildPoemText(words);

    const sourceContext = sourceTexts && sourceTexts.length > 0
      ? sourceTexts.map(t =>
          `【${t.title}】${t.source ? '——' + t.source : ''}\n${t.content}`
        ).join('\n\n---\n\n')
      : '（用户未提供原始素材信息）';

    const prompt = `你是一位专注于拼贴诗（collage poetry）的诗歌评审。用户会提供：
1）原始素材片段（可能来自不同文本源）；
2）用户根据这些素材整理、排列、并用虚词（如"的、了、在、与、但、因此、然后"等）连接而成的拼贴诗。
请你从以下维度对用户的拼贴诗进行评价：

**1. 素材选择**：原始素材是否具有异质性或张力？选择是否有意图（而不只是随机）？
**2. 断裂与重组**：碎片之间是否产生了新的意义、意外意象或陌生化效果？
**3. 虚词使用**：虚词是否起到润滑、误导、转折或反讽的作用？是否过度依赖虚词而使拼贴变得"太顺"？
**4. 整体诗意**：拼贴后的文本是否具有诗的美感、情绪或思想冲击力？
**5. 原创性与作者声音**：尽管素材是借来的，拼贴是否形成了独特的语调或结构立场？

请先复述用户给出的拼贴诗，然后分点给出评价，每点后附上具体例证（从用户诗中引用）。最后给出一句总结评语，并指出最成功之处与一处可改进之处。
评价语气：真诚、具体、不捧杀也不贬低，允许实验性。

---

【原始素材片段】

${sourceContext}

---

【用户的拼贴诗】

${poemText}`;

    // 通过同域代理调用 DeepSeek，API Key 保存在服务端
    const response = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`API 请求失败（${response.status}）：${errData.error || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  /** 将画布上的词按位置还原为诗行 */
  _buildPoemText(words) {
    if (!words || words.length === 0) return '';
    const LINE_THRESHOLD = 25;
    const byY = [...words].sort((a, b) => a.y - b.y);
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
    for (const line of lines) line.sort((a, b) => a.x - b.x);
    return lines.map(line => line.map(w => w.text).join(' ')).join('\n');
  },
};
