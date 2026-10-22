import mongoose from 'mongoose';

// Something the system noticed (inferred) or read (explicit) in the sources.
// Not a rule: rules are only created from observations after human approval.
const observationSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['voice', 'tone', 'style', 'vocabulary', 'messaging'], required: true },
    origin: { type: String, enum: ['explicit', 'inferred'], required: true },
    observation: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    evidence: { type: [{ sourceId: String, text: String, _id: false }], default: [] },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.brandId = ret.brandId.toString();
        delete ret._id;
        delete ret.userId;
        return ret;
      },
    },
  }
);

export default mongoose.model('Observation', observationSchema);
