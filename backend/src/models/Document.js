import mongoose from 'mongoose';
import { BLOCK_TYPES } from '../intelligence/normalize.js';

export const CONTENT_TYPES = ['general', 'article', 'blog', 'marketing', 'email'];
export const SOURCE_TYPES = ['write', 'paste', 'file', 'url'];
export const DOCUMENT_STATUSES = ['draft', 'in_review', 'approved'];

// Blocks live inside the document. They have no lifecycle of their own, so
// there is no Block collection, service or CRUD API (PDF section 13).
const blockSchema = new mongoose.Schema(
  {
    blockId: { type: String, required: true },
    type: { type: String, enum: BLOCK_TYPES, required: true },
    position: { type: Number, required: true },
    text: { type: String, default: '' },
    level: { type: Number },
  },
  { _id: false }
);

const toJSON = {
  transform(_doc, ret) {
    ret.id = ret._id.toString();
    ret.userId = ret.userId?.toString();
    if (ret.brandId) ret.brandId = ret.brandId.toString();
    delete ret._id;
    delete ret.storagePath;
    return ret;
  },
};

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    contentType: { type: String, enum: CONTENT_TYPES, default: 'general' },
    sourceType: { type: String, enum: SOURCE_TYPES, required: true },
    source: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      url: String,
    },
    storagePath: { type: String, select: false }, // uploaded file on disk, never sent to the client
    originalContent: { type: String, default: '' }, // immutable after creation
    currentContent: { type: String, default: '' }, // latest accepted state
    blocks: { type: [blockSchema], default: [] }, // blocks of currentContent
    wordCount: { type: Number, default: 0 },
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'draft' },
    lastAnalysis: {
      analysisId: mongoose.Schema.Types.ObjectId,
      overallScore: Number,
      analyzedAt: Date,
    },
  },
  { timestamps: true, versionKey: false, toJSON }
);

documentSchema.index({ userId: 1, createdAt: -1 });

// Rule 4: original content is immutable.
documentSchema.pre('save', function () {
  if (!this.isNew && this.isModified('originalContent')) {
    throw new Error('originalContent is immutable.');
  }
});

export default mongoose.model('Document', documentSchema);
