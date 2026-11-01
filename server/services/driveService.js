let google = null;
try {
  google = require('googleapis').google;
} catch (e) {
  // googleapis not installed or optional; fallback to database buffer storage
}
const stream = require('stream');

let driveClient = null;

const getDriveClient = () => {
  if (driveClient) return driveClient;
  if (!google) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      const auth = new google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      driveClient = google.drive({ version: 'v3', auth });
      return driveClient;
    } catch (err) {
      console.warn('⚠️ Google Drive client initialization failed:', err.message);
    }
  }
  return null;
};

/**
 * Uploads a file buffer to Google Drive (or returns local fallback indicator)
 */
const uploadFile = async ({ buffer, originalname, mimetype }) => {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (drive) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
      name: `${Date.now()}_${originalname}`,
      parents: folderId ? [folderId] : []
    };

    const media = {
      mimeType: mimetype,
      body: bufferStream
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size'
    });

    return {
      driveFileId: response.data.id,
      name: originalname,
      contentType: mimetype,
      size: buffer.length
    };
  }

  // Graceful fallback for local development: store in DB buffer
  return {
    driveFileId: null,
    name: originalname,
    contentType: mimetype,
    size: buffer.length,
    data: buffer
  };
};

/**
 * Downloads a file stream from Google Drive
 */
const downloadFileStream = async (driveFileId) => {
  const drive = getDriveClient();
  if (drive && driveFileId) {
    const res = await drive.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return res.data;
  }
  return null;
};

/**
 * Deletes a file from Google Drive
 */
const deleteFile = async (driveFileId) => {
  const drive = getDriveClient();
  if (drive && driveFileId) {
    try {
      await drive.files.delete({ fileId: driveFileId });
    } catch (err) {
      console.warn('Could not delete file from Google Drive:', err.message);
    }
  }
};

module.exports = {
  uploadFile,
  downloadFileStream,
  deleteFile
};
