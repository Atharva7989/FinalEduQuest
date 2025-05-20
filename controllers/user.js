import e from "express"
import bcrypt from 'bcrypt'
import { User } from "../models/User.js";
import jwt from 'jsonwebtoken'
import sendMail,{sendForgotMail} from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";
import {Feedback} from "../models/feedback.js"
import {AssessmentModel} from "../models/AssessmentModel .js";
import mongoose from 'mongoose';
import {Quiz} from "../models/Quiz.js";
import {QuizResult} from "../models/QuizResult.js";
 export const register = TryCatch(async(req,res)=>{
    const{email,name,password} = req.body;

        let user = await User.findOne({ email });
       
        if(user) 
            return res.status(400).json({
            message:"User Already Exist",
        });

        const hashPassword = await bcrypt.hash(password , 10)

        user = {
            name,
            email,
            password: hashPassword
        }
        const otp =  Math.floor(Math.random()*1000000);
        const activationToken = jwt.sign({
            user,
            otp,
        },
        process.env.Activation_Secret,
        {
            expiresIn: "5m",
        });

        const data = {
            name,
            otp,
        };

        await sendMail(email, "E learning",data);
        res.status(200).json({
            message:"Otp send to your mail",
            activationToken, 
        });
 });
 export const verifyUser = TryCatch(async(req,res)=>{
    const {otp,activationToken} = req.body

    const verify = jwt.verify(activationToken,process.env.Activation_Secret)
   
    if(!verify)
         return res.status(400).json({
        message:"OTP Expired",
    });
    if(verify.otp !== otp) return res.status(400).json({
        message:"OTP Wrong",
    });
    await User.create({
        name:verify.user.name,
        email: verify.user.email,
        password: verify.user.password,
    })
    res.json({
        message:"User Registered",
    });
 });

 export const loginUser = TryCatch(async(req,res)=>{
    const{email,password} = req.body;

    const user = await User.findOne({email});
    if(!user) 
        return res.status(400).json({
        message:"No user with this email",
    });
    
    const mathPassword = await bcrypt.compare(password, user.password);

    if(!mathPassword)
        return res.status(400).json({
        message:"Wrong Password",
    });

    const token = jwt.sign({_id:user._id},process.env.Jwt_Sec,{
        expiresIn : "15d",
    });
    res.json({
        message:`Welcome back ${user.name}`,
        token,
        user,
    })
 });

 export const myProfile =  TryCatch(async(req,res)=>{
    const user = await User.findById(req.user._id)
    res.json({user});
 })

 export const forgotPassword= TryCatch(async(req,res)=>{
    const {email} = req.body;
    const user = await User.findOne({email})
    if(!user) return res.status(404).json({
        message :"No user found with this mail",
    });
    const token = jwt.sign({email},process.env.Forgot_Secret);
    const data = { email, token };

  await sendForgotMail("E learning", data);

  user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
 
  await user.save();
  res.json({
    message: "Reset Password Link is send to you mail",
  });
});

export const resetPassword = TryCatch(async (req, res) => {
  const decodedData = jwt.verify(req.query.token, process.env.Forgot_Secret);

  const user = await User.findOne({ email: decodedData.email });

  if (!user)
    return res.status(404).json({
      message: "No user with this email",
    });

  if (user.resetPasswordExpire === null)
    return res.status(400).json({
      message: "Token Expired",
    });

  if (user.resetPasswordExpire < Date.now()) {
    return res.status(400).json({
      message: "Token Expired",
    });
  }

  const password = await bcrypt.hash(req.body.password, 10);

  user.password = password;

  user.resetPasswordExpire = null;

  await user.save();

  res.json({ message: "Password Reset" });
  
 });


 export const submitFeedback = async (req, res) => {
  try {
    const { comments,rating } = req.body;
    const { name } = req.user;

    if (!comments || !name) {
      return res.status(400).json({ message: "Name and feedback are required" });
    }

    const existingFeedback = await Feedback.findOne({ name: req.user.name });
    if (existingFeedback) {
      return res.status(400).json({ message: "You have already submitted feedback." });
    }

    const newFeedback = new Feedback({
      name: name,
      feedback: comments,
      username: req.user.username,
      rating:rating,
    });

    await newFeedback.save();
    res.status(200).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while submitting feedback" });
  }
};


export const getQuizForCourse = async (req, res) => {
  const courseId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    console.log("⛔ Invalid ObjectId");
    return res.status(400).json({ message: "Invalid course ID" });
  }

  try {
    const quiz = await Quiz.findOne({
      course: new mongoose.Types.ObjectId(courseId)
    });

    if (!quiz) {
      console.log("⚠️ Quiz not found");
      return res.status(200).json({ message: "Quiz not found",questions: []  });
    }

    console.log("✅ Quiz found");
    res.json({ questions: quiz.questions });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const submitQuiz = async (req, res) => {
  const courseId = req.params.id;
  const { answers } = req.body;
  const userId = req.user.id;

  // Validate if answers are provided
  if (!answers || answers.length === 0) {
    return res.status(400).json({ message: "No answers provided" });
  }

  try {
    // Fetch the quiz for the given courseId
    const quiz = await Quiz.findOne({ course: courseId });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    let result = await QuizResult.findOne({ userId, courseId });
    if (result) {
      if (result.passed) {
        return res.status(400).json({ message: "You have already passed the quiz." });
      }
      if (result.attempts >= 3) {
        return res.status(400).json({ message: "You have reached the maximum of 3 attempts." });
      }
    }

    let correctCount = 0;
    quiz.questions.forEach((question) => {
      const submitted = answers.find(
        (ans) => ans.questionId === question._id.toString()
      );
      if (
        submitted &&
        submitted.selected?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
      ) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= 60;

    if (result) {
      result.score = score;
      result.passed = passed;
      result.attemptedAt = new Date();
      result.attempts += 1;  // Increment attempts after each attempt
      result.history.push({ score, attemptedAt: new Date() });
      await result.save();
    } else {
      result = await QuizResult.create({
        userId,
        courseId,
        score,
        passed,
        attemptedAt: new Date(),
        attempts: 1, // First attempt
        history: [{ score, attemptedAt: new Date() }]
      });
    }

    // Respond with result
    res.status(200).json({
      message: "Quiz submitted",
      score,
      passed,
      attempts: result.attempts,
    });

  } catch (error) {
    console.error("Error in submitQuiz:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getAllFeedback = async (req, res) => {
  try {
    // Fetch all feedback and include the rating field
    const feedbacks = await Feedback.find().select("name feedback rating");

    // Return the feedbacks in the response
    res.status(200).json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Error fetching feedback" });
  }
};