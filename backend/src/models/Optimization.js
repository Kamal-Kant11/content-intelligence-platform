import mongoose from 'mongoose';

export const CHANGE_STATUSES = ['pending', 'approved', 'rejected', 'edited'];

// One proposed change per block: the unit of block-wise review (PDF Phase 13).
const changeSchema = new mongoose.Schema(
  {
    changeId: { type: String, required: true },
    blockId: { type: String, required: true },
    sectionId: { type: String, default: null },
    sectionTitle: { type: String, default: null },
    originalText: { type: String, required: true },
    proposedText: { type: String, required: true },
    editedText: { type: String, default: null },
    reason: { type: String, default: '' },
    findingIds: { type: [String], default: [] },
    status: { type: String, enum: CHANGE_STATUSES, default: 'pending' },
  },
  { _id: false }
);

const optimizationSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis', required: true },
    status: { type: String, enum: ['open', 'applied', 'discarded'], default: 'open' },
    changes: { type: [changeSchema], default: [] },
    appliedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.documentId = ret.documentId.toString();
        ret.analysisId = ret.analysisId.toString();
        delete ret._id;
        delete ret.userId;
        return ret;
      },
    },
  }
);

export default mongoose.model('Optimization', optimizationSchema);
