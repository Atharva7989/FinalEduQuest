import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  questions: [
    {
      question: { type: String, required: true },
      options: {
        option1: { type: String, required: true },
        option2: { type: String, required: true },
        option3: { type: String, required: true },
        option4: { type: String, required: true },
      },
      correctAnswer: { type: String, required: true },
    }
  ]
});


// Explicitly specify the collection name
const Quiz = mongoose.model('Quiz', quizSchema, 'quizzes');

export { Quiz };
