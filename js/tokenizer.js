/**
 * INTERACTIVE TOKENIZER ENGINE
 * Educational LLM Pipeline Explorer
 * Supports Word-level, Character-level, and Educational Subword (BPE/WordPiece)
 */

(function (window) {
  'use strict';

  // Base morphemes, roots, prefixes, and suffixes for educational subword tokenization
  const COMMON_SUBWORD_BASIS = [
    // Common whole words (high priority)
    'the', 'and', 'to', 'of', 'a', 'in', 'is', 'that', 'for', 'it', 'as', 'was', 'with', 'be', 'by', 'on', 'not', 'he', 'at', 'this',
    'model', 'models', 'token', 'tokens', 'embed', 'embedding', 'embeddings', 'vector', 'vectors', 'learn', 'learning', 'deep', 'data',
    'neural', 'network', 'networks', 'machine', 'language', 'large', 'human', 'process', 'processing', 'text', 'word', 'words',
    'transform', 'transformer', 'transformers', 'attention', 'space', 'system', 'systems', 'compute', 'computer', 'science',
    'artificial', 'intelligence', 'similarity', 'cosine', 'matrix', 'sequence', 'algorithm', 'parameter', 'parameters',
    // High-frequency stems
    'train', 'predict', 'generat', 'reason', 'layer', 'tensor', 'state', 'input', 'output', 'weight', 'graph', 'linear',
    'context', 'distribut', 'reduc', 'dimension', 'cluster', 'point', 'math', 'calcul',
    // Common Prefixes
    'un', 're', 'in', 'dis', 'en', 'non', 'pre', 'sub', 'inter', 'trans', 'super', 'semi', 'anti', 'mid', 'under', 'over', 'auto', 'multi',
    // Common Suffixes (marked with ##)
    '##ing', '##ed', '##tion', '##ation', '##er', '##ers', '##est', '##ly', '##ment', '##able', '##ible', '##ness',
    '##ity', '##ive', '##al', '##ic', '##ical', '##s', '##es', '##ize', '##ised', '##ous', '##ful', '##less', '##ism', '##ist'
  ];

  class InteractiveTokenizer {
    constructor(vocabBuilder) {
      this.vocabBuilder = vocabBuilder;
      this.mode = 'subword'; // 'word', 'char', 'subword'
      this.vocabSize = 80;    // Adjustable vocabulary slider limit (20 to 200+)
      this.includeBOS = true;
      this.includeEOS = true;
      this.inputText = 'Transformers transform natural language into high-dimensional embedding vectors.';
      this.currentTokens = [];
      this.pipelineStages = {};
      this.listeners = [];

      this.initSubwordVocabulary();
    }

    onUpdate(fn) {
      this.listeners.push(fn);
    }

    notify() {
      this.listeners.forEach(fn => fn(this.getPublicState()));
    }

    getPublicState() {
      return {
        mode: this.mode,
        vocabSize: this.vocabSize,
        includeBOS: this.includeBOS,
        includeEOS: this.includeEOS,
        tokens: this.currentTokens,
        pipelineStages: this.pipelineStages,
        stats: this.computeStats()
      };
    }

    /**
     * Build the dynamic subword vocabulary based on the slider limit
     */
    initSubwordVocabulary() {
      // Base special tokens
      const baseSpecial = ['[PAD]', '[UNK]', '[BOS]', '[EOS]'];
      // ASCII printable characters
      const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789.,!?:;\'"()[]{}-_+=/*<>~'.split('');
      
      // Merge basis
      const dynamicList = [...baseSpecial, ...alphabet, ...COMMON_SUBWORD_BASIS];
      
      // Also absorb top words from the vocabulary builder if available
      if (this.vocabBuilder && this.vocabBuilder.vocabList) {
        this.vocabBuilder.vocabList.forEach(v => {
          if (!v.isSpecial && !dynamicList.includes(v.word)) {
            dynamicList.push(v.word);
          }
        });
      }

      this.fullSubwordList = dynamicList;
    }

    /**
     * Get active vocabulary restricted to current slider size
     */
    getActiveSubwordVocab() {
      // Must always contain special tokens and basic alphabet
      const essential = ['[PAD]', '[UNK]', '[BOS]', '[EOS]'];
      const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789.,!?:;\'"()[]{}-_+=/*'.split('');
      
      // Remaining quota goes to subwords/morphemes/words
      const quota = Math.max(0, this.vocabSize - essential.length - alphabet.length);
      const subwordCandidates = COMMON_SUBWORD_BASIS.slice(0, quota);

      // Create indexed vocabulary
      const activeList = [...essential, ...alphabet, ...subwordCandidates];
      const activeMap = new Map();
      activeList.forEach((token, idx) => {
        activeMap.set(token, idx);
      });

      return { list: activeList, map: activeMap };
    }

    /**
     * Normalize input text (Step 2)
     */
    normalize(raw) {
      if (!raw) return '';
      // Normalization: Unicode NFKC, clean whitespace, lowercase for standard educational demonstration
      return raw.normalize('NFKC').replace(/\r\n/g, '\n').trim();
    }

    /**
     * Segment text into tokens based on chosen mode
     */
    tokenize(rawText, modeOverride, vocabSizeOverride) {
      if (rawText !== undefined) this.inputText = rawText;
      if (modeOverride) this.mode = modeOverride;
      if (vocabSizeOverride !== undefined) this.vocabSize = vocabSizeOverride;

      const raw = this.inputText || '';
      
      // STAGE 1: Raw Input Text
      const stage1 = {
        name: 'Step 1: Raw Input Text',
        description: 'Unprocessed string as provided by the user.',
        data: raw,
        length: raw.length
      };

      // STAGE 2: Text Normalization
      const normalized = this.normalize(raw);
      const stage2 = {
        name: 'Step 2: Text Normalization',
        description: 'Whitespace normalization, unicode standard NFKC decomposition.',
        data: normalized,
        diff: raw !== normalized
      };

      // STAGE 3: Token Segmentation
      let segments = [];
      if (this.mode === 'word') {
        segments = this.segmentWordLevel(normalized);
      } else if (this.mode === 'char') {
        segments = this.segmentCharLevel(normalized);
      } else {
        segments = this.segmentSubwordLevel(normalized);
      }

      const stage3 = {
        name: 'Step 3: Token Segmentation',
        description: `Split into discrete syntactic units via ${this.mode.toUpperCase()} tokenization rules.`,
        data: segments.map(s => s.text)
      };

      // STAGE 4: Vocabulary Lookup
      const lookupTokens = this.lookupVocabulary(segments);
      const stage4 = {
        name: 'Step 4: Vocabulary Lookup',
        description: 'Verify each token against the active model dictionary and identify [UNK] tokens.',
        data: lookupTokens.map(t => ({ token: t.text, inVocab: !t.isUnknown, id: t.id }))
      };

      // STAGE 5: Token ID Assignment
      const stage5 = {
        name: 'Step 5: Token ID Assignment',
        description: 'Map each vocabulary unit to its fixed integer coordinate index in the embedding space.',
        data: lookupTokens.map(t => t.id)
      };

      // STAGE 6: Final Sequence
      let finalSequence = [...lookupTokens];
      if (this.includeBOS) {
        finalSequence.unshift({
          text: '[BOS]',
          id: 2,
          start: 0,
          end: 0,
          length: 5,
          type: 'special',
          freq: 1,
          method: this.mode,
          description: 'Beginning of sequence marker'
        });
      }
      if (this.includeEOS) {
        finalSequence.push({
          text: '[EOS]',
          id: 3,
          start: raw.length,
          end: raw.length,
          length: 5,
          type: 'special',
          freq: 1,
          method: this.mode,
          description: 'End of sequence marker'
        });
      }

      const stage6 = {
        name: 'Step 6: Final Tensor Sequence',
        description: 'The finalized numerical array passed into the initial embedding layer.',
        tensor: finalSequence.map(t => t.id),
        tokens: finalSequence
      };

      this.pipelineStages = {
        stage1,
        stage2,
        stage3,
        stage4,
        stage5,
        stage6
      };

      this.currentTokens = finalSequence;
      this.notify();
      return this.currentTokens;
    }

    /**
     * Mode 1: Word-level segmentation
     */
    segmentWordLevel(text) {
      if (!text) return [];
      const tokens = [];
      // Match words or individual punctuation marks
      const regex = /([a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?|[.,!?;:()[\]{}"'—–-]|[\S])/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const str = match[0];
        const isPunct = /^[.,!?;:()[\]{}"'—–-]$/.test(str);
        tokens.push({
          text: str,
          start: match.index,
          end: match.index + str.length,
          length: str.length,
          type: isPunct ? 'punctuation' : 'word',
          method: 'word'
        });
      }
      return tokens;
    }

    /**
     * Mode 2: Character-level segmentation
     */
    segmentCharLevel(text) {
      if (!text) return [];
      const tokens = [];
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        let display = char;
        let type = 'char';
        if (char === ' ') {
          display = '␣';
          type = 'whitespace';
        } else if (/^[.,!?;:()[\]{}"'—–-]$/.test(char)) {
          type = 'punctuation';
        }
        tokens.push({
          text: display,
          rawChar: char,
          start: i,
          end: i + 1,
          length: 1,
          type: type,
          method: 'char'
        });
      }
      return tokens;
    }

    /**
     * Mode 3: Subword (BPE / WordPiece educational simulator)
     */
    segmentSubwordLevel(text) {
      if (!text) return [];
      const { map: vocabMap } = this.getActiveSubwordVocab();
      const tokens = [];
      
      // First split roughly into words and punctuation
      const wordRegex = /([a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?|[^\s\w])/g;
      let match;

      while ((match = wordRegex.exec(text)) !== null) {
        const word = match[0];
        const start = match.index;
        const lower = word.toLowerCase();

        // If punctuation or single symbol
        if (!/^[a-zA-Z0-9]+$/.test(word)) {
          tokens.push({
            text: word,
            start: start,
            end: start + word.length,
            length: word.length,
            type: 'punctuation',
            method: 'subword'
          });
          continue;
        }

        // Check if full word exists in current subword vocabulary
        if (vocabMap.has(lower)) {
          tokens.push({
            text: word,
            start: start,
            end: start + word.length,
            length: word.length,
            type: 'word',
            method: 'subword'
          });
          continue;
        }

        // Subword greedy decomposition (WordPiece style)
        let subTokens = [];
        let isBad = false;
        let curStart = 0;
        const len = lower.length;

        while (curStart < len) {
          let curEnd = len;
          let matchedPiece = null;

          while (curStart < curEnd) {
            let substr = lower.substring(curStart, curEnd);
            if (curStart > 0) {
              substr = '##' + substr;
            }

            if (vocabMap.has(substr)) {
              matchedPiece = substr;
              break;
            }
            curEnd--;
          }

          if (!matchedPiece) {
            // Fallback to single character
            const singleChar = lower[curStart];
            const piece = (curStart > 0 ? '##' : '') + singleChar;
            subTokens.push({
              text: piece,
              start: start + curStart,
              end: start + curStart + 1,
              length: 1,
              type: curStart === 0 ? 'subword' : 'subword-piece',
              method: 'subword'
            });
            curStart += 1;
          } else {
            subTokens.push({
              text: matchedPiece,
              start: start + curStart,
              end: start + curEnd,
              length: curEnd - curStart,
              type: curStart === 0 ? 'subword' : 'subword-piece',
              method: 'subword'
            });
            curStart = curEnd;
          }
        }

        tokens.push(...subTokens);
      }

      return tokens;
    }

    /**
     * Map segments to vocabulary IDs
     */
    lookupVocabulary(segments) {
      const { map: subwordMap } = this.getActiveSubwordVocab();
      const corpusMap = this.vocabBuilder ? this.vocabBuilder.vocabMap : null;

      return segments.map((seg, idx) => {
        let id = -1;
        let isUnknown = false;
        let lower = seg.text.toLowerCase();

        if (this.mode === 'subword') {
          if (subwordMap.has(lower)) {
            id = subwordMap.get(lower);
          } else if (subwordMap.has(seg.text)) {
            id = subwordMap.get(seg.text);
          } else {
            // Assign hash-based deterministic fallback ID or [UNK]
            id = 1; // [UNK]
            isUnknown = true;
          }
        } else if (corpusMap && corpusMap.has(lower)) {
          id = corpusMap.get(lower).id;
        } else if (corpusMap && corpusMap.has(seg.text)) {
          id = corpusMap.get(seg.text).id;
        } else {
          // In word/char mode, if not in vocab builder, assign deterministic ID
          id = this.hashTokenToId(seg.text);
          isUnknown = corpusMap && corpusMap.size > 4; // unknown if corpus has been built
        }

        return {
          ...seg,
          id: id,
          isUnknown: isUnknown,
          freq: corpusMap && corpusMap.has(lower) ? corpusMap.get(lower).freq : 1
        };
      });
    }

    /**
     * Deterministic hash for out-of-vocabulary fallback IDs
     */
    hashTokenToId(str) {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash % 900) + 100; // range 100-999
    }

    /**
     * Compute summary statistics for tokenization
     */
    computeStats() {
      const nonSpecialTokens = this.currentTokens.filter(t => t.type !== 'special');
      const totalTokens = nonSpecialTokens.length;
      const totalChars = nonSpecialTokens.reduce((acc, t) => acc + (t.rawChar ? 1 : t.length), 0);
      const uniqueSet = new Set(nonSpecialTokens.map(t => t.text.toLowerCase()));
      
      const charsPerToken = totalTokens > 0 ? (totalChars / totalTokens) : 0;
      const compressionRatio = totalTokens > 0 ? (totalChars / (totalTokens * 4)) : 0; // standard approx 4 chars/token

      return {
        totalCharacters: totalChars,
        totalTokens: this.currentTokens.length,
        contentTokens: totalTokens,
        uniqueTokens: uniqueSet.size,
        charsPerToken: parseFloat(charsPerToken.toFixed(2)),
        compressionRatio: parseFloat(compressionRatio.toFixed(2))
      };
    }
  }

  window.InteractiveTokenizer = InteractiveTokenizer;
})(window);
