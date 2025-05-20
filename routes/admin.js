import express from 'express';
import { isAdmin, isAuth } from '../middlewares/isAuth.js';
import { addLecture, createCourse, deleteCourse, deleteLecture, getAllStats, getAllUser, updateRole ,addQuiz} from '../controllers/admin.js';
import { uploadFiles,uploadImage } from '../middlewares/multer.js';
import { getMyCourses } from '../controllers/course.js';
import { getUserDistribution,getCourseEnrollmentStats, } from "../controllers/admin.js";
import { getProgressStats } from "../controllers/admin.js";
// import { addQuiz, getQuizzesByCourse, deleteQuiz } from "../controllers/admin.js";


const router = express.Router();

// router.post('/course/new',isAuth,isAdmin,uploadFiles,createCourse);
router.post('/course/new', isAuth, isAdmin, uploadImage, createCourse);
// router.post('/course/:id',isAuth,isAdmin,uploadFiles,addLecture);
router.post('/course/:id', isAuth, isAdmin, uploadFiles, addLecture);
router.delete('/course/:id',isAuth,isAdmin, deleteCourse);
router.delete('/lecture/:id',isAuth,isAdmin,deleteLecture); 
router.get('/stats',isAuth , isAdmin ,getAllStats);
// router.get('/mycourse',isAuth , isAdmin ,getMyCourses);
router.put('/user/:id',isAuth,isAdmin,updateRole);
router.get('/users',isAuth,isAdmin,getAllUser);
router.get('/user-distribution', isAuth, isAdmin, getUserDistribution);
router.get('/course-enrollment', isAuth, isAdmin, getCourseEnrollmentStats);
router.get('/progress-stats', isAuth, isAdmin, getProgressStats);
router.post('/course/:courseId/quiz',isAuth,isAdmin, addQuiz);
// router.get('/user-per-course', isAuth, isAdmin, getUserPerCourseStats);





export default router;