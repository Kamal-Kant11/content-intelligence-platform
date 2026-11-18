export const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export const GRAMMAR = {
  penaltyPer100Words: 2,
  minScoredWords: 100,
  examplesPerRule: 3,
};

export const LINE = {
  grammarMinWordsPerLine: 10,
  grammarMinWordsPerDocument: 100,
  minWordsForReadability: 3,
};

export const READABILITY = {
  easeBase: 206.835,
  easePerWordPerSentence: 1.015,
  easePerSyllablePerWord: 84.6,
  gradeWordsPerSentence: 0.39,
  gradeSyllablesPerWord: 11.8,
  gradeBase: 15.59,
  longSentenceWords: 25,
  complexWordSyllables: 3,
  bands: [
    { min: 90, label: 'Very easy' },
    { min: 80, label: 'Easy' },
    { min: 70, label: 'Fairly easy' },
    { min: 60, label: 'Plain English' },
    { min: 50, label: 'Fairly difficult' },
    { min: 30, label: 'Difficult' },
    { min: -Infinity, label: 'Very difficult' },
  ],
};

export const READING_SPEED = {
  wordsPerMinute: 200,
};

export const PDF_LAYOUT = {
  sameLineRatio: 0.5,
  wordGapRatio: 0.2,
};

export const SOUNDS = {
  consonantPrefix: /^(uni|use|usu|eu|one|ou|uti)/i,
  vowelWords: ['hour', 'hours', 'honest', 'honor', 'honour', 'heir'],
};

export const STOPWORDS = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have',
  'with', 'this', 'that', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'your', 'been',
  'were', 'into', 'more', 'some', 'than', 'them', 'then', 'these', 'those', 'also', 'just', 'like', 'such', 'only', 'over', 'very',
];
