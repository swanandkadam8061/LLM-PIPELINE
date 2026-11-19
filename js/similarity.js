/**
 * SENTENCE SIMILARITY LAB MODULE
 * Educational LLM Pipeline Explorer
 * Compares Lexical (Jaccard) vs Semantic (Cosine Vector) Similarity
 */

(function (window) {
  'use strict';

  const SIMILARITY_PRESETS = {
    paraphrase: {
      name: 'Paraphrase (High Semantic, Low Lexical)',
      sentenceA: 'The intelligent neural network analyzed complex datasets with remarkable speed.',
      sentenceB: 'An advanced AI algorithm examined intricate information very rapidly.'
    },
    identical: {
      name: 'High Lexical & Semantic Overlap',
      sentenceA: 'Large language models process natural language tokens through transformer layers.',
      sentenceB: 'Language models process natural language tokens across transformer neural layers.'
    },
    different: {
      name: 'Completely Different Domains',
      sentenceA: 'Quantum physicists observed high-energy cosmic particles colliding near a distant nebula.',
      sentenceB: 'The skilled artisan baker prepared delicious chocolate croissants with organic butter.'
    }
  };

  class SentenceSimilarityLab {
    constructor(embeddingEngine) {
      this.embeddingEngine = embeddingEngine || new window.EmbeddingEngine();
      this.sentenceA = SIMILARITY_PRESETS.paraphrase.sentenceA;
      this.sentenceB = SIMILARITY_PRESETS.paraphrase.sentenceB;
      this.listeners = [];
    }

    onUpdate(fn) {
      this.listeners.push(fn);
    }

    notify() {
      this.listeners.forEach(fn => fn(this.getPublicState()));
    }

    getPublicState() {
      return this.analyze(this.sentenceA, this.sentenceB);
    }

    tokenizeWords(text) {
      if (!text) return [];
      const matches = text.toLowerCase().match(/\b[a-z0-9]+(?:'[a-z0-9]+)?\b/g);
      return matches || [];
    }

    /**
     * Compute comprehensive similarity metrics between two sentences
     */
    analyze(textA, textB) {
      this.sentenceA = textA !== undefined ? textA : this.sentenceA;
      this.sentenceB = textB !== undefined ? textB : this.sentenceB;

      const wordsA = this.tokenizeWords(this.sentenceA);
      const wordsB = this.tokenizeWords(this.sentenceB);

      const setA = new Set(wordsA);
      const setB = new Set(wordsB);

      // Shared words (Intersection)
      const sharedWords = [...setA].filter(w => setB.has(w));
      const sharedSet = new Set(sharedWords);

      // Unique words
      const uniqueA = [...setA].filter(w => !setB.has(w));
      const uniqueB = [...setB].filter(w => !setA.has(w));

      // Union
      const unionSet = new Set([...setA, ...setB]);

      // 1. Jaccard Similarity: |A ∩ B| / |A ∪ B|
      const jaccard = unionSet.size > 0 ? (sharedSet.size / unionSet.size) : 0;

      // 2. Dice Similarity: 2 * |A ∩ B| / (|A| + |B|)
      const dice = (setA.size + setB.size) > 0 ? (2 * sharedSet.size / (setA.size + setB.size)) : 0;

      // 3. Overlap Coefficient: |A ∩ B| / min(|A|, |B|)
      const minSize = Math.min(setA.size, setB.size);
      const overlap = minSize > 0 ? (sharedSet.size / minSize) : 0;

      // 4. Semantic Vector Cosine Similarity
      // Mean pool token embeddings for sentence A
      const vectorsA = wordsA.map(w => this.embeddingEngine.getEmbedding(w));
      const sentenceVectorA = this.embeddingEngine.meanPool(vectorsA, wordsA);

      // Mean pool token embeddings for sentence B
      const vectorsB = wordsB.map(w => this.embeddingEngine.getEmbedding(w));
      const sentenceVectorB = this.embeddingEngine.meanPool(vectorsB, wordsB);

      const cosine = this.embeddingEngine.cosineSimilarity(sentenceVectorA, sentenceVectorB);
      // Normalized to [0, 1] percentage scale: clamp between 0% and 100%
      const cosinePercent = Math.max(0, Math.min(1, cosine));

      // Educational insight generator
      const insight = this.generateEducationalInsight(jaccard, cosine);

      return {
        sentenceA: this.sentenceA,
        sentenceB: this.sentenceB,
        wordsA,
        wordsB,
        setA: Array.from(setA),
        setB: Array.from(setB),
        sharedWords,
        uniqueA,
        uniqueB,
        metrics: {
          jaccard: parseFloat((jaccard * 100).toFixed(1)),
          cosine: parseFloat((cosinePercent * 100).toFixed(1)),
          rawCosine: parseFloat(cosine.toFixed(4)),
          dice: parseFloat((dice * 100).toFixed(1)),
          overlap: parseFloat((overlap * 100).toFixed(1))
        },
        vectorA: sentenceVectorA,
        vectorB: sentenceVectorB,
        insight
      };
    }

    /**
     * Provide educational interpretation explaining lexical vs semantic dynamics
     */
    generateEducationalInsight(jaccard, cosine) {
      if (jaccard < 0.25 && cosine > 0.6) {
        return {
          type: 'paraphrase',
          badge: 'Semantic Paraphrase Detected',
          badgeClass: 'badge-accent',
          title: 'High Semantic, Low Lexical Similarity',
          description: 'These sentences use entirely different vocabularies (low Jaccard similarity), yet convey closely related concepts. Traditional keyword search (BM25) would fail to connect them, but vector embeddings capture their underlying semantic equivalence in latent space!'
        };
      } else if (jaccard > 0.6 && cosine > 0.7) {
        return {
          type: 'overlap',
          badge: 'Strong Lexical & Semantic Match',
          badgeClass: 'badge-success',
          title: 'High Lexical & Semantic Congruence',
          description: 'Both sentences share significant surface vocabulary and their embedding vectors point in nearly identical directions in vector space. Both classical search and neural embeddings agree on high similarity.'
        };
      } else if (jaccard < 0.15 && cosine < 0.4) {
        return {
          type: 'divergent',
          badge: 'Divergent Semantic Domains',
          badgeClass: 'badge-muted',
          title: 'Unrelated Domains',
          description: 'These sentences share virtually no words and represent completely different thematic domains. Their sentence vectors are near orthogonal in vector space, resulting in low cosine similarity.'
        };
      } else {
        return {
          type: 'moderate',
          badge: 'Moderate Conceptual Overlap',
          badgeClass: 'badge-info',
          title: 'Partial Semantic Correlation',
          description: 'The sentences contain overlapping conceptual themes with moderate lexical distinction.'
        };
      }
    }

    getPreset(name) {
      return SIMILARITY_PRESETS[name] || SIMILARITY_PRESETS.paraphrase;
    }
  }

  window.SentenceSimilarityLab = SentenceSimilarityLab;
  window.SIMILARITY_PRESETS = SIMILARITY_PRESETS;
})(window);
