import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v4 as uuidv4 } from "uuid";
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'eduquest_lectures', 
    resource_type: 'video',      
    format: async () => 'mp4',   
    public_id: (req, file) => `${uuidv4()}`,
  },
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'eduquest_thumbnails',
    resource_type: 'image',
    format: async () => 'jpg',
    public_id: () => uuidv4(),
  },
});

export const uploadFiles = multer({ storage }).single('file');
export const uploadImage = multer({ storage: imageStorage }).single('file');




// import multer from 'multer';
// import {v4 as uuid} from 'uuid';

// const storage = multer.diskStorage({
//     destination(req,file,cb){
//         cb(null,"uploads");
//     },
//     filename(req,file,cb){
//         const id = uuid()
//         const extName = file.originalname.split(".").pop();
//         const fileName = `${id}.${extName}`;
//         cb(null,fileName); 
//     },
// });

// export const uploadFiles = multer({storage}).single("file");
// cloudinaryConfig.js
