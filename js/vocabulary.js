/**
 * VOCABULARY BUILDER MODULE
 * Educational LLM Pipeline Explorer
 */

(function (window) {
  'use strict';

  // Preset Corpora for testing and exploration
  const PRESET_CORPORA = {
    ai: {
      title: 'Artificial Intelligence & Neural Networks',
      text: `Deep learning models process natural language by converting words into high-dimensional numerical vectors known as embeddings. Transformers leverage self-attention mechanisms to capture complex contextual relationships across entire sequences. Modern large language models scale these architectures to billions of parameters, demonstrating remarkable reasoning, code generation, and semantic understanding across diverse scientific domains.`
    },
    astronomy: {
      title: 'Cosmic Astronomy & Astrophysics',
      text: `Galaxies drift through the expanding cosmic web, gravitationally bound by enigmatic dark matter halos. Stellar nucleosynthesis within massive dying stars generates the heavy elements essential for planetary geology and organic chemistry. Observations of distant supernovae reveal the accelerating expansion of spacetime driven by dark energy.`
    },
    shakespeare: {
      title: 'Shakespearean Literature (Sonnet 18)',
      text: `Shall I compare thee to a summer's day? Thou art more lovely and more temperate. Rough winds do shake the darling buds of May, and summer's lease hath all too short a date. Sometime too hot the eye of heaven shines, and often is his gold complexion dimmed.`
    },
    engineering: {
      title: 'Distributed Systems & Software Engineering',
      text: `Distributed systems maintain fault tolerance through consensus algorithms like Raft and Paxos. Microservices communicate via asynchronous event buses, streaming queues, and RESTful interfaces. Database sharding and read replicas ensure horizontal scalability under high concurrency workloads.`
    }
  };

  class VocabularyBuilder {
    constructor() {
      this.corpus = '';
      this.tokens = [];
      this.vocabMap = new Map(); // word -> { id, freq, length, isSpecial }
      this.vocabList = [];
      this.sortField = 'freq';
      this.sortAsc = false;
      this.filterType = 'all';
      this.searchQuery = '';
      this.currentPage = 1;
      this.pageSize = 12;

      // Special base tokens reserved by standard LLM tokenizers
      this.specialTokens = [
        { id: 0, word: '[PAD]', freq: 0, length: 5, isSpecial: true, description: 'Padding token for batching' },
        { id: 1, word: '[UNK]', freq: 0, length: 5, isSpecial: true, description: 'Unknown out-of-vocabulary token' },
        { id: 2, word: '[BOS]', freq: 0, length: 5, isSpecial: true, description: 'Beginning-of-sequence delimiter' },
        { id: 3, word: '[EOS]', freq: 0, length: 5, isSpecial: true, description: 'End-of-sequence delimiter' }
      ];

      this.stats = {
        totalWords: 0,
        vocabSize: 0,
        repeatedWords: 0,
        typeTokenRatio: 0,
        avgWordLength: 0,
        vocabGrowth: 0
      };

      this.listeners = [];
    }

    onUpdate(fn) {
      this.listeners.push(fn);
    }

    notify() {
      this.listeners.forEach(fn => fn(this.getPublicState()));
    }

    getPublicState() {
      return {
        vocabMap: this.vocabMap,
        vocabList: this.vocabList,
        stats: this.stats,
        corpus: this.corpus
      };
    }

    /**
     * Clean and split corpus text into standard word tokens
     */
    tokenizeWords(text) {
      if (!text || typeof text !== 'string') return [];
      // Clean text: strip special control chars, split by word boundaries keeping clean words
      const matches = text.toLowerCase().match(/\b[a-z0-9]+(?:'[a-z0-9]+)?\b/g);
      return matches ? matches : [];
    }

    /**
     * Build vocabulary from raw corpus
     */
    build(text) {
      this.corpus = text || '';
      const rawTokens = this.tokenizeWords(this.corpus);
      this.tokens = rawTokens;

      const freqMap = new Map();
      rawTokens.forEach(token => {
        freqMap.set(token, (freqMap.get(token) || 0) + 1);
      });

      // Sort unique words by frequency descending, then alphabetically
      const sortedUniqueWords = Array.from(freqMap.keys()).sort((a, b) => {
        const diff = freqMap.get(b) - freqMap.get(a);
        return diff !== 0 ? diff : a.localeCompare(b);
      });

      this.vocabMap.clear();
      this.vocabList = [];

      // Add special tokens first
      this.specialTokens.forEach(st => {
        this.vocabMap.set(st.word, st);
        this.vocabList.push({ ...st });
      });

      // Assign sequential token IDs starting after special tokens (ID 4+)
      let nextId = this.specialTokens.length;
      sortedUniqueWords.forEach(word => {
        const item = {
          id: nextId++,
          word: word,
          freq: freqMap.get(word),
          length: word.length,
          isSpecial: false
        };
        this.vocabMap.set(word, item);
        this.vocabList.push(item);
      });

      // Calculate statistics
      const totalWords = rawTokens.length;
      const vocabSize = sortedUniqueWords.length;
      const repeatedWords = totalWords - vocabSize;
      const typeTokenRatio = totalWords > 0 ? (vocabSize / totalWords) : 0;
      const totalChars = rawTokens.reduce((acc, w) => acc + w.length, 0);
      const avgWordLength = totalWords > 0 ? (totalChars / totalWords) : 0;
      const vocabGrowth = totalWords > 0 ? ((vocabSize / totalWords) * 100) : 0;

      this.stats = {
        totalWords,
        vocabSize,
        repeatedWords,
        typeTokenRatio: parseFloat(typeTokenRatio.toFixed(3)),
        avgWordLength: parseFloat(avgWordLength.toFixed(2)),
        vocabGrowth: parseFloat(vocabGrowth.toFixed(1))
      };

      this.currentPage = 1;
      this.notify();
      return this.stats;
    }

    /**
     * Get filtered and sorted vocabulary list for the table
     */
    getFilteredList() {
      let list = this.vocabList.slice();

      // Search filter
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        list = list.filter(item => 
          item.word.toLowerCase().includes(q) || item.id.toString() === q
        );
      }

      // Type filter
      if (this.filterType === 'repeated') {
        list = list.filter(item => !item.isSpecial && item.freq > 1);
      } else if (this.filterType === 'unique') {
        list = list.filter(item => !item.isSpecial && item.freq === 1);
      } else if (this.filterType === 'special') {
        list = list.filter(item => item.isSpecial);
      } else if (this.filterType === 'words') {
        list = list.filter(item => !item.isSpecial);
      }

      // Sort
      list.sort((a, b) => {
        let valA = a[this.sortField];
        let valB = b[this.sortField];
        if (typeof valA === 'string') {
          return this.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return this.sortAsc ? valA - valB : valB - valA;
      });

      return list;
    }

    getPagedList() {
      const filtered = this.getFilteredList();
      const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
      if (this.currentPage > totalPages) this.currentPage = totalPages;
      const start = (this.currentPage - 1) * this.pageSize;
      const items = filtered.slice(start, start + this.pageSize);

      return {
        items,
        totalItems: filtered.length,
        totalPages,
        currentPage: this.currentPage,
        pageSize: this.pageSize
      };
    }

    setSort(field) {
      if (this.sortField === field) {
        this.sortAsc = !this.sortAsc;
      } else {
        this.sortField = field;
        this.sortAsc = field === 'word' || field === 'id';
      }
    }

    setFilter(filter) {
      this.filterType = filter;
      this.currentPage = 1;
    }

    setSearch(query) {
      this.searchQuery = (query || '').trim();
      this.currentPage = 1;
    }

    setPage(page) {
      this.currentPage = page;
    }

    exportJSON() {
      const exportData = {
        metadata: {
          generator: 'Interactive LLM Pipeline Explorer - Vocabulary Builder',
          timestamp: new Date().toISOString(),
          statistics: this.stats
        },
        specialTokens: this.specialTokens,
        vocabulary: this.vocabList.filter(item => !item.isSpecial)
      };
      return JSON.stringify(exportData, null, 2);
    }

    getPreset(key) {
      return PRESET_CORPORA[key] || PRESET_CORPORA.ai;
    }
  }

  window.VocabularyBuilder = VocabularyBuilder;
  window.PRESET_CORPORA = PRESET_CORPORA;
})(window);
