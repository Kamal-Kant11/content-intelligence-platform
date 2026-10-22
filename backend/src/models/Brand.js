import mongoose from 'mongoose';

// Brand profile: kept small. Rules are a separate collection (PDF section 9).
const brandSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    voice: {
      traits: { type: [String], default: [] }, // e.g. clear, confident, human
      tone: { type: [String], default: [] }, // labels of the tone model, e.g. conversational
      style: { type: [String], default: [] }, // e.g. direct, concise
    },
    vocabulary: {
      keyTerms: { type: [String], default: [] },
    },
    messaging: {
      keyMessages: { type: [String], default: [] },
    },
    learnedAt: { type: Date, default: null },
    // Changes whenever rules, sources or the voice change. Part of the analysis
    // cache key, so a cached analysis is never reused after brand knowledge changed.
    knowledgeUpdatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.userId;
        return ret;
      },
    },
  }
);

export default mongoose.model('Brand', brandSchema);
