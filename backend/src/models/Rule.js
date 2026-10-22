import mongoose from 'mongoose';
import { RULE_TYPES } from '../intelligence/brand/ruleConfig.js';
import { CATEGORIES, SEVERITIES } from '../intelligence/findings.js';

export const RULE_STATUSES = ['suggested', 'active', 'rejected'];

// A company-approved instruction (PDF section 8).
const ruleSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: RULE_TYPES, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    severity: { type: String, enum: SEVERITIES, default: 'warning' },
    description: { type: String, default: '', maxlength: 1000 },
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: RULE_STATUSES, default: 'suggested' },
    enabled: { type: Boolean, default: true },
    origin: { type: String, enum: ['generated', 'manual'], default: 'manual' },
    observationIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    fingerprint: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.brandId = ret.brandId.toString();
        ret.observationIds = (ret.observationIds || []).map(String);
        delete ret._id;
        delete ret.userId;
        return ret;
      },
    },
  }
);

ruleSchema.index({ brandId: 1, fingerprint: 1 });

export default mongoose.model('Rule', ruleSchema);
