import mongoose from 'mongoose';
import { CATEGORIES, SEVERITIES } from '../intelligence/findings.js';

const findingSchema = new mongoose.Schema(
  {
    findingId: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    check: { type: String, required: true },
    severity: { type: String, enum: SEVERITIES, required: true },
    message: { type: String, required: true },
    text: { type: String, default: '' },
    suggestion: { type: String, default: '' },
    replacement: { type: String, default: null },
    confidence: { type: Number, default: 1 },
    blockId: { type: String, default: null },
    ruleId: { type: String, default: null },
    source: { type: String, enum: ['deterministic', 'model'], default: 'deterministic' },
    evidence: { type: [{ sourceId: String, text: String, _id: false }], default: undefined },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null },
    contentHash: { type: String, required: true }, // same hash = same input, so the result can be reused
    overallScore: { type: Number, required: true },
    categoryScores: { type: mongoose.Schema.Types.Mixed, default: {} },
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    findings: { type: [findingSchema], default: [] },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    engineVersion: { type: String, required: true },
    processingMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.documentId = ret.documentId.toString();
        ret.brandId = ret.brandId ? ret.brandId.toString() : null;
        delete ret._id;
        delete ret.userId;
        return ret;
      },
    },
  }
);

analysisSchema.index({ documentId: 1, createdAt: -1 });
analysisSchema.index({ documentId: 1, contentHash: 1 });

export default mongoose.model('Analysis', analysisSchema);
