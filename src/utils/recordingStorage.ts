interface SavedRecording {
  questionId: string;
  audioData: string; // base64
  timestamp: number;
  duration: number;
  metadata: {
    userName: string;
    questionText: string;
  };
}

const STORAGE_KEY = "pending_recordings";
const MAX_RECORDING_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string = 'audio/webm'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// Get all saved recordings
const getAllRecordings = (): Record<string, SavedRecording> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Error reading recordings from localStorage:", error);
    return {};
  }
};

// Save all recordings
const saveAllRecordings = (recordings: Record<string, SavedRecording>): boolean => {
  try {
    const data = JSON.stringify(recordings);
    // Check if we're approaching localStorage limit
    if (data.length > 9 * 1024 * 1024) { // 9MB limit
      console.warn("Approaching localStorage limit");
      return false;
    }
    localStorage.setItem(STORAGE_KEY, data);
    return true;
  } catch (error) {
    console.error("Error saving recordings to localStorage:", error);
    return false;
  }
};

// Save recording locally
export const saveRecordingLocally = async (
  questionId: string,
  audioBlob: Blob,
  duration: number,
  metadata: { userName: string; questionText: string }
): Promise<boolean> => {
  try {
    // Check blob size
    if (audioBlob.size > MAX_RECORDING_SIZE) {
      console.warn("Recording too large to save locally");
      return false;
    }

    const audioData = await blobToBase64(audioBlob);
    const recordings = getAllRecordings();

    recordings[questionId] = {
      questionId,
      audioData,
      timestamp: Date.now(),
      duration,
      metadata,
    };

    return saveAllRecordings(recordings);
  } catch (error) {
    console.error("Error saving recording locally:", error);
    return false;
  }
};

// Get specific recording
export const getLocalRecording = (questionId: string): { blob: Blob; duration: number } | null => {
  try {
    const recordings = getAllRecordings();
    const recording = recordings[questionId];

    if (!recording) return null;

    const blob = base64ToBlob(recording.audioData);
    return { blob, duration: recording.duration };
  } catch (error) {
    console.error("Error retrieving recording:", error);
    return null;
  }
};

// Clear specific recording
export const clearLocalRecording = (questionId: string): boolean => {
  try {
    const recordings = getAllRecordings();
    delete recordings[questionId];
    return saveAllRecordings(recordings);
  } catch (error) {
    console.error("Error clearing recording:", error);
    return false;
  }
};

// Get all pending recordings
export const getAllPendingRecordings = (): SavedRecording[] => {
  const recordings = getAllRecordings();
  return Object.values(recordings);
};

// Clear old recordings
export const clearOldRecordings = (): number => {
  try {
    const recordings = getAllRecordings();
    const now = Date.now();
    let cleared = 0;

    Object.keys(recordings).forEach((questionId) => {
      const recording = recordings[questionId];
      if (now - recording.timestamp > MAX_AGE) {
        delete recordings[questionId];
        cleared++;
      }
    });

    if (cleared > 0) {
      saveAllRecordings(recordings);
    }

    return cleared;
  } catch (error) {
    console.error("Error clearing old recordings:", error);
    return 0;
  }
};

// Get storage usage info
export const getStorageInfo = (): { used: number; total: number; recordings: number } => {
  try {
    const recordings = getAllRecordings();
    const data = JSON.stringify(recordings);
    return {
      used: data.length,
      total: 10 * 1024 * 1024, // ~10MB typical localStorage limit
      recordings: Object.keys(recordings).length,
    };
  } catch (error) {
    return { used: 0, total: 0, recordings: 0 };
  }
};
