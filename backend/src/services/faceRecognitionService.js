const { randomUUID } = require("crypto");
const { db } = require("../config/db");
const { uploadEmployeeFile, deleteObject } = require("./employeeStorageService");
const { ApiError } = require("../utils/errors");

/**
 * Save face images for an employee during registration
 */
async function saveFaceImages({ employeeId, images, descriptors }) {
  console.log('[Face Service] Starting saveFaceImages:', {
    employeeId,
    imagesCount: images?.length,
    descriptorsCount: descriptors?.length
  });

  if (!images || images.length !== 7) {
    throw new ApiError("Exactly 7 face images are required for registration.", 400, "INVALID_IMAGES");
  }

  if (!descriptors || descriptors.length !== 7) {
    throw new ApiError("Face descriptors for all 7 images are required.", 400, "INVALID_DESCRIPTORS");
  }

  // Validate each descriptor
  for (let i = 0; i < descriptors.length; i++) {
    const descriptor = descriptors[i];
    
    if (!Array.isArray(descriptor)) {
      console.error(`[Face Service] Descriptor ${i + 1} is not an array:`, typeof descriptor);
      throw new ApiError(`Descriptor ${i + 1} is invalid: must be an array`, 400, "INVALID_DESCRIPTOR_FORMAT");
    }
    
    if (descriptor.length !== 128) {
      console.error(`[Face Service] Descriptor ${i + 1} has wrong length: ${descriptor.length}, expected 128`);
      throw new ApiError(`Descriptor ${i + 1} is invalid: must have 128 dimensions`, 400, "INVALID_DESCRIPTOR_LENGTH");
    }
    
    if (!descriptor.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
      console.error(`[Face Service] Descriptor ${i + 1} contains invalid values`);
      throw new ApiError(`Descriptor ${i + 1} contains invalid values: all must be valid numbers`, 400, "INVALID_DESCRIPTOR_VALUES");
    }
    
    console.log(`[Face Service] Descriptor ${i + 1} validated: 128D vector with valid numeric values`);
  }

  const promisePool = db.promise();
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete existing face images if any
    const [existing] = await connection.query(
      "SELECT image_key FROM EmployeeFaceImages WHERE employee_uuid = ?",
      [employeeId]
    );

    console.log('[Face Service] Existing images to delete:', existing.length);

    for (const row of existing) {
      try {
        await deleteObject(row.image_key);
      } catch (err) {
        console.error('[Face Service] Error deleting old image:', err);
      }
    }

    await connection.query(
      "DELETE FROM EmployeeFaceImages WHERE employee_uuid = ?",
      [employeeId]
    );

    // Upload and save new images
    const savedImages = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const descriptor = descriptors[i];

      console.log(`[Face Service] Processing image ${i + 1}:`, {
        hasBuffer: !!image.buffer,
        bufferSize: image.buffer?.length,
        mimetype: image.mimetype,
        originalname: image.originalname
      });

      // Upload to MinIO
      const { objectKey } = await uploadEmployeeFile({
        prefix: "face-images",
        employeeId,
        file: image,
      });

      console.log(`[Face Service] Uploaded image ${i + 1} to MinIO:`, objectKey);

      // Save to database with descriptor
      const uuid = randomUUID();
      await connection.query(
        `INSERT INTO EmployeeFaceImages 
         (uuid, employee_uuid, image_key, image_number, descriptor_json) 
         VALUES (?, ?, ?, ?, ?)`,
        [uuid, employeeId, objectKey, i + 1, JSON.stringify(descriptor)]
      );

      savedImages.push({ uuid, image_number: i + 1, image_key: objectKey });
    }

    // Update employee face_images_registered flag
    await connection.query(
      "UPDATE Employees SET face_images_registered = TRUE WHERE uuid = ?",
      [employeeId]
    );

    await connection.commit();
    console.log('[Face Service] Successfully saved all face images');
    return savedImages;
  } catch (error) {
    console.error('[Face Service] Error in saveFaceImages:', error);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get all face descriptors for an employee
 */
async function getEmployeeFaceDescriptors(employeeId) {
  const promisePool = db.promise();
  const [rows] = await promisePool.query(
    `SELECT uuid, image_number, descriptor_json 
     FROM EmployeeFaceImages 
     WHERE employee_uuid = ? 
     ORDER BY image_number`,
    [employeeId]
  );

  return rows.map(row => ({
    uuid: row.uuid,
    imageNumber: row.image_number,
    descriptor: JSON.parse(row.descriptor_json),
  }));
}

/**
 * Get all employees with registered face images
 */
async function getAllEmployeesWithFaces() {
  const promisePool = db.promise();
  const [rows] = await promisePool.query(
    `SELECT 
      e.uuid,
      e.mesob_id,
      e.first_name,
      e.middle_name,
      e.last_name,
      p.department_uuid,
      d.name AS department_name
     FROM Employees e
     LEFT JOIN Positions p ON p.uuid = e.position_uuid
     LEFT JOIN Departments d ON p.department_uuid = d.uuid
     WHERE e.status = 'ACTIVE' AND e.face_images_registered = TRUE`
  );

  // Get face descriptors for each employee separately
  const employeesWithFaces = [];
  for (const row of rows) {
    const [faceRows] = await promisePool.query(
      `SELECT descriptor_json FROM EmployeeFaceImages 
       WHERE employee_uuid = ? 
       ORDER BY image_number`,
      [row.uuid]
    );

    const faceDescriptors = faceRows.map(fr => {
      try {
        return JSON.parse(fr.descriptor_json);
      } catch (e) {
        console.error(`Invalid JSON in descriptor for employee ${row.uuid}:`, e);
        return null;
      }
    }).filter(d => d !== null);

    if (faceDescriptors.length > 0) {
      employeesWithFaces.push({
        uuid: row.uuid,
        mesobId: row.mesob_id,
        firstName: row.first_name,
        middleName: row.middle_name,
        lastName: row.last_name,
        departmentUuid: row.department_uuid,
        departmentName: row.department_name,
        faceDescriptors,
      });
    }
  }

  return employeesWithFaces;
}

/**
 * Find employee by matching face descriptor
 * Returns best match if confidence is above threshold
 * 
 * IMPORTANT: Threshold tuning for face-api.js 128D descriptors:
 * - 0.3: Very strict (may reject same person in different conditions)
 * - 0.4: Strict (recommended for security - good balance)
 * - 0.6: Moderate (may accept similar looking people)
 * - 0.8: Loose (high false positive rate)
 */
async function findEmployeeByFace(capturedDescriptor, threshold = 0.4) {
  try {
    // Validate descriptor
    if (!capturedDescriptor || !Array.isArray(capturedDescriptor)) {
      console.error('[Face Service] Invalid descriptor: not an array');
      return null;
    }

    if (capturedDescriptor.length !== 128) {
      console.error(`[Face Service] Invalid descriptor length: ${capturedDescriptor.length}, expected 128`);
      return null;
    }

    // Validate all values are numbers
    if (!capturedDescriptor.every(v => typeof v === 'number' && !isNaN(v))) {
      console.error('[Face Service] Invalid descriptor: contains non-numeric values');
      return null;
    }

    const employees = await getAllEmployeesWithFaces();
    
    if (employees.length === 0) {
      console.warn('[Face Service] No employees with registered faces found');
      return null;
    }

    console.log(`[Face Service] Comparing against ${employees.length} employees with registered faces (threshold: ${threshold})`);

    let bestMatch = null;
    let bestDistance = Infinity;
    let bestMatchDescriptorIndex = -1;

    for (const employee of employees) {
      for (let descIndex = 0; descIndex < employee.faceDescriptors.length; descIndex++) {
        const storedDescriptor = employee.faceDescriptors[descIndex];
        const distance = euclideanDistance(capturedDescriptor, storedDescriptor);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = employee;
          bestMatchDescriptorIndex = descIndex;
        }
      }
    }

    console.log(`[Face Service] Best match: employee ${bestMatch?.uuid || 'none'}, distance: ${bestDistance.toFixed(3)}, threshold: ${threshold}, descriptor index: ${bestMatchDescriptorIndex + 1}/7`);

    // If distance is less than threshold, we have a match
    if (bestMatch && bestDistance < threshold) {
      const confidence = 1 - bestDistance;
      console.log(`[Face Service] ✓ Match accepted: ${bestMatch.uuid} (${bestMatch.firstName} ${bestMatch.lastName}) with confidence ${confidence.toFixed(3)}`);
      return {
        ...bestMatch,
        matchDistance: bestDistance,
        matchConfidence: confidence,
        matchDescriptorIndex: bestMatchDescriptorIndex + 1,
      };
    }

    console.log(`[Face Service] ✗ No match found - best distance ${bestDistance.toFixed(3)} exceeds threshold ${threshold}`);
    if (bestMatch) {
      console.log(`[Face Service] Closest was ${bestMatch.uuid} (${bestMatch.firstName} ${bestMatch.lastName}) with distance ${bestDistance.toFixed(3)}`);
    }
    return null;
  } catch (error) {
    console.error('[Face Service] Error in findEmployeeByFace:', error);
    // Return null instead of throwing to avoid breaking the verification flow
    return null;
  }
}

