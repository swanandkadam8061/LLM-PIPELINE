/**
 * EMBEDDING GENERATOR & MATHEMATICAL PCA ENGINE
 * Educational LLM Pipeline Explorer
 */

(function (window) {
  'use strict';

  // Core semantic category profiles for educational deterministic embeddings (16 dimensions)
  // Dimensions represent interpretable latent axes:
  // 0: Animate / Living
  // 1: Technology / Compute / AI
  // 2: Software / Syntax / Code
  // 3: Nature / Cosmic / Physical
  // 4: Food / Culinary / Nourishment
  // 5: Valence / Positive Emotion
  // 6: Valence / Negative Emotion
  // 7: Physical Concreteness
  // 8: Abstract / Mathematical / Science
  // 9: Action / Speed / Dynamics
  // 10: Size / Scale / Magnitude
  // 11: Social / Communication / Language
  // 12: Cognitive / Intelligence / Reasoning
  // 13: Time / Temporal
  // 14: Spatial / Distance
  // 15: Harmonic / Equilibrium

  const SEMANTIC_CLUSTERS = {
    animals: {
      name: 'Animals & Organisms',
      color: '#00B4D8', // Electric Cyan
      words: ['dog', 'cat', 'wolf', 'lion', 'eagle', 'whale', 'elephant', 'bear', 'dolphin', 'hawk', 'bird', 'horse', 'tiger', 'puppy', 'hound'],
      baseProfile: [1.0, -0.2, -0.3, 0.4, -0.3, 0.2, -0.1, 0.7, -0.4, 0.5, 0.2, 0.4, 0.1, 0.0, 0.2, 0.1]
    },
    technology: {
      name: 'Hardware & AI Systems',
      color: '#2979FF', // Royal Electric Blue
      words: [
        'computer', 'server', 'cpu', 'neural', 'algorithm', 'cloud', 'network', 'gpu', 'chip', 'quantum',
        'ai', 'artificial', 'intelligence', 'deep', 'learning', 'model', 'models', 'transformer', 'transformers',
        'data', 'dataset', 'datasets', 'weights', 'tensor', 'layers', 'analyzed', 'examined', 'processing',
        'processed', 'speed', 'rapidly', 'quickly', 'information', 'advanced', 'intelligent', 'intricate', 'complex'
      ],
      baseProfile: [-0.3, 1.0, 0.7, -0.2, -0.3, 0.1, -0.1, 0.6, 0.8, 0.4, 0.3, 0.5, 0.9, 0.2, 0.3, 0.2]
    },
    programming: {
      name: 'Code & Software',
      color: '#7000FF', // Hyper-Violet
      words: ['python', 'javascript', 'function', 'variable', 'compiler', 'rust', 'git', 'loop', 'syntax', 'class', 'code', 'script', 'async', 'method', 'boolean'],
      baseProfile: [-0.4, 0.7, 1.0, -0.3, -0.4, 0.1, -0.1, 0.1, 0.9, 0.5, -0.1, 0.4, 0.8, 0.3, 0.1, 0.5]
    },
    nature: {
      name: 'Nature & Landscape',
      color: '#00E5A3', // Neo-Mint
      words: ['mountain', 'river', 'ocean', 'forest', 'tree', 'sun', 'rain', 'valley', 'flower', 'desert', 'galaxy', 'star', 'stars', 'nebula', 'cosmic', 'space', 'astronomers', 'physics', 'physicists', 'quantum'],
      baseProfile: [0.4, -0.2, -0.3, 1.0, -0.2, 0.3, -0.2, 0.8, -0.3, 0.2, 0.7, 0.1, -0.2, 0.3, 0.7, 0.6]
    },
    food: {
      name: 'Food & Culinary',
      color: '#FF5376', // Sunset Coral
      words: ['apple', 'pizza', 'bread', 'coffee', 'pasta', 'sushi', 'chocolate', 'cheese', 'burger', 'fruit', 'croissant', 'croissants', 'pastry', 'baker', 'baking', 'butter', 'artisan', 'delicious'],
      baseProfile: [-0.1, -0.4, -0.4, -0.2, 1.0, 0.6, -0.1, 0.7, -0.4, 0.1, -0.3, 0.6, -0.2, 0.1, -0.2, 0.3]
    },
    emotions: {
      name: 'Emotions & Psychology',
      color: '#FF2E93', // Hot Pink Neon
      words: ['joy', 'sorrow', 'anger', 'love', 'hope', 'fear', 'serenity', 'excitement', 'pride', 'envy', 'happy', 'sad', 'peaceful', 'delight'],
      baseProfile: [0.3, -0.3, -0.3, 0.1, 0.2, 1.0, 0.3, -0.7, 0.4, 0.4, 0.1, 0.8, 0.6, 0.2, -0.1, 0.3]
    }
  };

  // Common grammatical stop words that should have minimal semantic bias
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after'
  ]);

  class EmbeddingEngine {
    constructor() {
      this.dimension = 16; // Standard educational dimension
      this.cache = new Map();
      this.isEducationalSimulation = true;
    }

    /**
     * Deterministic pseudorandom generator seeded with string hash
     */
    hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    }

    seededRandom(seed) {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    /**
     * Generate or lookup a deterministic embedding vector for any given token
     */
    getEmbedding(token, dim = this.dimension) {
      if (!token) return new Array(dim).fill(0);
      const cleanToken = token.toString().toLowerCase().trim();
      const cacheKey = `${cleanToken}_${dim}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Check if token belongs to one of our predefined semantic clusters
      let matchedCluster = null;
      for (const key in SEMANTIC_CLUSTERS) {
        if (SEMANTIC_CLUSTERS[key].words.includes(cleanToken)) {
          matchedCluster = SEMANTIC_CLUSTERS[key];
          break;
        }
      }

      const vector = new Array(dim);
      let seed = Math.abs(this.hashString(cleanToken));

      if (matchedCluster) {
        // Inherit base profile with subtle individualized perturbation
        for (let i = 0; i < dim; i++) {
          const baseVal = matchedCluster.baseProfile[i % matchedCluster.baseProfile.length];
          const jitter = (this.seededRandom(seed + i * 37) - 0.5) * 0.25;
          vector[i] = Math.max(-1, Math.min(1, baseVal + jitter));
        }
      } else {
        // Special token handling
        if (cleanToken === '[pad]') {
          for (let i = 0; i < dim; i++) vector[i] = 0.0;
        } else if (cleanToken === '[unk]') {
          for (let i = 0; i < dim; i++) vector[i] = (this.seededRandom(1234 + i) - 0.5) * 0.1;
        } else if (cleanToken === '[bos]') {
          for (let i = 0; i < dim; i++) vector[i] = i === 0 ? 0.9 : -0.1;
        } else if (cleanToken === '[eos]') {
          for (let i = 0; i < dim; i++) vector[i] = i === dim - 1 ? 0.9 : -0.1;
        } else {
          // Morphological and n-gram based deterministic embedding
          // Words with similar affixes or lengths will share slight affinities
          const charSum = cleanToken.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          for (let i = 0; i < dim; i++) {
            const raw = (this.seededRandom(seed + i * 43 + charSum % 17) - 0.5) * 1.8;
            vector[i] = Math.max(-1, Math.min(1, raw));
          }
        }
      }

      // L2 Normalize the vector so cosine similarity equals dot product
      const normalized = this.normalize(vector);
      this.cache.set(cacheKey, normalized);
      return normalized;
    }

    /**
     * Compute L2 Euclidean norm
     */
    norm(vec) {
      let sum = 0;
      for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
      }
      return Math.sqrt(sum);
    }

    /**
     * L2 Normalize a vector
     */
    normalize(vec) {
      const mag = this.norm(vec);
      if (mag === 0) return vec.slice();
      return vec.map(val => parseFloat((val / mag).toFixed(4)));
    }

    /**
     * Calculate Dot Product between two vectors
     */
    dotProduct(vecA, vecB) {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let sum = 0;
      for (let i = 0; i < vecA.length; i++) {
        sum += vecA[i] * vecB[i];
      }
      return sum;
    }

    /**
     * Calculate Cosine Similarity
     */
    cosineSimilarity(vecA, vecB) {
      const magA = this.norm(vecA);
      const magB = this.norm(vecB);
      if (magA === 0 || magB === 0) return 0;
      const dot = this.dotProduct(vecA, vecB);
      const sim = dot / (magA * magB);
      return Math.max(-1, Math.min(1, sim));
    }

    /**
     * Calculate Euclidean Distance (L2)
     */
    euclideanDistance(vecA, vecB) {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let sum = 0;
      for (let i = 0; i < vecA.length; i++) {
        const diff = vecA[i] - vecB[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    }

    /**
     * Calculate Manhattan Distance (L1)
     */
    manhattanDistance(vecA, vecB) {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let sum = 0;
      for (let i = 0; i < vecA.length; i++) {
        sum += Math.abs(vecA[i] - vecB[i]);
      }
      return sum;
    }

    /**
     * Mean pooling of a list of token vectors (sentence embedding)
     * Supports content-aware weighting down-weighting function stop words
     */
    meanPool(vectors, words = []) {
      if (!vectors || vectors.length === 0) return new Array(this.dimension).fill(0);
      const dim = vectors[0].length;
      const mean = new Array(dim).fill(0);
      let totalWeight = 0;

      for (let i = 0; i < vectors.length; i++) {
        const word = (words && words[i]) ? words[i].toLowerCase() : '';
        const weight = STOP_WORDS.has(word) ? 0.15 : 1.0;
        totalWeight += weight;
        for (let j = 0; j < dim; j++) {
          mean[j] += vectors[i][j] * weight;
        }
      }

      if (totalWeight > 0) {
        for (let j = 0; j < dim; j++) {
          mean[j] /= totalWeight;
        }
      }

      return this.normalize(mean);
    }

    // ========================================================
    // MATHEMATICAL PRINCIPAL COMPONENT ANALYSIS (PCA)
    // ========================================================

    /**
     * Perform true mathematical PCA projection on high-dimensional vectors
     * @param {Array<Array<number>>} dataMatrix - Array of N vectors, each of dimension D
     * @param {number} targetDimensions - 2 or 3 components
     * @returns {Object} { projections: Array<Array<number>>, explainedVariance: Array<number>, components: Array<Array<number>> }
     */
    computePCA(dataMatrix, targetDimensions = 3) {
      const N = dataMatrix.length;
      if (N < 2) {
        return {
          projections: dataMatrix.map(v => v.slice(0, targetDimensions)),
          explainedVariance: [1.0, 0.0, 0.0],
          components: []
        };
      }

      const D = dataMatrix[0].length;
      const dims = Math.min(targetDimensions, D);

      // Step 1: Compute Mean Vector
      const mean = new Array(D).fill(0);
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < D; j++) {
          mean[j] += dataMatrix[i][j];
        }
      }
      for (let j = 0; j < D; j++) mean[j] /= N;

      // Step 2: Center Data Matrix (Xc = X - mean)
      const Xc = new Array(N);
      for (let i = 0; i < N; i++) {
        Xc[i] = new Array(D);
        for (let j = 0; j < D; j++) {
          Xc[i][j] = dataMatrix[i][j] - mean[j];
        }
      }

      // Step 3: Compute Covariance Matrix (C = Xc^T * Xc / (N - 1))
      const cov = new Array(D);
      for (let i = 0; i < D; i++) {
        cov[i] = new Array(D).fill(0);
      }

      for (let i = 0; i < D; i++) {
        for (let j = i; j < D; j++) {
          let sum = 0;
          for (let k = 0; k < N; k++) {
            sum += Xc[k][i] * Xc[k][j];
          }
          const val = sum / (N - 1);
          cov[i][j] = val;
          cov[j][i] = val;
        }
      }

      // Compute total variance (sum of diagonal)
      let totalVariance = 0;
      for (let i = 0; i < D; i++) {
        totalVariance += cov[i][i];
      }
      if (totalVariance <= 0) totalVariance = 1e-6;

      // Step 4: Extract Eigenvectors using Power Iteration with Hotelling Deflation
      const components = [];
      const eigenvalues = [];
      const covWorking = cov.map(row => row.slice());

      for (let d = 0; d < dims; d++) {
        let b_k = new Array(D);
        // Initial random vector
        for (let j = 0; j < D; j++) b_k[j] = Math.sin((d + 1) * (j + 1));
        b_k = this.normalize(b_k);

        // Power iteration
        let eigenvalue = 0;
        for (let iter = 0; iter < 50; iter++) {
          // Multiply covWorking * b_k
          const b_k1 = new Array(D).fill(0);
          for (let r = 0; r < D; r++) {
            for (let c = 0; c < D; c++) {
              b_k1[r] += covWorking[r][c] * b_k[c];
            }
          }

          const norm = this.norm(b_k1);
          if (norm === 0) break;
          eigenvalue = norm;
          for (let j = 0; j < D; j++) b_k[j] = b_k1[j] / norm;
        }

        components.push(b_k);
        eigenvalues.push(eigenvalue);

        // Deflate covariance matrix: C_new = C - lambda * (v * v^T)
        for (let r = 0; r < D; r++) {
          for (let c = 0; c < D; c++) {
            covWorking[r][c] -= eigenvalue * b_k[r] * b_k[c];
          }
        }
      }

      // Step 5: Project Centered Data onto Components
      const projections = new Array(N);
      for (let i = 0; i < N; i++) {
        projections[i] = new Array(dims);
        for (let d = 0; d < dims; d++) {
          let dot = 0;
          for (let j = 0; j < D; j++) {
            dot += Xc[i][j] * components[d][j];
          }
          projections[i][d] = parseFloat(dot.toFixed(4));
        }
      }

      // Explained variance ratios
      const explainedVariance = eigenvalues.map(val => 
        parseFloat(((val / totalVariance) * 100).toFixed(1))
      );

      return {
        projections,
        explainedVariance,
        components,
        mean
      };
    }

    getSemanticClusters() {
      return SEMANTIC_CLUSTERS;
    }
  }

  window.EmbeddingEngine = EmbeddingEngine;
  window.SEMANTIC_CLUSTERS = SEMANTIC_CLUSTERS;
})(window);
