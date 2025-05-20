import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  score: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  attemptedAt: { type: Date, default: Date.now },
  attempts: { type: Number, default: 1 },
  history: [
    {
      score: Number,
      attemptedAt: { type: Date, default: Date.now },
    }
  ]
});

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

export { QuizResult };
