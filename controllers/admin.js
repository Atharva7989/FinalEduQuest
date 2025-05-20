import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { pipeline } from '@xenova/transformers'; // or your transformer lib
import { Lecture } from "../models/Lecture.js";
import {rm} from "fs";
import axios from 'axios';
import os from "os";
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from "cloudinary";
import {promisify} from 'util'
import fs from "fs";
import {User} from '../models/User.js'
import {Quiz} from '../models/Quiz.js'
import path from 'path';
import { dirname } from 'path';
import ffmpeg from "fluent-ffmpeg";
import { spawn } from "child_process";
const tempDir = path.join(os.tmpdir(), "eduquest_temp");

export const createCourse = TryCatch(async (req, res) => {
  const { title, description, category, createdBy, duration, price } = req.body;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ message: "Please upload an image." });
  }
  const imageUrl = image.path; // multer-storage-cloudinary - cloudinary URL 
  await Courses.create({
    title,
    description,
    category,
    createdBy,
    image: imageUrl,
    duration,
    price,
  });

  res.status(201).json({
    message: "Course Created Successfully",
  });
});

export const addQuiz = async (req, res) => {
  const { courseId } = req.params; 
  const { questions } = req.body;  

  try {
    // Check if the course exists
    const course = await Courses.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Create new quiz for the course
    const newQuiz = await Quiz.create({
      course: courseId,
      questions: questions,
    });

    res.status(201).json({
      message: "Quiz added successfully!",
      quiz: newQuiz,
    });
  } catch (error) {
    console.error("Error adding quiz:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Ensure the uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const downloadFile = async (url, outputPath) => {
   console.log("downloadFile called with URL:", url);
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

// Helper: Extract and convert audio from video using ffmpeg
const extractAudio = (videoPath, audioPath) => {
    console.log("extractAudio called with:", videoPath, audioPath);

  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-y",
      audioPath,
    ]);

    ffmpegProcess.on("close", (code) => {
            console.log(`ffmpeg process exited with code ${code}`);

      if (code !== 0) {
              console.error("ffmpeg error:", err);

        reject(new Error(`ffmpeg exited with code ${code}`));
      } else {
        resolve(audioPath);
      }
    });

    ffmpegProcess.on("error", (err) => {
      reject(err);
    });
  });
};

// Your main function to process lecture audio & generate summary
const processLectureAudio = async (cloudinaryUrl) => {
  console.log("processLectureAudio called with cloudinaryUrl:", cloudinaryUrl);
  if (!cloudinaryUrl) throw new Error("No cloudinaryUrl provided to processLectureAudio");

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempVideoPath = path.join(tempDir, "temp_video.mp4");
  const tempAudioPath = path.join(tempDir, "temp_audio.wav");
  const transcriptPath = path.join(tempDir, "temp_audio.txt");

  await downloadFile(cloudinaryUrl, tempVideoPath);
  await extractAudio(tempVideoPath, tempAudioPath);

  await new Promise((resolve, reject) => {
    const whisper = spawn("whisper", [
      tempAudioPath,
      "--model", "base",
      "--output_format", "txt",
      "--output_dir", tempDir,
    ]);
    whisper.on("close", (code) => {
      console.log(`whisper process exited with code ${code}`);
      code !== 0 ? reject(new Error(`Whisper exited with code ${code}`)) : resolve();
    });
    whisper.on("error", reject);
  });

  const transcript = fs.readFileSync(transcriptPath, "utf-8");
  console.log("Transcript read:", transcript.slice(0, 100) + "...");

  const summarize = await pipeline("summarization", "Xenova/bart-large-cnn");
  const summaryResult = await summarize(transcript, { max_length: 150, min_length: 40 });
  const summary = summaryResult[0].summary_text;

  fs.unlinkSync(tempVideoPath);
  fs.unlinkSync(tempAudioPath);
  fs.unlinkSync(transcriptPath);

  return summary;
};



