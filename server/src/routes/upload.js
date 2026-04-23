import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase.js';

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|gif|webp|svg/;
    const ext = types.test(path.extname(file.originalname).toLowerCase());
    const mime = types.test(file.mimetype);
    cb(null, ext && mime);
  }
});

const router = Router();

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const filename = `${uuidv4()}${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(filename);

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
