// Upgrades documents uploaded before the content model existed
// (fields: fileName, contentType = MIME type, fileSize, originalContent).
// Idempotent: only touches documents without `sourceType`.
import Document from '../models/Document.js';
import { countWords, normalizeText, parseBlocks } from '../intelligence/normalize.js';

export async function migrateLegacyDocuments() {
  const legacy = await Document.collection.find({ sourceType: { $exists: false } }).toArray();
  for (const doc of legacy) {
    const content = normalizeText(doc.originalContent || '');
    await Document.collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          sourceType: 'file',
          source: { fileName: doc.fileName, fileSize: doc.fileSize, mimeType: doc.contentType },
          contentType: 'general',
          originalContent: content,
          currentContent: content,
          blocks: parseBlocks(content),
          wordCount: countWords(content),
          status: 'draft',
        },
        $unset: { fileName: '', fileSize: '' },
      }
    );
  }
  if (legacy.length) console.log(`Migrated ${legacy.length} legacy document(s).`);
}
