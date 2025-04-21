import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const sendAudioToServer = async (audioUri: string) => {
  const BACKEND_URI = "http://192.168.201.53:8000"; // Your backend IP
  const fileName = `audio_${Date.now()}.wav`;
  const tempPath = FileSystem.cacheDirectory + fileName; // ✅ Correct path

  try {
    // Copy the file to a writable path
    await FileSystem.copyAsync({
      from: audioUri,
      to: tempPath,
    });

    console.log("Saved audio to:", tempPath);

    const formData = new FormData();
    formData.append('audio', {
      uri: tempPath,
      name: fileName,
      type: 'audio/wav',
    } as any);

    const response = await axios.post(`${BACKEND_URI}/api/audio/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error sending audio:', error);
    throw error;
  }
};

export default sendAudioToServer;
