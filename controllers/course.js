import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { pipeline } from "@xenova/transformers"; // from Transformers.js
import { spawn } from "child_process"; // for Whisper if using CLI
import axios from 'axios';
// import ffmpegPath from 'ffmpeg-static';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the path to ffmpeg
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe'); 
export const summarizeLecture = async (req, res) => {
  console.log("Requested ID:", req.params.publicId);  // Check the publicId

  try {
    // Find the lecture by its _id (not public_id)
    const lecture = await Lecture.findById(req.params.publicId);
    if (!lecture) {
      console.log("Lecture not found with ID:", req.params.publicId);
      return res.status(404).json({ message: "Lecture not found" });
    }
    
    console.log("Lecture found:", lecture);  // Check the lecture object

    const videoUrl = lecture.video;
    console.log("Video URL:", videoUrl);

    // 1. Download video from Cloudinary
    const videoPath = path.join("uploads", `lecture-${Date.now()}.mp4`);
    const writer = fs.createWriteStream(videoPath);

    const response = await axios.get(videoUrl, { responseType: "stream" });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log("Video downloaded successfully!");

    // 2. Extract audio using ffmpeg
    const audioPath = path.join("uploads", `audio-${Date.now()}.wav`);
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(audioPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    console.log("Audio extracted successfully!");

    // 3. Transcribe audio using Whisper CLI (or any API)
    const whisper = spawn("whisper", [
      audioPath,
      "--model", "base",
      "--output_format", "txt",
      "--output_dir", "uploads"
    ]);
    
    await new Promise((resolve, reject) => {
      whisper.on("close", resolve);
      whisper.on("error", reject);
    });

    console.log("Audio transcription completed!");

    const transcriptPath = path.join(__dirname, "..", "uploads", path.basename(audioPath).replace(".wav", ".txt"));

    console.log("Transcript loaded!");
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');

    // 4. Summarize transcript using Transformers.js (browser-compatible model loader)
    const summarize = await pipeline("summarization", "Xenova/bart-large-cnn");
    const summary = await summarize(transcript, { max_length: 150, min_length: 40 });

    console.log("Summary generated!");

    // 5. Cleanup
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    fs.unlinkSync(transcriptPath);

    console.log("Temporary files cleaned up!");

    // 6. Return summary
    res.json({ summary: summary[0].summary_text });

  } catch (error) {
    console.error("Error occurred during lecture summarization:", error);
    res.status(500).json({ message: "Failed to summarize lecture", error: error.message });
  }
};


//  Get all courses - Atharva Donkar 
export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  res.json({ courses });
});

//  Get a single course
export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json({ course });
});

// Fetch all lectures for a course
export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });
  res.json({ lectures });
});

//  Fetch a sinlge lecture
export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);
  console.log(lecture._id)
  if (!lecture) return res.status(404).json({ message: "Lecture not found" });
  res.json({ lecture });
});



//  Get user’s enrolled courses 
export const getMyCourses = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id).populate("subscription"); 

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ courses: user.subscription }); 
});
// Added 20-3-2025
export const enrollInCourse = TryCatch(async (req, res) => {
  const { courseId } = req.params;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });


  if (user.subscription.includes(courseId)) {
    return res.json({ message: "Already enrolled in this course" });
  }

  // Add course to subscription
  user.subscription.push(courseId);
  await user.save();

  res.status(201).json({ message: "Successfully enrolled in the course" });
});

export const getLectureSummary = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    res.status(200).json({ summary: lecture.summary || "" });
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ message: "Server error while fetching summary" });
  }
};




//  Add Progress for a Lecture  - Atharva Donkar 
export const addProgress = TryCatch(async (req, res) => {
  const { lectureId } = req.query;

  let progress = await Progress.findOne({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) {
    progress = await Progress.create({
      user: req.user._id,
      course: req.query.course,
      completedLectures: [],
    });
  }

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({ message: "Progress already recorded" });
  }

  progress.completedLectures.push(lectureId);
  await progress.save();

  res.status(201).json({ message: "Progress updated" });
});

