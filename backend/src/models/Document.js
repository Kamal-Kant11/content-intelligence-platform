import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    contentType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storagePath: { type: String, required: true, select: false }, // never sent to the client
    originalContent: { type: String, default: '', select: false }, // extracted text
    status: { type: String, enum: ['draft'], default: 'draft' },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.storagePath;
        return ret;
      },
    },
  }
);

export default mongoose.model('Document', documentSchema);
