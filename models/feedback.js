import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  name: { type: String, require: true },
  username: { type: String, require: true },
  feedback: String,
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
});

export const Feedback = mongoose.model('Feedback', feedbackSchema);
