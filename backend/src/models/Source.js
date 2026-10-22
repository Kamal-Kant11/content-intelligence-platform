import mongoose from 'mongoose';

export const SOURCE_KINDS = ['pdf', 'docx', 'txt', 'url', 'text'];

// Company material used as evidence. Only the extracted text is stored; the
// uploaded binary is deleted after extraction (PDF Phase 15).
const sourceSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: SOURCE_KINDS, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, default: null },
    status: { type: String, enum: ['processed', 'failed'], required: true },
    error: { type: String, default: null },
    content: { type: String, default: '', select: false },
    chunks: { type: [{ chunkId: String, text: String, _id: false }], default: [], select: false },
    wordCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.brandId = ret.brandId.toString();
        delete ret._id;
        delete ret.userId;
        delete ret.chunks;
        return ret;
      },
    },
  }
);

export default mongoose.model('Source', sourceSchema);
