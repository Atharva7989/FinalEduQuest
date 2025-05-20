import express from 'express'
import { forgotPassword, loginUser, myProfile, register, resetPassword, verifyUser,submitFeedback,getAllFeedback,getQuizForCourse,submitQuiz } from '../controllers/user.js';
import { isAuth } from '../middlewares/isAuth.js';
import { addProgress, getYourProgress } from '../controllers/course.js';
import { generateCertificate } from "../routes/certificateController.js";
const router = express.Router();


router.post("/user/register",register);
router.post("/user/verify",verifyUser);
router.post("/user/login",loginUser);
router.get("/user/me",isAuth,myProfile);
router.post("/user/forgot",forgotPassword);
router.post("/user/reset",resetPassword);   
router.post("/user/progress",isAuth,addProgress);   
router.get("/user/progress",isAuth,getYourProgress);   
// router.get("/user/certificate", isAuth, generateCertificate);
router.get("/course/:id/certificate", isAuth, generateCertificate);
router.post("/user/feedback/", isAuth, submitFeedback);
router.get("/:id/quiz", isAuth, getQuizForCourse);
router.post("/:id/quiz/submit", isAuth, submitQuiz);
router.get("/feedback", getAllFeedback);
export default router;