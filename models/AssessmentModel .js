import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Link to User model
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course', // Link to Course model
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  // Add other fields as needed (e.g., date of completion, etc.)
});

const AssessmentModel = mongoose.model('Assessment', assessmentSchema);

export { AssessmentModel };
