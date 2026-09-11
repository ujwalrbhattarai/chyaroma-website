import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadRoot = path.resolve(__dirname, '..', 'uploads', 'menu')
fs.mkdirSync(uploadRoot, { recursive: true })

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`)
  },
})

const fileFilter = (_req, file, cb) => {
  if (allowedMime.has(file.mimetype)) return cb(null, true)
  cb(Object.assign(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed'), { statusCode: 400 }))
}

export const uploadMenuImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
})