// Get Progress for a Course
export const getYourProgress = TryCatch(async (req, res) => {
  const progress = await Progress.findOne({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) {
    return res.status(404).json({ message: "No progress found for this course" });
  }

  const allLectures = await Lecture.countDocuments({ course: req.query.course });
  const completedLectures = progress.completedLectures.length;
  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress,
  });
});













































// import { instance } from "../index.js";
// import TryCatch from "../middlewares/TryCatch.js";
// import { Courses } from "../models/Courses.js";
// import { Lecture } from "../models/Lecture.js";
// import { User } from "../models/User.js";
// import { Progress } from "../models/Progress.js";
// import crypto from "crypto";
// import { Payment } from "../models/Payment.js";

// export const getAllCourses = TryCatch(async (req, res) => {
//   const courses = await Courses.find();
//   res.json({ courses });
// });

// export const getSingleCourse = TryCatch(async (req, res) => {
//   const course = await Courses.findById(req.params.id);
//   res.json({ course });
// });

// export const fetchLectures = TryCatch(async (req, res) => {
//   const lectures = await Lecture.find({ course: req.params.id });
//   res.json({ lectures }); 
// });

// export const fetchLecture = TryCatch(async (req, res) => {
//   const lecture = await Lecture.findById(req.params.id);
//   res.json({ lecture }); 
// });

// export const getMyCourses = TryCatch(async (req, res) => {
//   const courses = await Courses.find();
//   res.json({ courses });
// });

// export const checkout = TryCatch(async (req, res) => {
//   const user = await User.findById(req.user._id);
//   const course = await Courses.findById(req.params.id);

//   if (user.subscription.includes(course._id)) {
//     return res.status(400).json({
//       message: "You already have this course",
//     });
//   }

//   user.subscription.push(course._id);
  
//   await Progress.create({
//     course: course._id,
//     completedLectures: [],
//     user: req.user._id,
//   });
//   await user.save();

//   res.status(201).json({
//     message: "Course added successfully, no subscription check applied",
//     course,
//   });
// });

// export const paymentVerfication = TryCatch(async (req, res) => {
//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   const body = razorpay_order_id + " | " + razorpay_payment_id;
//   const expectedSignature = crypto
//     .createHmac("sha256", process.env.Razorpay_Secret)
//     .update(body)
//     .digest("hex");

//   const isAuthentic = expectedSignature === razorpay_signature;

//   if (isAuthentic) {
//     await Payment.create({
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     });

//     const user = await User.findById(req.user._id);
//     const course = await Courses.findById(req.params.id);
//     user.subscription.push(course._id);
//     await user.save();

//     res.status(200).json({
//       message: "Course purchased successfully",
//     });
//   } else {
//     res.status(400).json({
//       message: "Payment Failed",
//     });
//   }
// });

// export const  addProgress = TryCatch(async (req, res) => {
//   const progress = await Progress.findOne({
//     user: req.user._id,
//     course: req.query.course,
//   });

//   const { lectureId } = req.query;

//   if (progress.completedLectures.includes(lectureId)) {
//     return res.json({
//       message: "Progress recorded",
//     });
//   }

//   progress.completedLectures.push(lectureId);

//   await progress.save();

//   res.status(201).json({
//     message: "new Progress added",
//   });
// });

// export const getYourProgress = TryCatch(async (req, res) => {
//   const progress = await Progress.find({
//     user: req.user._id,
//     course: req.query.course,
//   });

//   if (!progress) return res.status(404).json({ message: "null" });

//   const allLectures = (await Lecture.find({ course: req.query.course })).length;

//   const completedLectures = progress[0].completedLectures.length;

//   const courseProgressPercentage = (completedLectures * 100) / allLectures;

//   res.json({
//     courseProgressPercentage,
//     completedLectures,
//     allLectures,
//     progress,
//   });
// });


