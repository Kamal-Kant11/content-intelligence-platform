import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    data: { type: Buffer, select: false },
    text: { type: String, default: '' },
  },
  { timestamps: true }
);

documentSchema.index({ user: 1, updatedAt: -1 });

export default mongoose.model('Document', documentSchema);