/**
 * Calculate Euclidean distance between two face descriptors
 */
function euclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2) {
    console.error('[Face Service] euclideanDistance: null descriptor provided');
    return Infinity;
  }

  if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
    console.error('[Face Service] euclideanDistance: descriptors must be arrays');
    return Infinity;
  }

  if (descriptor1.length !== descriptor2.length) {
    console.error(`[Face Service] euclideanDistance: length mismatch ${descriptor1.length} vs ${descriptor2.length}`);
    return Infinity;
  }

  // Validate both descriptors contain only numbers
  if (!descriptor1.every(v => typeof v === 'number' && !isNaN(v))) {
    console.error('[Face Service] euclideanDistance: descriptor1 contains invalid values');
    return Infinity;
  }

  if (!descriptor2.every(v => typeof v === 'number' && !isNaN(v))) {
    console.error('[Face Service] euclideanDistance: descriptor2 contains invalid values');
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  const distance = Math.sqrt(sum);
  
  // Sanity check - Euclidean distance for normalized 128D vectors should typically be < 2.0
  if (distance > 2.0) {
    console.warn(`[Face Service] euclideanDistance: unusually large distance ${distance}`);
  }
  
  return distance;
}

/**
 * Check if employee has registered face images
 */
async function hasFaceImagesRegistered(employeeId) {
  const promisePool = db.promise();
  const [rows] = await promisePool.query(
    "SELECT face_images_registered FROM Employees WHERE uuid = ?",
    [employeeId]
  );

  return rows.length > 0 && rows[0].face_images_registered === 1;
}

/**
 * Delete all face images for an employee
 */
async function deleteFaceImages(employeeId) {
  const promisePool = db.promise();
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    // Get all image keys
    const [images] = await connection.query(
      "SELECT image_key FROM EmployeeFaceImages WHERE employee_uuid = ?",
      [employeeId]
    );

    // Delete from MinIO
    for (const img of images) {
      await deleteObject(img.image_key);
    }

    // Delete from database
    await connection.query(
      "DELETE FROM EmployeeFaceImages WHERE employee_uuid = ?",
      [employeeId]
    );

    // Update employee flag
    await connection.query(
      "UPDATE Employees SET face_images_registered = FALSE WHERE uuid = ?",
      [employeeId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  saveFaceImages,
  getEmployeeFaceDescriptors,
  getAllEmployeesWithFaces,
  findEmployeeByFace,
  hasFaceImagesRegistered,
  deleteFaceImages,
};
