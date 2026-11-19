/**
 * LLM PIPELINE EXPLORER - MAIN CONTROLLER & APPLICATION LOGIC
 * Educational AI Research Laboratory Platform
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // ========================================================
  // 1. GLOBAL STATE & INSTANCES
  // ========================================================
  const vocabBuilder = new window.VocabularyBuilder();
  const tokenizer = new window.InteractiveTokenizer(vocabBuilder);
  const embeddingEngine = new window.EmbeddingEngine();
  const similarityLab = new window.SentenceSimilarityLab(embeddingEngine);
  let visualizer3D = null;
  const playgroundCharts = new window.PlaygroundCharts(embeddingEngine);

  // Selected token state for inspector
  let activeSelectedToken = null;
  let activeMatrixToken = 'computer';

  // ========================================================
  // 2. TOAST NOTIFICATION HELPER
  // ========================================================
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, icon = '⚡') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ========================================================
  // 3. MODULE 1: VOCABULARY BUILDER CONTROLLER
  // ========================================================
  const corpusInput = document.getElementById('corpus-input');
  const btnBuildVocab = document.getElementById('btn-build-vocab');
  const btnVocabClear = document.getElementById('btn-vocab-clear');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnCopyJson = document.getElementById('btn-copy-json');
  const vocabSearchInput = document.getElementById('vocab-search-input');
  const vocabFilterSelect = document.getElementById('vocab-filter-select');
  const vocabTableBody = document.getElementById('vocab-table-body');
  const vocabPaginationInfo = document.getElementById('vocab-pagination-info');
  const btnVocabPrev = document.getElementById('btn-vocab-prev');
  const btnVocabNext = document.getElementById('btn-vocab-next');

  // Load initial preset
  corpusInput.value = vocabBuilder.getPreset('ai').text;
  vocabBuilder.build(corpusInput.value);

  function renderVocabStats(stats) {
    document.getElementById('stat-total-words').textContent = stats.totalWords;
    document.getElementById('stat-vocab-size').textContent = stats.vocabSize;
    document.getElementById('stat-repeated-words').textContent = stats.repeatedWords;
    document.getElementById('stat-ttr').textContent = stats.typeTokenRatio;
    document.getElementById('stat-avg-length').textContent = stats.avgWordLength;
    document.getElementById('stat-vocab-growth').textContent = stats.vocabGrowth + '%';
  }

  function renderVocabTable() {
    const pageData = vocabBuilder.getPagedList();
    vocabTableBody.innerHTML = '';

    if (pageData.items.length === 0) {
      vocabTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching vocabulary entries found.</td></tr>`;
      vocabPaginationInfo.textContent = 'Showing 0 of 0';
      return;
    }

    pageData.items.forEach(item => {
      const tr = document.createElement('tr');
      const badgeClass = item.isSpecial ? 'token-badge special' : 'token-badge';
      
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); color: var(--cyan-primary); font-weight: 600;">#${item.id}</td>
        <td>
          <span class="${badgeClass}">${item.word}</span>
          ${item.isSpecial ? `<span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.5rem;">${item.description || ''}</span>` : ''}
        </td>
        <td style="font-family: var(--font-mono);">${item.freq}</td>
        <td style="font-family: var(--font-mono);">${item.length}</td>
        <td>
          ${!item.isSpecial ? `
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-sm btn-secondary btn-action-view" data-word="${item.word}" title="Inspect vector">Matrix</button>
              <button class="btn btn-sm btn-primary btn-action-3d" data-word="${item.word}" title="Find or add to 3D Space">3D</button>
            </div>
          ` : `<span style="font-size: 0.75rem; color: var(--text-muted);">Special</span>`}
        </td>
      `;
      vocabTableBody.appendChild(tr);
    });

    const start = (pageData.currentPage - 1) * pageData.pageSize + 1;
    const end = Math.min(pageData.currentPage * pageData.pageSize, pageData.totalItems);
    vocabPaginationInfo.textContent = `Showing ${start}-${end} of ${pageData.totalItems} entries`;
  }

  // Bind Vocabulary Table Actions
  vocabTableBody.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.btn-action-view');
    const threedBtn = e.target.closest('.btn-action-3d');

    if (viewBtn) {
      const word = viewBtn.dataset.word;
      activeMatrixToken = word;
      renderMatrixViewer();
      renderVectorInspector(word);
      document.getElementById('module-embeddings').scrollIntoView({ behavior: 'smooth' });
      showToast(`Selected "${word}" in Embedding Matrix Viewer`);
    } else if (threedBtn) {
      const word = threedBtn.dataset.word;
      if (visualizer3D) {
        document.getElementById('module-space3d').scrollIntoView({ behavior: 'smooth' });
        const found = visualizer3D.searchAndFocus(word);
        if (!found) {
          visualizer3D.addCustomWord(word);
          showToast(`Added "${word}" to 3D Space!`, '🌐');
        } else {
          showToast(`Focused on "${word}" in 3D Space`, '🎯');
        }
      }
    }
  });

  // Table sorting
  document.querySelectorAll('#vocab-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      vocabBuilder.setSort(field);
      renderVocabTable();
    });
  });

  // Table search & filter
  vocabSearchInput.addEventListener('input', (e) => {
    vocabBuilder.setSearch(e.target.value);
    renderVocabTable();
  });

  vocabFilterSelect.addEventListener('change', (e) => {
    vocabBuilder.setFilter(e.target.value);
    renderVocabTable();
  });

  // Pagination
  btnVocabPrev.addEventListener('click', () => {
    if (vocabBuilder.currentPage > 1) {
      vocabBuilder.setPage(vocabBuilder.currentPage - 1);
      renderVocabTable();
    }
  });

  btnVocabNext.addEventListener('click', () => {
    const totalPages = Math.ceil(vocabBuilder.getFilteredList().length / vocabBuilder.pageSize);
    if (vocabBuilder.currentPage < totalPages) {
      vocabBuilder.setPage(vocabBuilder.currentPage + 1);
      renderVocabTable();
    }
  });

  // Build button
  btnBuildVocab.addEventListener('click', () => {
    const stats = vocabBuilder.build(corpusInput.value);
    renderVocabStats(stats);
    renderVocabTable();
    tokenizer.initSubwordVocabulary();
    populateComparatorDropdowns();
    renderMatrixViewer();
    showToast(`Extracted ${stats.vocabSize} vocabulary words from corpus!`, '📚');
  });

  btnVocabClear.addEventListener('click', () => {
    corpusInput.value = '';
    const stats = vocabBuilder.build('');
    renderVocabStats(stats);
    renderVocabTable();
    showToast('Corpus cleared');
  });

  // Corpus Presets
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.preset;
      const preset = vocabBuilder.getPreset(key);
      corpusInput.value = preset.text;
      const stats = vocabBuilder.build(preset.text);
      renderVocabStats(stats);
      renderVocabTable();
      tokenizer.initSubwordVocabulary();
      showToast(`Loaded ${preset.title} preset`);
    });
  });

  // JSON Export / Copy
  btnExportJson.addEventListener('click', () => {
    const json = vocabBuilder.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Vocabulary JSON downloaded', '💾');
  });

  btnCopyJson.addEventListener('click', () => {
    const json = vocabBuilder.exportJSON();
    navigator.clipboard.writeText(json).then(() => {
      showToast('Vocabulary JSON copied to clipboard', '📋');
    });
  });

  // Initial render for vocab
  renderVocabStats(vocabBuilder.stats);
  renderVocabTable();

  // ========================================================
  // 4. MODULE 2: INTERACTIVE TOKENIZER CONTROLLER
  // ========================================================
  const tokenizerInput = document.getElementById('tokenizer-input');
  const vocabSizeSlider = document.getElementById('vocab-size-slider');
  const vocabSliderVal = document.getElementById('vocab-slider-val');
  const subwordSliderContainer = document.getElementById('subword-slider-container');
  const chkBos = document.getElementById('chk-bos');
  const chkEos = document.getElementById('chk-eos');
  const tokenStreamOutput = document.getElementById('token-stream-output');

  // Stats
  const tokStatChars = document.getElementById('tok-stat-chars');
  const tokStatTokens = document.getElementById('tok-stat-tokens');
  const tokStatUnique = document.getElementById('tok-stat-unique');
  const tokStatCpt = document.getElementById('tok-stat-cpt');
  const tokStatCompression = document.getElementById('tok-stat-compression');

  // Inspector
  const inspTokenName = document.getElementById('insp-token-name');
  const inspTokenBadge = document.getElementById('insp-token-badge');
  const inspTokenId = document.getElementById('insp-token-id');
  const inspTokenPos = document.getElementById('insp-token-pos');
  const inspTokenLen = document.getElementById('insp-token-len');
  const inspTokenFreq = document.getElementById('insp-token-freq');
  const inspTokenMethod = document.getElementById('insp-token-method');

  // Stages
  const stageTabs = document.querySelectorAll('.stage-tab');
  const stageDisplayTitle = document.getElementById('stage-display-title');
  const stageDisplayDesc = document.getElementById('stage-display-desc');
  const stageDisplayContent = document.getElementById('stage-display-content');
  let currentActiveStage = 1;

  function updateTokenizerUI() {
    tokenizer.includeBOS = chkBos.checked;
    tokenizer.includeEOS = chkEos.checked;
    const tokens = tokenizer.tokenize(tokenizerInput.value);
    const stats = tokenizer.computeStats();

    // Render Stats
    tokStatChars.textContent = stats.totalCharacters;
    tokStatTokens.textContent = stats.totalTokens;
    tokStatUnique.textContent = stats.uniqueTokens;
    tokStatCpt.textContent = stats.charsPerToken;
    tokStatCompression.textContent = stats.compressionRatio + 'x';

    // Render Token Chips Stream
    tokenStreamOutput.innerHTML = '';
    tokens.forEach((t, index) => {
      const chip = document.createElement('div');
      
      // Determine chip class
      let chipClass = 'token-chip ';
      if (t.type === 'special') chipClass += 'token-special';
      else if (t.type === 'punctuation') chipClass += 'token-punct';
      else if (t.type === 'subword-piece') chipClass += 'token-subword-piece';
      else if (t.type === 'subword') chipClass += 'token-subword';
      else chipClass += 'token-word';

      if (activeSelectedToken && activeSelectedToken.index === index) {
        chipClass += ' selected';
      }

      chip.className = chipClass;
      chip.innerHTML = `
        <span>${escapeHtml(t.text)}</span>
        <span class="token-chip-id">#${t.id}</span>
      `;

      chip.addEventListener('click', () => {
        document.querySelectorAll('.token-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        activeSelectedToken = { ...t, index };
        renderTokenInspector(t);
      });

      tokenStreamOutput.appendChild(chip);
    });

    // Auto-select first content token if none selected
    if (!activeSelectedToken && tokens.length > 0) {
      const first = tokens.find(t => t.type !== 'special') || tokens[0];
      activeSelectedToken = { ...first, index: 0 };
      renderTokenInspector(first);
    }

    // Render Pipeline Stage
    renderActivePipelineStage(currentActiveStage);

    // Synchronize Playground charts
    playgroundCharts.update(tokens);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderTokenInspector(token) {
    if (!token) return;
    inspTokenName.textContent = token.text;
    inspTokenBadge.textContent = token.type.toUpperCase();
    inspTokenId.textContent = '#' + token.id;
    inspTokenPos.textContent = `[${token.start} : ${token.end}]`;
    inspTokenLen.textContent = `${token.length} chars`;
    inspTokenFreq.textContent = `${token.freq || 1} occurrence(s)`;
    inspTokenMethod.textContent = token.method.toUpperCase();
  }

  function renderActivePipelineStage(stageNum) {
    const p = tokenizer.pipelineStages;
    if (!p) return;

    stageTabs.forEach(t => {
      t.classList.toggle('active', parseInt(t.dataset.stage) === stageNum);
    });

    currentActiveStage = stageNum;

    if (stageNum === 1) {
      stageDisplayTitle.textContent = p.stage1.name;
      stageDisplayDesc.textContent = p.stage1.description;
      stageDisplayContent.innerHTML = `<span style="color: var(--text-secondary); font-weight: 500;">"${escapeHtml(p.stage1.data)}"</span> <span style="color: var(--text-muted); font-size: 0.8rem;">(length: ${p.stage1.length})</span>`;
    } else if (stageNum === 2) {
      stageDisplayTitle.textContent = p.stage2.name;
      stageDisplayDesc.textContent = p.stage2.description;
      stageDisplayContent.innerHTML = `<span style="color: var(--violet-primary); font-weight: 600;">"${escapeHtml(p.stage2.data)}"</span> ${p.stage2.diff ? '<span class="token-badge" style="margin-left: 0.5rem;">Normalized</span>' : '<span style="color: var(--text-muted); font-size: 0.8rem;">(identical to input)</span>'}`;
    } else if (stageNum === 3) {
      stageDisplayTitle.textContent = p.stage3.name;
      stageDisplayDesc.textContent = p.stage3.description;
      const segs = p.stage3.data.map(s => `<span class="token-badge" style="margin: 0.15rem;">${escapeHtml(s)}</span>`).join(' ');
      stageDisplayContent.innerHTML = `<div>${segs}</div>`;
    } else if (stageNum === 4) {
      stageDisplayTitle.textContent = p.stage4.name;
      stageDisplayDesc.textContent = p.stage4.description;
      const lookups = p.stage4.data.map(item => `
        <span class="token-badge ${item.inVocab ? '' : 'special'}" style="margin: 0.15rem;">
          ${escapeHtml(item.token)} → ${item.inVocab ? `ID:${item.id}` : '<strong style="color: #ef4444;">[UNK]</strong>'}
        </span>
      `).join(' ');
      stageDisplayContent.innerHTML = `<div>${lookups}</div>`;
    } else if (stageNum === 5) {
      stageDisplayTitle.textContent = p.stage5.name;
      stageDisplayDesc.textContent = p.stage5.description;
      const ids = p.stage5.data.join(', ');
      stageDisplayContent.innerHTML = `<span style="color: var(--violet-primary); font-size: 1rem; font-weight: 700;">[${ids}]</span>`;
    } else if (stageNum === 6) {
      stageDisplayTitle.textContent = p.stage6.name;
      stageDisplayDesc.textContent = p.stage6.description;
      const tensorStr = JSON.stringify(p.stage6.tensor);
      stageDisplayContent.innerHTML = `
        <div style="color: var(--mint-primary); font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Tensor: ${tensorStr}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Ready to feed into Embedding Layer input embedding table.</div>
      `;
    }
  }

  // Tokenizer Mode Switcher
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      tokenizer.mode = mode;

      // Toggle vocabulary slider visibility
      subwordSliderContainer.style.display = mode === 'subword' ? 'block' : 'none';
      updateTokenizerUI();
      showToast(`Switched to ${mode.toUpperCase()} tokenization mode`);
    });
  });

  // Slider change
  vocabSizeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    vocabSliderVal.textContent = val + ' tokens';
    tokenizer.vocabSize = val;
    updateTokenizerUI();
  });

  // Checkbox toggles
  chkBos.addEventListener('change', updateTokenizerUI);
  chkEos.addEventListener('change', updateTokenizerUI);

  // Live input update
  tokenizerInput.addEventListener('input', updateTokenizerUI);

  // Example presets
  document.querySelectorAll('[data-tok-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      tokenizerInput.value = btn.dataset.tokPreset;
      updateTokenizerUI();
      showToast('Loaded example text');
    });
  });

  // Stage Stepper tabs
  stageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const stageNum = parseInt(tab.dataset.stage);
      renderActivePipelineStage(stageNum);
    });
  });

  // ========================================================
  // 5. MODULE 3: EMBEDDING MATRIX & COMPARATOR CONTROLLER
  // ========================================================
  const embeddingMatrixTable = document.getElementById('embedding-matrix-table');
  const matrixHeaderRow = document.getElementById('matrix-header-row');
  const embeddingMatrixBody = document.getElementById('embedding-matrix-body');
  const selectedVecWord = document.getElementById('selected-vec-word');
  const vectorDimBars = document.getElementById('vector-dim-bars');

  const compSelect1 = document.getElementById('comparator-select-1');
  const compSelect2 = document.getElementById('comparator-select-2');
  const compStatCosine = document.getElementById('comp-stat-cosine');
  const compStatDot = document.getElementById('comp-stat-dot');
  const compStatEuclid = document.getElementById('comp-stat-euclid');
  const compStatManhattan = document.getElementById('comp-stat-manhattan');

  // Build matrix columns header
  function initMatrixHeader() {
    matrixHeaderRow.innerHTML = `<th>Token</th><th>ID</th>`;
    for (let d = 0; d < 16; d++) {
      const th = document.createElement('th');
      th.textContent = `d${d}`;
      matrixHeaderRow.appendChild(th);
    }
  }

  function renderMatrixViewer() {
    embeddingMatrixBody.innerHTML = '';
    
    // Showcase a curated set of educational tokens + active words
    const sampleTokens = [
      { text: '[PAD]', id: 0 },
      { text: '[UNK]', id: 1 },
      { text: 'computer', id: 100 },
      { text: 'neural', id: 101 },
      { text: 'algorithm', id: 102 },
      { text: 'python', id: 103 },
      { text: 'function', id: 104 },
      { text: 'dog', id: 105 },
      { text: 'cat', id: 106 },
      { text: 'mountain', id: 107 },
      { text: 'ocean', id: 108 },
      { text: 'apple', id: 109 },
      { text: 'pizza', id: 110 },
      { text: 'joy', id: 111 },
      { text: 'sorrow', id: 112 }
    ];

    sampleTokens.forEach(st => {
      const tr = document.createElement('tr');
      const isSelected = st.text.toLowerCase() === activeMatrixToken.toLowerCase();
      if (isSelected) tr.className = 'selected-row';

      const vec = embeddingEngine.getEmbedding(st.text, 16);

      let rowHtml = `
        <td style="font-weight: 700; text-align: left; color: ${isSelected ? 'var(--violet-primary)' : 'var(--text-primary)'};">
          ${st.text}
        </td>
        <td style="color: var(--text-muted); font-family: var(--font-mono);">#${st.id}</td>
      `;

      for (let d = 0; d < 16; d++) {
        const val = vec[d];
        // Diverging soft pastel heat style: positive = soft lavender/violet, negative = soft pink/rose
        let bg = '#FFFFFF';
        let txt = 'var(--text-primary)';
        if (val >= 0) {
          const alpha = Math.min(0.75, Math.abs(val) * 0.7);
          bg = `rgba(121, 87, 232, ${alpha})`;
          if (alpha > 0.45) txt = '#FFFFFF';
        } else {
          const alpha = Math.min(0.65, Math.abs(val) * 0.65);
          bg = `rgba(244, 114, 182, ${alpha})`;
          if (alpha > 0.5) txt = '#FFFFFF';
        }
        rowHtml += `<td style="background: ${bg}; color: ${txt};" title="Dimension ${d}: ${val.toFixed(3)}">${val.toFixed(2)}</td>`;
      }

      tr.innerHTML = rowHtml;
      tr.addEventListener('click', () => {
        activeMatrixToken = st.text;
        renderMatrixViewer();
        renderVectorInspector(st.text);
      });

      embeddingMatrixBody.appendChild(tr);
    });
  }

  function renderVectorInspector(word) {
    selectedVecWord.textContent = word;
    const vec = embeddingEngine.getEmbedding(word, 16);
    vectorDimBars.innerHTML = '';

    vec.forEach((val, d) => {
      const col = document.createElement('div');
      col.className = 'vector-dim-col';
      const pct = Math.abs(val) * 100;
      const color = val >= 0 ? 'var(--violet-primary)' : 'var(--pink-primary)';

      col.innerHTML = `
        <div style="width: 100%; height: ${Math.max(12, pct)}%; background: ${color}; border-radius: 3px;"
             title="Dim d${d} = ${val.toFixed(4)}"></div>
      `;
      vectorDimBars.appendChild(col);
    });
  }

  function populateComparatorDropdowns() {
    const list = [
      'computer', 'server', 'neural', 'algorithm', 'python', 'javascript', 'compiler',
      'dog', 'cat', 'wolf', 'lion', 'mountain', 'ocean', 'forest', 'apple', 'pizza', 'bread',
      'joy', 'love', 'sorrow', 'anger'
    ];

    compSelect1.innerHTML = '';
    compSelect2.innerHTML = '';

    list.forEach(w => {
      const opt1 = document.createElement('option');
      opt1.value = w;
      opt1.textContent = w;
      if (w === 'neural') opt1.selected = true;
      compSelect1.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = w;
      opt2.textContent = w;
      if (w === 'algorithm') opt2.selected = true;
      compSelect2.appendChild(opt2);
    });

    updateComparatorMetrics();
  }

  function updateComparatorMetrics() {
    const wordA = compSelect1.value;
    const wordB = compSelect2.value;

    const vecA = embeddingEngine.getEmbedding(wordA, 16);
    const vecB = embeddingEngine.getEmbedding(wordB, 16);

    const cos = embeddingEngine.cosineSimilarity(vecA, vecB);
    const dot = embeddingEngine.dotProduct(vecA, vecB);
    const euc = embeddingEngine.euclideanDistance(vecA, vecB);
    const man = embeddingEngine.manhattanDistance(vecA, vecB);

    compStatCosine.textContent = cos.toFixed(3);
    compStatDot.textContent = dot.toFixed(3);
    compStatEuclid.textContent = euc.toFixed(3);
    compStatManhattan.textContent = man.toFixed(3);
  }

  compSelect1.addEventListener('change', updateComparatorMetrics);
  compSelect2.addEventListener('change', updateComparatorMetrics);

  initMatrixHeader();
  renderMatrixViewer();
  renderVectorInspector(activeMatrixToken);
  populateComparatorDropdowns();

  // ========================================================
  // 6. MODULE 4: 3D EMBEDDING SPACE CONTROLLER
  // ========================================================
  const node3dWord = document.getElementById('node-3d-word');
  const node3dCluster = document.getElementById('node-3d-cluster');
  const node3dId = document.getElementById('node-3d-id');
  const node3dCoords = document.getElementById('node-3d-coords');
  const node3dNeighbors = document.getElementById('node-3d-neighbors');
  const btnDeleteNode = document.getElementById('btn-delete-node');
  const tooltip3D = document.getElementById('tooltip-3d');
  const spaceSearchInput = document.getElementById('space-search-input');
  const btnSearch3D = document.getElementById('btn-search-3d');
  const spaceAddInput = document.getElementById('space-add-input');
  const btnAdd3D = document.getElementById('btn-add-3d');
  const btnReset3D = document.getElementById('btn-reset-3d');

  const pcaVar1 = document.getElementById('pca-var-1');
  const pcaVar2 = document.getElementById('pca-var-2');
  const pcaVar3 = document.getElementById('pca-var-3');

  try {
    visualizer3D = new window.Visualizer3D('three-canvas-container', embeddingEngine);

    // Callbacks from 3D space
    visualizer3D.onSelectCallback = (data) => {
      if (!data) {
        node3dWord.textContent = 'Select a Point';
        node3dCluster.textContent = '-';
        node3dId.textContent = '-';
        node3dCoords.textContent = '(X: 0, Y: 0, Z: 0)';
        node3dNeighbors.innerHTML = '<li style="color: var(--text-muted); font-size: 0.75rem;">Click a node to calculate nearest semantic neighbors.</li>';
        btnDeleteNode.style.display = 'none';
        return;
      }

      node3dWord.textContent = data.word;
      node3dWord.style.color = data.color || '#fff';
      node3dCluster.textContent = data.clusterName;
      node3dId.textContent = '#' + data.id;
      node3dCoords.textContent = `(X: ${data.coords.x}, Y: ${data.coords.y}, Z: ${data.coords.z})`;
      btnDeleteNode.style.display = 'block';

      // Render top 5 nearest neighbors
      node3dNeighbors.innerHTML = '';
      if (data.nearestNeighbors && data.nearestNeighbors.length > 0) {
        data.nearestNeighbors.forEach(n => {
          const li = document.createElement('li');
          li.className = 'neighbor-item';
          li.innerHTML = `
            <span style="font-weight: 500; cursor: pointer; color: ${n.color};" class="neighbor-click" data-word="${n.word}">
              ${n.word} <span style="font-size: 0.7rem; color: var(--text-muted);">(${n.clusterName})</span>
            </span>
            <span class="token-badge" style="font-size: 0.7rem;">cos: ${n.similarity.toFixed(3)}</span>
          `;
          node3dNeighbors.appendChild(li);
        });
      }
    };

    // Neighbor click in 3D card
    node3dNeighbors.addEventListener('click', (e) => {
      const target = e.target.closest('.neighbor-click');
      if (target && visualizer3D) {
        const word = target.dataset.word;
        visualizer3D.searchAndFocus(word);
      }
    });

    visualizer3D.onHoverCallback = (data, event) => {
      if (!data) {
        tooltip3D.style.display = 'none';
        return;
      }
      tooltip3D.style.display = 'block';
      tooltip3D.style.left = `${event.clientX - visualizer3D.container.getBoundingClientRect().left}px`;
      tooltip3D.style.top = `${event.clientY - visualizer3D.container.getBoundingClientRect().top}px`;
      tooltip3D.innerHTML = `
        <strong style="color: ${data.color};">${data.word}</strong>
        <span style="color: var(--text-muted); font-size: 0.75rem;"> • ${data.clusterName}</span>
      `;
    };

    // Update PCA variance numbers
    if (visualizer3D.lastPcaResult) {
      const ev = visualizer3D.lastPcaResult.explainedVariance;
      pcaVar1.textContent = `${ev[0]}%`;
      pcaVar2.textContent = `${ev[1]}%`;
      pcaVar3.textContent = `${ev[2]}%`;
    }

  } catch (err) {
    console.error('Failed to initialize 3D space:', err);
  }

  // Cluster toggle buttons
  document.querySelectorAll('.cluster-pill-toggle').forEach(pill => {
    pill.addEventListener('click', () => {
      pill.classList.toggle('active');
      const cluster = pill.dataset.cluster;
      const isVisible = pill.classList.contains('active');
      if (visualizer3D) {
        visualizer3D.toggleCluster(cluster, isVisible);
      }
    });
  });

  // 3D Viewport Toolbar toggles
  document.getElementById('btn-toggle-labels').addEventListener('click', function () {
    this.classList.toggle('active');
    visualizer3D.setOption('labels', this.classList.contains('active'));
  });

  document.getElementById('btn-toggle-grid').addEventListener('click', function () {
    this.classList.toggle('active');
    visualizer3D.setOption('grid', this.classList.contains('active'));
  });

  document.getElementById('btn-toggle-axes').addEventListener('click', function () {
    this.classList.toggle('active');
    visualizer3D.setOption('axes', this.classList.contains('active'));
  });

  document.getElementById('btn-toggle-lines').addEventListener('click', function () {
    this.classList.toggle('active');
    visualizer3D.setOption('lines', this.classList.contains('active'));
  });

  document.getElementById('btn-toggle-autorotate').addEventListener('click', function () {
    this.classList.toggle('active');
    visualizer3D.setOption('autoRotate', this.classList.contains('active'));
  });

  // Search in 3D
  btnSearch3D.addEventListener('click', () => {
    const q = spaceSearchInput.value.trim();
    if (!q) return;
    if (visualizer3D) {
      const found = visualizer3D.searchAndFocus(q);
      if (found) {
        showToast(`Located "${q}" in 3D space`, '🎯');
      } else {
        showToast(`"${q}" not currently in 3D space. Click "Add" to insert it!`, '⚠️');
      }
    }
  });

  spaceSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnSearch3D.click();
  });

  // Add custom word to 3D
  btnAdd3D.addEventListener('click', () => {
    const word = spaceAddInput.value.trim();
    if (!word) return;
    if (visualizer3D) {
      const ok = visualizer3D.addCustomWord(word);
      if (ok) {
        showToast(`Added custom word "${word}" to 3D space!`, '✨');
        spaceAddInput.value = '';
      } else {
        showToast(`"${word}" already exists in 3D space`);
      }
    }
  });

  spaceAddInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAdd3D.click();
  });

  // Delete node
  btnDeleteNode.addEventListener('click', () => {
    if (visualizer3D) {
      visualizer3D.removeSelected();
      showToast('Removed node from 3D space');
    }
  });

  // Reset 3D
  btnReset3D.addEventListener('click', () => {
    if (visualizer3D) {
      visualizer3D.resetDefault();
      showToast('3D Vector Space reset to standard semantic clusters', '🔄');
    }
  });

  // ========================================================
  // 7. MODULE 5: SENTENCE SIMILARITY LAB CONTROLLER
  // ========================================================
  const simInputA = document.getElementById('sim-input-a');
  const simInputB = document.getElementById('sim-input-b');
  const simHighlightedA = document.getElementById('sim-highlighted-a');
  const simHighlightedB = document.getElementById('sim-highlighted-b');
  const simMetricJaccard = document.getElementById('sim-metric-jaccard');
  const simMetricCosine = document.getElementById('sim-metric-cosine');
  const barFillJaccard = document.getElementById('bar-fill-jaccard');
  const barFillCosine = document.getElementById('bar-fill-cosine');
  const simSharedCount = document.getElementById('sim-shared-count');
  const simSharedPills = document.getElementById('sim-shared-pills');
  const simUniqueACount = document.getElementById('sim-unique-a-count');
  const simUniqueAPills = document.getElementById('sim-unique-a-pills');
  const simUniqueBCount = document.getElementById('sim-unique-b-count');
  const simUniqueBPills = document.getElementById('sim-unique-b-pills');
  const simInsightBadge = document.getElementById('sim-insight-badge');
  const simInsightTitle = document.getElementById('sim-insight-title');
  const simInsightDesc = document.getElementById('sim-insight-desc');

  function updateSimilarityLab() {
    const res = similarityLab.analyze(simInputA.value, simInputB.value);

    // Update Percentage numbers and progress bars
    simMetricJaccard.textContent = res.metrics.jaccard + '%';
    barFillJaccard.style.width = res.metrics.jaccard + '%';

    simMetricCosine.textContent = res.metrics.cosine + '%';
    barFillCosine.style.width = res.metrics.cosine + '%';

    // Shared & Unique Counts
    simSharedCount.textContent = res.sharedWords.length;
    simUniqueACount.textContent = res.uniqueA.length;
    simUniqueBCount.textContent = res.uniqueB.length;

    // Render Pills
    simSharedPills.innerHTML = res.sharedWords.length > 0 
      ? res.sharedWords.map(w => `<span class="preset-pill hl-shared" style="cursor: default;">${w}</span>`).join('')
      : '<span style="font-size: 0.8rem; color: var(--text-muted);">None</span>';

    simUniqueAPills.innerHTML = res.uniqueA.length > 0
      ? res.uniqueA.map(w => `<span class="preset-pill hl-unique-a" style="cursor: default;">${w}</span>`).join('')
      : '<span style="font-size: 0.8rem; color: var(--text-muted);">None</span>';

    simUniqueBPills.innerHTML = res.uniqueB.length > 0
      ? res.uniqueB.map(w => `<span class="preset-pill hl-unique-b" style="cursor: default;">${w}</span>`).join('')
      : '<span style="font-size: 0.8rem; color: var(--text-muted);">None</span>';

    // Render Highlighted Token Overlays
    simHighlightedA.innerHTML = renderHighlightedTokens(res.wordsA, res.sharedWords, 'hl-unique-a');
    simHighlightedB.innerHTML = renderHighlightedTokens(res.wordsB, res.sharedWords, 'hl-unique-b');

    // Insight card
    simInsightBadge.textContent = res.insight.badge;
    simInsightTitle.textContent = res.insight.title;
    simInsightDesc.textContent = res.insight.description;
  }

  function renderHighlightedTokens(words, sharedList, uniqueClass) {
    const sharedSet = new Set(sharedList);
    return words.map(w => {
      const isShared = sharedSet.has(w.toLowerCase());
      const cls = isShared ? 'hl-word hl-shared' : `hl-word ${uniqueClass}`;
      return `<span class="${cls}">${w}</span>`;
    }).join(' ');
  }

  simInputA.addEventListener('input', updateSimilarityLab);
  simInputB.addEventListener('input', updateSimilarityLab);

  // Similarity presets
  document.querySelectorAll('[data-sim-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sim-preset]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.simPreset;
      const preset = similarityLab.getPreset(key);
      simInputA.value = preset.sentenceA;
      simInputB.value = preset.sentenceB;
      updateSimilarityLab();
      showToast(`Loaded ${preset.name} preset`);
    });
  });

  updateSimilarityLab();

  // ========================================================
  // 8. MODULE 6: PLAYGROUND CONTROLLER
  // ========================================================
  const playgroundInput = document.getElementById('playground-input');
  playgroundCharts.init('chart-token-freq', 'chart-token-pos', 'chart-pca-2d', 'heatmap-container');

  playgroundInput.addEventListener('input', () => {
    const tokens = tokenizer.tokenize(playgroundInput.value);
    playgroundCharts.update(tokens);
  });

  // Initial trigger for tokenizer and playground
  updateTokenizerUI();

  // ========================================================
  // 9. MODULE 7: LEARN THE MATHEMATICS ACCORDION & KATEX
  // ========================================================
  document.querySelectorAll('.math-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.math-card');
      card.classList.toggle('expanded');
    });
  });

  // Render KaTeX formulas if available
  function renderAllMath() {
    if (typeof katex !== 'undefined') {
      document.querySelectorAll('.math-formula-box').forEach(box => {
        const tex = box.getAttribute('data-tex') || box.textContent.trim();
        box.setAttribute('data-tex', tex);
        try {
          box.innerHTML = '';
          katex.render(tex, box, {
            throwOnError: false,
            displayMode: true
          });
        } catch (e) {
          console.warn('KaTeX automatic rendering notice:', e);
        }
      });
    }
  }

  renderAllMath();
  window.addEventListener('load', renderAllMath);

  // ========================================================
  // 10. NAVIGATION SPY
  // ========================================================
  const navLinks = document.querySelectorAll('.nav-link');
  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 100;
    document.querySelectorAll('section[id], header[id]').forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  });

  showToast('LLM Pipeline Explorer Ready for Experimentation!', '⚡');
});
