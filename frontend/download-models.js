const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, 'public', 'models');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const MODEL_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
];

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`✓ Created directory: ${MODELS_DIR}`);
}

// Download a single file
function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODELS_DIR, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`⊘ Skipping ${filename} (already exists)`);
      resolve();
      return;
    }

    const url = `${BASE_URL}/${filename}`;
    const file = fs.createWriteStream(filePath);
    
    console.log(`↓ Downloading ${filename}...`);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

// Download all models
async function downloadAllModels() {
  console.log('\n🤖 Face-API.js Model Downloader\n');
  console.log(`Downloading ${MODEL_FILES.length} model files to ${MODELS_DIR}\n`);
  
  try {
    for (const file of MODEL_FILES) {
      await downloadFile(file);
    }
    console.log('\n✓ All models downloaded successfully!\n');
    console.log('You can now use face recognition in your application.\n');
  } catch (error) {
    console.error('\n✗ Error downloading models:', error.message);
    console.error('\nPlease try again or download manually from:');
    console.error('https://github.com/justadudewhohacks/face-api.js/tree/master/weights\n');
    process.exit(1);
  }
}

downloadAllModels();