// Lecture upload endpoint
export const addLecture = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Courses.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "video",
      folder: "eduquest_lectures",
    });

    const videoUrl = result.secure_url;

    // First create lecture entry without summary
    const newLecture = await Lecture.create({
      title: req.body.title,
      description: req.body.description,
      video: videoUrl,
      public_id: result.public_id,
      course: courseId,
    });

    // Generate summary
    const summary = await processLectureAudio(videoUrl);

    // Update lecture with summary
    newLecture.summary = summary;
    await newLecture.save();

    res.status(200).json({
      success: true,
      message: "Lecture added successfully",
      lecture: newLecture,
    });
  } catch (error) {
    console.error("Error adding lecture:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};




// export const addLecture = async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const courseId = req.params.id;

//     const course = await Courses.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     const fileData = {
//       public_id: req.file.filename, // This is actually cloudinary's public_id
//       url: req.file.path,
//     };

//     const newLecture = {
//       title,
//       description,
//       video: fileData,
//     };

//     course.lectures.push(newLecture);
//     course.numOfLectures = course.lectures.length;
//     await course.save();

//     res.status(200).json({
//       success: true,
//       message: "Lecture added successfully",
//       lecture: newLecture,
//     });

//   } catch (error) {
//     console.error(" Error adding lecture:", error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };





export const deleteLecture = async (req, res) => {
  try {
    const lectureId = req.params.id;
    
    // Assuming you use mongoose
    const lecture = await Lecture.findByIdAndDelete(lectureId);
    
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }
    
    // If needed, handle video deletion from cloud storage here
    const publicId = lecture.video.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    res.status(200).json({ message: "Lecture deleted successfully" });
  } catch (error) {
    console.error("Error deleting lecture:", error);
    res.status(500).json({ message: "Failed to delete lecture" });
  }
};





export const deleteCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);
  const lectures = await Lecture.find({ course: course._id });

  // Delete lecture videos from Cloudinary
  await Promise.all(
    lectures.map(async (lecture) => {
      const publicId = lecture.video.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    })
  );

  // Delete course image from Cloudinary
  const imagePublicId = course.image.split("/").pop().split(".")[0];
  await cloudinary.uploader.destroy(imagePublicId, { resource_type: "image" });

  // Remove all lecture documents
  await Lecture.deleteMany({ course: req.params.id });

  // Remove the course
  await course.deleteOne();

  // Remove course ID from all user subscriptions
  await User.updateMany({}, { $pull: { subscription: req.params.id } });

  res.json({
    message: "Course Deleted",
  });
});


// Atharva Donkar
export const getProgressStats = async (req, res) => {
  try {
    const completedCourses = await Course.countDocuments({ status: "completed" });
    const inProgressCourses = await Course.countDocuments({ status: "inProgress" });

    res.json({ completed: completedCourses, inProgress: inProgressCourses });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// export const getUserPerCourseStats = async (req, res) => {
//   try {
//     console.log(" Route hit: Getting users per course"); // debug

//     // Sample logic (adjust if needed)
//     const courses = await Course.find({});
//     const users = await User.find({});

//     console.log("Courses found:", courses.length); // debug
//     console.log("Users found:", users.length);     // debug

//     // your logic here...

//     res.json({ message: "Stats coming soon..." }); // temp success
//   } catch (err) {
//     console.error(" Error in getUserPerCourseStats:", err); // detailed log
//     res.status(500).json({ message: "Server error", err });
//   }
// };




export const getUserDistribution = async (req, res) => {
    try {
      const allUsers = await User.find(); 
      const students = await User.countDocuments({ role: "user" });
      const admins = await User.countDocuments({ role: "admin" });
  
      res.status(200).json({ students, admins });
    } catch (error) {
      console.error("Error fetching user distribution:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };


  // Get course enrollment data - Atharva Donkar
export const getCourseEnrollmentStats = TryCatch(async (req, res) => {
    const courses = await Courses.find().select("title subscription");
  
    const courseStats = courses.map((course) => ({
      name: course.title,
      enrolled: course.subscription.length,
    }));
  
    res.json({ courseStats });
  });
  
  

export const getAllStats = TryCatch(async(req,res)=>{
    const totalCourses = (await Courses.find()).length; 
    const totalLectures = (await Lecture.find()).length;
    const totalUsers = (await User.find()).length;
    const stats = {
        totalCourses,
        totalLectures,
        totalUsers,
    };
    res.json({
        stats,
    });
});

export const getAllUser = TryCatch(async (req, res) => {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );
  
    res.json({ users });
  });
  

  // Under Development - Atharva Donkar
  export const updateRole = TryCatch(async (req, res) => {
    if (req.user.mainrole !== "superadmin")
      return res.status(403).json({
        message: "This endpoint is assign to superadmin",
      });
    const user = await User.findById(req.params.id);
  
    if (user.role === "user") {
      user.role = "admin";
      await user.save();
  
      return res.status(200).json({
        message: "Role updated to admin",
      });
    }
  
    if (user.role === "admin") {
      user.role = "user";
      await user.save();
  
      return res.status(200).json({
        message: "Role updated",
      });
    }
  });