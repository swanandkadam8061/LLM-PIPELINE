/**
 * 3D EMBEDDING SPACE & DYNAMIC PLAYGROUND VISUALIZATIONS
 * Educational LLM Pipeline Explorer
 * Powered by Three.js (3D Space) and Chart.js (Playground Charts)
 */

(function (window) {
  'use strict';

  class Visualizer3D {
    constructor(containerId, embeddingEngine) {
      this.container = document.getElementById(containerId);
      this.embeddingEngine = embeddingEngine || new window.EmbeddingEngine();

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.pointsGroup = null;
      this.linesGroup = null;
      this.labelsGroup = null;
      this.gridHelper = null;
      this.axesHelper = null;

      this.pointMeshes = []; // { mesh, sprite, data }
      this.selectedPoint = null;
      this.hoveredPoint = null;
      this.activeWords = [];
      this.activeClusters = {
        animals: true,
        technology: true,
        programming: true,
        nature: true,
        food: true,
        emotions: true,
        custom: true
      };

      this.showLabels = true;
      this.showGrid = true;
      this.showAxes = true;
      this.showLines = true;
      this.autoRotate = false;
      this.rotationSpeed = 0.5;

      this.raycaster = null;
      this.mouse = null;
      this.onSelectCallback = null;
      this.onHoverCallback = null;
      this.animationFrameId = null;

      if (this.container) {
        this.init();
      }
    }

    init() {
      if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded. 3D visualization will run in fallback mode.');
        this.renderFallback();
        return;
      }

      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 500;

      // 1. Scene Setup
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf8fafd);
      this.scene.fog = new THREE.FogExp2(0xf8fafd, 0.009);

      // 2. Camera Setup
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.camera.position.set(35, 25, 45);

      // 3. Renderer Setup
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

      // 4. OrbitControls
      if (THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxDistance = 150;
        this.controls.minDistance = 5;
        this.controls.target.set(0, 0, 0);
      }

      // 5. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0x7957e8, 0.65);
      dirLight1.position.set(30, 40, 20);
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x72a7f8, 0.55);
      dirLight2.position.set(-30, -20, -30);
      this.scene.add(dirLight2);

      // 6. Environment Helpers (Grid and Axes)
      this.gridHelper = new THREE.GridHelper(60, 30, 0xd0cde1, 0xe8e6f2);
      this.gridHelper.position.y = -18;
      this.scene.add(this.gridHelper);

      this.axesHelper = new THREE.AxesHelper(18);
      this.scene.add(this.axesHelper);

      // Groups for clean updates
      this.pointsGroup = new THREE.Group();
      this.linesGroup = new THREE.Group();
      this.labelsGroup = new THREE.Group();
      this.scene.add(this.pointsGroup);
      this.scene.add(this.linesGroup);
      this.scene.add(this.labelsGroup);

      // 7. Raycasting for Interaction
      this.raycaster = new THREE.Raycaster();
      this.raycaster.params.Points = { threshold: 1.5 };
      this.mouse = new THREE.Vector2();

      // Event Listeners
      this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
      window.addEventListener('resize', this.onWindowResize.bind(this));

      // Load initial words
      this.loadInitialWords();
      this.rebuildSpace();

      // Start render loop
      this.animate();
    }

    renderFallback() {
      if (!this.container) return;
      this.container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; text-align: center; padding: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">🌐</div>
          <h4 style="color: #f1f5f9; margin-bottom: 0.5rem;">3D Space Loading</h4>
          <p style="max-width: 400px; font-size: 0.875rem;">Initializing Three.js WebGL graphics pipeline. If using offline browser mode, verify CDN connectivity.</p>
        </div>
      `;
    }

    loadInitialWords() {
      const clusters = this.embeddingEngine.getSemanticClusters();
      this.activeWords = [];

      let id = 100;
      for (const key in clusters) {
        const cluster = clusters[key];
        cluster.words.forEach(word => {
          this.activeWords.push({
            word: word,
            clusterKey: key,
            clusterName: cluster.name,
            color: cluster.color,
            id: id++,
            isCustom: false
          });
        });
      }
    }

    rebuildSpace() {
      if (!this.scene) return;

      // Clear existing meshes, lines, and labels
      while (this.pointsGroup.children.length > 0) {
        this.pointsGroup.remove(this.pointsGroup.children[0]);
      }
      while (this.linesGroup.children.length > 0) {
        this.linesGroup.remove(this.linesGroup.children[0]);
      }
      while (this.labelsGroup.children.length > 0) {
        this.labelsGroup.remove(this.labelsGroup.children[0]);
      }
      this.pointMeshes = [];

      // Filter words based on active cluster toggles
      const visibleWords = this.activeWords.filter(w => {
        if (w.isCustom) return this.activeClusters.custom;
        return this.activeClusters[w.clusterKey] !== false;
      });

      if (visibleWords.length === 0) return;

      // Compute Embeddings for all visible words
      const rawVectors = visibleWords.map(w => 
        this.embeddingEngine.getEmbedding(w.word)
      );

      // Perform Mathematical PCA to project from 16D down to 3D
      const pcaResult = this.embeddingEngine.computePCA(rawVectors, 3);
      this.lastPcaResult = pcaResult;

      // Scaling factor to span ~ [-22, 22] in 3D scene
      const scale = 22;

      // Sphere geometry shared across points
      const sphereGeo = new THREE.SphereGeometry(0.75, 24, 24);

      visibleWords.forEach((wordObj, i) => {
        const proj = pcaResult.projections[i];
        const x = proj[0] * scale;
        const y = proj[1] * scale;
        const z = proj[2] * scale;

        // Material with polished bright lacquer finish
        const hexColor = parseInt(wordObj.color.replace('#', '0x'), 16);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: hexColor,
          emissive: hexColor,
          emissiveIntensity: 0.15,
          roughness: 0.22,
          metalness: 0.15
        });

        const mesh = new THREE.Mesh(sphereGeo, sphereMat);
        mesh.position.set(x, y, z);
        mesh.userData = {
          word: wordObj.word,
          clusterName: wordObj.clusterName,
          clusterKey: wordObj.clusterKey,
          color: wordObj.color,
          id: wordObj.id,
          coords: { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)), z: parseFloat(z.toFixed(2)) },
          vector: rawVectors[i],
          index: i
        };

        this.pointsGroup.add(mesh);

        // Modern floating pill badge sprite
        const sprite = this.createTextSprite(wordObj.word, wordObj.color);
        sprite.position.set(x, y + 1.45, z);
        sprite.visible = this.showLabels;
        this.labelsGroup.add(sprite);

        this.pointMeshes.push({ mesh, sprite, data: mesh.userData });
      });

      // Update line connections if a point is already selected
      if (this.selectedPoint) {
        this.highlightNeighbors(this.selectedPoint);
      }
    }

    createTextSprite(text, colorHex) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw rounded pill badge background
      const radius = 18;
      const x = 12, y = 8, w = 232, h = 48;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      // Soft white card with delicate border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.shadowColor = 'rgba(37, 36, 58, 0.12)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fill();

      // Reset shadow for crisp borders
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = colorHex || '#7957E8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Colored cluster indicator dot
      ctx.fillStyle = colorHex || '#7957E8';
      ctx.beginPath();
      ctx.arc(36, 32, 6, 0, Math.PI * 2);
      ctx.fill();

      // Crisp charcoal typography
      ctx.font = 'bold 22px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#25243A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 50, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(4.2, 1.15, 1);
      return sprite;
    }

    onMouseMove(event) {
      if (!this.container || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.pointMeshes.map(pm => pm.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        this.container.style.cursor = 'pointer';

        if (this.hoveredPoint !== hit) {
          if (this.hoveredPoint && this.hoveredPoint !== this.selectedPoint) {
            this.hoveredPoint.scale.set(1, 1, 1);
          }
          this.hoveredPoint = hit;
          if (this.hoveredPoint !== this.selectedPoint) {
            this.hoveredPoint.scale.set(1.4, 1.4, 1.4);
          }
          if (this.onHoverCallback) {
            this.onHoverCallback(hit.userData, event);
          }
        }
      } else {
        this.container.style.cursor = 'default';
        if (this.hoveredPoint) {
          if (this.hoveredPoint !== this.selectedPoint) {
            this.hoveredPoint.scale.set(1, 1, 1);
          }
          this.hoveredPoint = null;
          if (this.onHoverCallback) {
            this.onHoverCallback(null, event);
          }
        }
      }
    }

    onClick(event) {
      if (!this.container || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.pointMeshes.map(pm => pm.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const selected = intersects[0].object;
        this.selectPoint(selected);
      }
    }

    selectPoint(meshOrData) {
      let targetMesh = meshOrData;
      if (!targetMesh.isMesh) {
        // find mesh by word or id
        const found = this.pointMeshes.find(pm => 
          pm.data.word.toLowerCase() === (meshOrData.word || meshOrData).toLowerCase()
        );
        if (found) targetMesh = found.mesh;
        else return;
      }

      // Reset previous selected
      if (this.selectedPoint && this.selectedPoint !== targetMesh) {
        this.selectedPoint.scale.set(1, 1, 1);
        this.selectedPoint.material.emissiveIntensity = 0.35;
      }

      this.selectedPoint = targetMesh;
      this.selectedPoint.scale.set(1.7, 1.7, 1.7);
      this.selectedPoint.material.emissiveIntensity = 0.8;

      // Find nearest neighbors in the 16D embedding space
      const neighbors = this.calculateNearestNeighbors(targetMesh.userData.word, 5);
      targetMesh.userData.nearestNeighbors = neighbors;

      // Render connecting lines to nearest neighbors
      this.highlightNeighbors(targetMesh, neighbors);

      // Trigger callback for UI inspector
      if (this.onSelectCallback) {
        this.onSelectCallback(targetMesh.userData);
      }
    }

    calculateNearestNeighbors(targetWord, k = 5) {
      const targetVec = this.embeddingEngine.getEmbedding(targetWord);
      const scores = [];

      this.pointMeshes.forEach(pm => {
        if (pm.data.word.toLowerCase() !== targetWord.toLowerCase()) {
          const sim = this.embeddingEngine.cosineSimilarity(targetVec, pm.data.vector);
          scores.push({
            word: pm.data.word,
            clusterName: pm.data.clusterName,
            color: pm.data.color,
            similarity: parseFloat(sim.toFixed(4)),
            mesh: pm.mesh
          });
        }
      });

      scores.sort((a, b) => b.similarity - a.similarity);
      return scores.slice(0, k);
    }

    highlightNeighbors(selectedMesh, neighbors) {
      while (this.linesGroup.children.length > 0) {
        this.linesGroup.remove(this.linesGroup.children[0]);
      }

      if (!this.showLines || !neighbors) return;

      const origin = selectedMesh.position;

      neighbors.forEach(n => {
        if (!n.mesh) return;
        const target = n.mesh.position;
        const points = [origin, target];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineDashedMaterial({
          color: 0x7957e8,
          dashSize: 1.0,
          gapSize: 0.5,
          opacity: 0.85,
          transparent: true
        });

        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.linesGroup.add(line);
      });
    }

    addCustomWord(word) {
      if (!word) return false;
      const clean = word.toLowerCase().trim();
      if (this.activeWords.some(w => w.word.toLowerCase() === clean)) {
        return false; // already exists
      }

      const nextId = 500 + this.activeWords.length;
      this.activeWords.push({
        word: clean,
        clusterKey: 'custom',
        clusterName: 'User Added',
        color: '#f43f5e', // Vibrant Rose
        id: nextId,
        isCustom: true
      });

      this.rebuildSpace();
      this.searchAndFocus(clean);
      return true;
    }

    removeSelected() {
      if (!this.selectedPoint) return false;
      const wordToRemove = this.selectedPoint.userData.word;
      this.activeWords = this.activeWords.filter(w => w.word !== wordToRemove);
      this.selectedPoint = null;
      this.rebuildSpace();
      if (this.onSelectCallback) this.onSelectCallback(null);
      return true;
    }

    resetDefault() {
      this.loadInitialWords();
      this.selectedPoint = null;
      this.rebuildSpace();
      if (this.controls) {
        this.controls.reset();
        this.camera.position.set(35, 25, 45);
      }
      if (this.onSelectCallback) this.onSelectCallback(null);
    }

    searchAndFocus(query) {
      if (!query) return null;
      const q = query.toLowerCase().trim();
      const match = this.pointMeshes.find(pm => pm.data.word.toLowerCase() === q);
      if (match) {
        this.selectPoint(match.mesh);
        // Smoothly animate camera toward target
        if (this.controls) {
          const target = match.mesh.position;
          this.controls.target.set(target.x, target.y, target.z);
        }
        return match.data;
      }
      return null;
    }

    toggleCluster(key, visible) {
      this.activeClusters[key] = visible;
      this.rebuildSpace();
    }

    setOption(key, value) {
      if (key === 'labels') {
        this.showLabels = value;
        this.labelsGroup.children.forEach(s => s.visible = value);
      } else if (key === 'grid') {
        this.showGrid = value;
        if (this.gridHelper) this.gridHelper.visible = value;
      } else if (key === 'axes') {
        this.showAxes = value;
        if (this.axesHelper) this.axesHelper.visible = value;
      } else if (key === 'lines') {
        this.showLines = value;
        this.linesGroup.visible = value;
      } else if (key === 'autoRotate') {
        this.autoRotate = value;
      } else if (key === 'rotationSpeed') {
        this.rotationSpeed = parseFloat(value);
      }
    }

    onWindowResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

      if (this.controls) {
        this.controls.update();
      }

      if (this.autoRotate && this.pointsGroup) {
        const delta = 0.003 * this.rotationSpeed;
        this.pointsGroup.rotation.y += delta;
        this.labelsGroup.rotation.y += delta;
        this.linesGroup.rotation.y += delta;
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }

    destroy() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      window.removeEventListener('resize', this.onWindowResize);
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  // ========================================================
  // PLAYGROUND DYNAMIC CHARTS (CHART.JS)
  // ========================================================

  class PlaygroundCharts {
    constructor(embeddingEngine) {
      this.embeddingEngine = embeddingEngine || new window.EmbeddingEngine();
      this.chartFreq = null;
      this.chartPos = null;
      this.chart2DPCA = null;
      this.heatmapContainer = null;
    }

    init(freqCanvasId, posCanvasId, pca2DCanvasId, heatmapId) {
      this.freqCanvas = document.getElementById(freqCanvasId);
      this.posCanvas = document.getElementById(posCanvasId);
      this.pca2DCanvas = document.getElementById(pca2DCanvasId);
      this.heatmapContainer = document.getElementById(heatmapId);
    }

    update(tokens) {
      if (!tokens || tokens.length === 0) return;

      const nonSpecialTokens = tokens.filter(t => t.type !== 'special');
      if (nonSpecialTokens.length === 0) return;

      this.updateFrequencyChart(nonSpecialTokens);
      this.updatePositionChart(nonSpecialTokens);
      this.update2DPCAChart(nonSpecialTokens);
      this.updateSimilarityHeatmap(nonSpecialTokens);
    }

    /**
     * Chart 1: Token Frequency Distribution (Light Theme)
     */
    updateFrequencyChart(tokens) {
      if (!this.freqCanvas || typeof Chart === 'undefined') return;

      const freqMap = {};
      tokens.forEach(t => {
        const key = t.text;
        freqMap[key] = (freqMap[key] || 0) + 1;
      });

      const labels = Object.keys(freqMap);
      const data = Object.values(freqMap);

      if (this.chartFreq) {
        this.chartFreq.destroy();
      }

      const ctx = this.freqCanvas.getContext('2d');
      this.chartFreq = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Token Occurrences',
            data: data,
            backgroundColor: 'rgba(121, 87, 232, 0.85)',
            borderColor: '#7957E8',
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#25243A',
              titleColor: '#FFFFFF',
              bodyColor: '#E9E8F0',
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              ticks: { color: '#5E5D72', font: { family: 'Inter', size: 11, weight: '500' } },
              grid: { color: 'rgba(37, 36, 58, 0.05)' }
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#5E5D72', stepSize: 1, font: { family: 'Inter', size: 11 } },
              grid: { color: 'rgba(37, 36, 58, 0.05)' }
            }
          }
        }
      });
    }

    /**
     * Chart 2: Token Character Position & Length (Light Theme)
     */
    updatePositionChart(tokens) {
      if (!this.posCanvas || typeof Chart === 'undefined') return;

      const labels = tokens.map(t => t.text);
      const lengths = tokens.map(t => t.length);
      const starts = tokens.map(t => t.start);

      if (this.chartPos) {
        this.chartPos.destroy();
      }

      const ctx = this.posCanvas.getContext('2d');
      this.chartPos = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Character Length',
              data: lengths,
              borderColor: '#7957E8',
              backgroundColor: 'rgba(121, 87, 232, 0.08)',
              borderWidth: 2.2,
              fill: true,
              tension: 0.35,
              yAxisID: 'y'
            },
            {
              label: 'Start Index',
              data: starts,
              borderColor: '#3B82F6',
              borderDash: [5, 4],
              borderWidth: 1.8,
              pointRadius: 4,
              pointBackgroundColor: '#FFFFFF',
              pointBorderColor: '#3B82F6',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#25243A', font: { family: 'Inter', size: 11, weight: '600' } }
            },
            tooltip: {
              backgroundColor: '#25243A',
              titleColor: '#FFFFFF',
              bodyColor: '#E9E8F0',
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              ticks: { color: '#5E5D72', font: { family: 'Inter', size: 11 } },
              grid: { color: 'rgba(37, 36, 58, 0.05)' }
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Token Length (chars)', color: '#7957E8', font: { size: 11, weight: '700' } },
              ticks: { color: '#5E5D72' },
              grid: { color: 'rgba(37, 36, 58, 0.05)' }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'Start Index', color: '#3B82F6', font: { size: 11, weight: '700' } },
              ticks: { color: '#5E5D72' },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    }

    /**
     * Chart 3: 2D PCA Projection Scatter Plot (Light Theme)
     */
    update2DPCAChart(tokens) {
      if (!this.pca2DCanvas || typeof Chart === 'undefined') return;

      const uniqueWords = Array.from(new Set(tokens.map(t => t.text.toLowerCase())));
      if (uniqueWords.length < 2) return;

      const vectors = uniqueWords.map(w => this.embeddingEngine.getEmbedding(w));
      const pca = this.embeddingEngine.computePCA(vectors, 2);

      const scatterData = uniqueWords.map((word, i) => ({
        x: pca.projections[i][0],
        y: pca.projections[i][1],
        word: word
      }));

      if (this.chart2DPCA) {
        this.chart2DPCA.destroy();
      }

      const ctx = this.pca2DCanvas.getContext('2d');
      this.chart2DPCA = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: '2D PCA Projection',
            data: scatterData,
            backgroundColor: '#7957E8',
            borderColor: '#FFFFFF',
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const item = ctx.raw;
                  return `${item.word} (PC1: ${item.x.toFixed(2)}, PC2: ${item.y.toFixed(2)})`;
                }
              },
              backgroundColor: '#25243A',
              titleColor: '#FFFFFF',
              bodyColor: '#E9E8F0',
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              title: { display: true, text: `PC 1 (${pca.explainedVariance[0]}% var)`, color: '#5E5D72', font: { size: 11, weight: '600' } },
              ticks: { color: '#5E5D72' },
              grid: { color: 'rgba(37, 36, 58, 0.05)' }
            },
            y: {
              title: { display: true, text: `PC 2 (${pca.explainedVariance[1]}% var)`, color: '#5E5D72', font: { size: 11, weight: '600' } },
              ticks: { color: '#5E5D72' },
              grid: { color: 'rgba(37, 36, 58, 0.05)' }
            }
          }
        }
      });
    }

    /**
     * Chart 4: Interactive Token-to-Token Cross-Attention / Similarity Heatmap (Light Theme)
     */
    updateSimilarityHeatmap(tokens) {
      if (!this.heatmapContainer) return;

      const displayTokens = tokens.slice(0, 12);
      const N = displayTokens.length;

      const vectors = displayTokens.map(t => this.embeddingEngine.getEmbedding(t.text));

      const matrix = [];
      for (let i = 0; i < N; i++) {
        matrix[i] = [];
        for (let j = 0; j < N; j++) {
          const sim = this.embeddingEngine.cosineSimilarity(vectors[i], vectors[j]);
          matrix[i][j] = sim;
        }
      }

      let html = '<div class="heatmap-table-wrapper"><table class="heatmap-matrix">';
      
      // Header row
      html += '<thead><tr><th></th>';
      displayTokens.forEach((t, j) => {
        html += `<th title="${t.text}">${t.text.length > 7 ? t.text.substring(0, 6) + '..' : t.text}</th>`;
      });
      html += '</tr></thead><tbody>';

      // Rows
      displayTokens.forEach((rowToken, i) => {
        html += `<tr><th>${rowToken.text.length > 7 ? rowToken.text.substring(0, 6) + '..' : rowToken.text}</th>`;
        displayTokens.forEach((colToken, j) => {
          const sim = matrix[i][j];
          
          // Color interpolate from soft lavender to rich violet
          let bg = '#FFFFFF';
          let textColor = '#25243A';

          if (sim >= 0.75) {
            bg = 'rgba(121, 87, 232, 0.9)';
            textColor = '#FFFFFF';
          } else if (sim >= 0.5) {
            bg = 'rgba(121, 87, 232, 0.55)';
            textColor = '#FFFFFF';
          } else if (sim >= 0.25) {
            bg = 'rgba(121, 87, 232, 0.25)';
            textColor = '#25243A';
          } else if (sim >= 0.0) {
            bg = 'rgba(243, 240, 255, 0.65)';
            textColor = '#25243A';
          } else {
            bg = 'rgba(254, 242, 242, 0.7)';
            textColor = '#991B1B';
          }

          html += `
            <td class="heatmap-cell" style="background: ${bg}; color: ${textColor};" 
                data-row="${rowToken.text}" 
                data-col="${colToken.text}" 
                data-sim="${sim.toFixed(3)}"
                title="${rowToken.text} ↔ ${colToken.text}: Cosine Sim ${sim.toFixed(3)}">
              ${sim.toFixed(2)}
            </td>
          `;
        });
        html += '</tr>';
      });

      html += '</tbody></table></div>';
      this.heatmapContainer.innerHTML = html;
    }
  }

  window.Visualizer3D = Visualizer3D;
  window.PlaygroundCharts = PlaygroundCharts;
})(window);
