# Local models: how they work and how to train them

The platform does **not** call any external AI API (no OpenAI, no Gemini). The intelligence is split into:

| Part | Where | Trained? |
| --- | --- | --- |
| Grammar, readability, structure, vocabulary, scoring | `src/intelligence/content_quality`, `src/intelligence/scoring` | No. Deterministic rules (fast, exact, explainable) |
| **Tone model** (formal / conversational / promotional / technical) | `ml/models/tone.json` | **Yes**, from `ml/data/tone.jsonl` |
| **Claim model** (claim / not_claim) | `ml/models/claim.json` | **Yes**, from `ml/data/claim.jsonl` |
| Brand learning (voice, sentence style, vocabulary, key terms) | `src/intelligence/brand/extraction.js` | Learns per brand from that brand's sources when you select **Learn** |
| Rewriting (optimization) | `src/intelligence/rewrite/rewriter.js` | No. Applies the exact fixes attached to findings |

## The algorithm

`src/ml/naiveBayes.js` is a multinomial Naive Bayes text classifier written from scratch:

1. **Features**: lowercased words, pairs of neighbouring words (bigrams), numbers collapsed to `<num>`, and `% ! ? $` kept as tokens.
2. **Training**: count how often each feature appears under each label.
3. **Prediction**: score each label with `log P(label) + Σ log P(feature | label)` (Laplace smoothing `alpha`), then softmax to probabilities. Raw Naive Bayes is over-confident on long texts, so scores are divided by `√(number of features)` first.
4. The trained model is saved as plain JSON and loaded when the API starts (`src/services/modelService.js`).

It trains in milliseconds, needs no GPU and no native dependencies, and every prediction can be explained by the counts.

## Train

```bash
cd backend
npm run train                 # train every model
npm run train -- tone         # train one model
npm run train -- tone --folds 10 --alpha 0.5 --ngram 1
```

Output:

```
=== tone: 100 examples, 5-fold cross-validation
accuracy 0.85   macro-F1 0.851
label           precision  recall  f1     support
conversational  0.815      0.88    0.846  25
...
confusion (rows = actual, columns = predicted)
saved ml/models/tone.json (version 20261022T172205)
```

- **Cross-validation** first: the data is split into k folds, and each fold is predicted by a model trained on the others. These numbers show how the model does on text it has **not** seen.
- The final model is then trained on **all** examples and saved with its metrics, dataset size and version.
- **Restart the API** to load the new model. The model version is part of the analysis cache key, so old cached analyses are not reused.
- The **Models** page in the app (or `GET /api/health/models`) shows what is loaded.

## Improve the models with your own data

Add lines to `ml/data/<model>.jsonl`, one JSON object per line:

```jsonl
{"text": "Thanks for sticking with us, here's what changed.", "label": "conversational"}
{"text": "The endpoint returns HTTP 409 when the review is still pending.", "label": "technical"}
```

Guidelines:

- **Use real text from your company.** The seed data is generic. 50–200 examples per label from your own blogs, emails and docs will help more than anything else.
- **Keep labels balanced.** Roughly the same number of examples per label.
- **One idea per example.** A sentence or a short paragraph, like the blocks the app analyzes.
- **Watch the confusion matrix.** If `promotional` is often predicted as `formal`, add more examples that separate the two.
- Lines starting with `//` are ignored.

### Adding a new label

Add examples with the new label and retrain. For the tone model, also add the label to `TONE_LABELS` in `src/services/modelService.js` so brands can select it.

### Adding a new model

1. Create `ml/data/<name>.jsonl`.
2. Register it in the `MODELS` table in `ml/train.js`.
3. `npm run train -- <name>`.
4. Use it from an engine via `classify('<name>', text)`, which returns `{ label, confidence, scores }`, or `null` if the model isn't trained. Engines must keep working when it returns `null`.

## Testing without trained models

Unit tests use a mock provider (`MockModelProvider` in `modelService.js`, or a plain `classify` function) so they never depend on the trained files. `tests/ml.test.js` checks the trained models when they exist.
