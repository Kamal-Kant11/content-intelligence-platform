# Readability Score and Analysis

This section explains how ContentIQ calculates the readability score, how it finds long sentences and hard words, what the dashboard shows, where the code lives, and how to check everything yourself.

## 1. What the score means

The readability score is a number from 0 to 100. A higher score means the text is easier to read. The score uses the Flesch Reading Ease formula, which depends on two things:

- how long the sentences are (words per sentence), and
- how long the words are (syllables per word).

Short sentences with short words give a high score. Long sentences with long words give a low score.

The score measures sentence and word length only. It does not check meaning, tone, or whether the reader will understand the content.

## 2. The formula

Reading ease:

```
score = 206.835 − 1.015 × (words ÷ sentences) − 84.6 × (syllables ÷ words)
```

The result is limited to the range 0 to 100 and rounded to a whole number.

Grade level (the US school grade needed to understand the text):

```
grade = 0.39 × (words ÷ sentences) + 11.8 × (syllables ÷ words) − 15.59
```

The grade is never below 0 and is shown with one decimal place.

The constants are stored in `backend/src/services/parameters.js` under `READABILITY`.

## 3. How the text is counted

| Item | How it is counted | Code |
| --- | --- | --- |
| Words | Runs of letters or numbers. Apostrophes and hyphens stay inside a word, so "don't" and "well-known" count as one word each. | `WORD_PATTERN` in `parameters.js` |
| Sentences | Text ending in `.`, `!` or `?`. At least one sentence is assumed. | `sentenceSegments()` in `readability.js` |
| Syllables | Estimated from spelling by counting vowel groups, with common endings removed. This is an approximation, not a dictionary lookup. | `countSyllables()` in `readability.js` |

## 4. Score bands

| Score | Label |
| --- | --- |
| 90 and above | Very easy |
| 80 to 89 | Easy |
| 70 to 79 | Fairly easy |
| 60 to 69 | Plain English |
| 50 to 59 | Fairly difficult |
| 30 to 49 | Difficult |
| below 30 | Very difficult |

## 5. The readability checks

The analysis flags two things. Both use thresholds stored in `parameters.js`.

| Check | Rule | Threshold | Constant |
| --- | --- | --- | --- |
| Long sentence | A sentence with more words than the limit | more than 25 words | `longSentenceWords` |
| Hard word | A word with 3 or more syllables | 3 or more syllables | `complexWordSyllables` |

### 5.1 Long sentence
- Each sentence is found with `sentenceSegments()`.
- Its words are counted. If the count is above 25, the whole sentence is flagged.
- The advice shown is: split the sentence where it says "and", "but", "because" or has a semicolon, and keep only the details the reader needs.

### 5.2 Hard word
- Every word in the text is checked with `countSyllables()`.
- If the word has 3 or more syllables, only that word is flagged.
- The advice shown is: replace the word with a shorter, everyday word that means the same thing. The app does not suggest a specific replacement word.

### 5.3 Example output

Input (one line of text with a 34-word sentence):

```
The implementation of comprehensive governance requires extraordinary coordination across many departments, teams, external partners, regional offices, and national agencies, and each group must review every proposal carefully before any final decision can be made.
```

The analysis returns:

- Line 1 score: 0, "Very difficult", grade level 24.4, 34 words.
- One long-sentence issue: "Long sentence (34 words)", covering the whole sentence.
- Eight or more hard-word issues, for example "implementation" (5 syllables), "comprehensive" (4), "governance" (3), "extraordinary" (5), "coordination" (4), "departments" (3), "external" (3), "regional" (3).

Each issue includes the sentence it belongs to, the position of the word or sentence in the line, and the advice text.

### 5.4 Issue data for each flagged item

| Field | Meaning |
| --- | --- |
| `id` | `long-sentence` or `complex-word` |
| `label` | Short name, for example "Long sentence (34 words)" or "Complex word" |
| `start`, `end` | Character positions in the line, used for colouring |
| `word` | The hard word (hard-word issues only) |
| `syllables` | Syllable count of the hard word (hard-word issues only) |
| `sentence` | The full sentence the issue belongs to |
| `sentenceStart`, `sentenceEnd` | Positions of that sentence in the line |
| `advice` | The "What to do" text |

## 6. What the dashboard shows

The analysis page (`frontend/src/pages/AnalysisDashboard.jsx`) shows:

1. **Readability score card:** the score, its label, and the word count.
2. **Counts:** the number of long sentences and the number of hard words.
3. **Readability issues:** one card for each flagged sentence. A sentence that has both a long-sentence issue and hard words shares one card. Each card shows:
   - the line number,
   - the badge "Long sentence (N words)" if it applies,
   - the hard words listed by name,
   - the full sentence, with long sentences in amber and hard words in blue,
   - a "What to do" list with the advice for each issue.

If there are no issues, the page says "No readability issues found."

The page does not show grammar scores or optimized text.

## 7. Where the code is

| Part | File | Function or item |
| --- | --- | --- |
| Constants and thresholds | `backend/src/services/parameters.js` | `READABILITY`, `WORD_PATTERN` |
| Sentence splitting | `backend/src/services/readability.js` | `sentenceSegments()` |
| Syllable count | `backend/src/services/readability.js` | `countSyllables()` |
| Score and grade | `backend/src/services/readability.js` | `checkReadability()` |
| Long sentences and hard words | `backend/src/services/readability.js` | `readabilitySpans()` |
| Per-line and whole-document results | `backend/src/services/lineAnalysis.js` | `analyzeDocumentLines()` |
| API routes | `backend/src/controllers/documentController.js` | `getDocumentScores`, `getDocumentLines` |
| Dashboard | `frontend/src/pages/AnalysisDashboard.jsx` | `AnalysisDashboard`, `ReadabilityIssues`, `IssueCard` |

## 8. How to check it

### In the app
1. Upload a PDF or DOCX, or paste text.
2. Open the document's analysis page.
3. Read the readability score card, the counts, and the "Readability issues" cards.

### Through the API
These endpoints need you to be logged in, like the rest of the app. They are under `/api/documents/:id/`.

- `GET /scores` returns `{ "readability": { ... } }` for the whole document.
- `GET /lines` returns the line-by-line results and the overall readability, including the issues from section 5.4.
- `GET /analysis` returns text statistics such as word count and sentence count.

Use your browser's developer tools (Network tab) on the analysis page to see these responses.

### From the command line
Run this from the `backend` folder. Replace the text with your own, and avoid apostrophes inside it:

```bash
node -e "import('./src/services/readability.js').then(({checkReadability}) => console.log(checkReadability('The implementation of comprehensive governance requires extraordinary coordination across many departments. The cat sat on the mat.')))"
```

Example output for that text:

```json
{"score":9,"label":"Very difficult","gradeLevel":14.1,"words":17,"sentences":2,"wordsPerSentence":8.5,"syllablesPerWord":2.2,"complexWords":6,"longSentences":0}
```

To list the issues for a text instead, use `readabilitySpans` from the same file.

### Automated tests
`backend/tests/qualityScores.test.js` checks the readability score. Run all tests with:

```bash
cd backend
npm test
```

## 9. Limits

- Syllable counts are estimated from spelling, so some words are counted wrongly. For example, "external" and "departments" count as hard words.
- Sentence detection relies on `.`, `!` and `?`. Abbreviations such as "Dr." can split a sentence early.
- The advice for hard words is generic, because the app has no word list to suggest replacements.
- The score measures sentence and word length only.
