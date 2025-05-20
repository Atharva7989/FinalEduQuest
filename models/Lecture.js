// import mongoose from "mongoose";

// const schema = new mongoose.Schema({
//     title:{
//         type:String,
//         required :true,
//     },
//     description:{
//         type:String,
//         required:true,
//     },
//     video:{
//         type:String,
//         required:true,
//     },
//     course:{
//         type:mongoose.Schema.Types.ObjectId,
//         ref:"Courses",
//         required:true,
//     },
//     createAt:{
//         type:Date,
//         default:Date.now,
//     },

// });

// export const Lecture = mongoose.model("Lecture",schema); 
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  video: {
    type: String, // Cloudinary URL
    required: true,
  },
  public_id: {
    type: String, // Cloudinary public_id (for deleting video)
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  summary: { // New field for storing the lecture summary
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Lecture = mongoose.model("Lecture", schema);
