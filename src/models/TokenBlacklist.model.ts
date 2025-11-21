import mongoose, { Schema, Document, Model } from 'mongoose';
import { ITokenBlacklist } from '../types';

interface ITokenBlacklistDocument extends ITokenBlacklist, Document {}

const TokenBlacklistSchema: Schema<ITokenBlacklistDocument> = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - MongoDB will automatically delete documents when expiresAt is reached
  },
});

const TokenBlacklist: Model<ITokenBlacklistDocument> = mongoose.model<ITokenBlacklistDocument>(
  'TokenBlacklist',
  TokenBlacklistSchema
);

export default TokenBlacklist;
export { ITokenBlacklistDocument };
