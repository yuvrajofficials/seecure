import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  ImageBackground,
} from "react-native";
import { Audio } from "expo-av";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import * as SplashScreen from "expo-splash-screen";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";

const BACKEND_URL = "http://192.168.201.53:8000/api/audio/analyze";
const screenWidth = Dimensions.get("window").width;

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [status, setStatus] = useState("Waiting...");
  const [results, setResults] = useState({ classification: "", explanation: "" });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const recordingRef = useRef(null);
  const intervalRef = useRef(null);
  const [callHistory, setCallHistory] = useState([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    if (isMonitoring) startPulse();
    else pulseAnim.stopAnimation();
  }, [isMonitoring]);


 
  useEffect(() => {
    const fraudCount = callHistory.filter((c) => c.classification === "fraud").length;
    if (fraudCount >= 2) Vibration.vibrate();
  }, [callHistory]);

  const prepareRecordingSettings = () => ({
    android: {
      extension: ".wav",
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: ".wav",
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    isMeteringEnabled: false,
  });

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(prepareRecordingSettings());
      await recording.startAsync();
      recordingRef.current = recording;
      setStatus("Recording...");
    } catch (err) {
      console.error("Start recording error:", err);
      setStatus("Recording error.");
    }
  };

  const stopAndSendRecording = async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setStatus("Sending audio...");

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: `audio_${Date.now()}.wav`,
        type: "audio/wav",
      });

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const classification = result?.result?.classification || result?.classification || "unknown";
      const explanation = result?.result?.explanation || result?.explanation || "";

      const newResult = { classification, explanation };
      setResults(newResult);
      setCallHistory((prev) => [newResult, ...prev]);

      if (classification === "fraud") {
        Vibration.vibrate();
        setStatus("⚠️ FRAUD DETECTED");
      } else {
        setStatus("✅ Normal Call");
      }

      await startRecording();
    } catch (err) {
      console.error("Send/record cycle error:", err);
      setStatus("Error occurred.");
    }
  };

  const startLoop = async () => {
    await startRecording();
    intervalRef.current = setInterval(stopAndSendRecording, 20000);
    setIsMonitoring(true);
    setStatus("Monitoring...");
  };

  const stopLoop = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setIsMonitoring(false);
    setStatus("Stopped.");
  };

  const handleToggle = () => {
    if (isMonitoring) stopLoop();
    else startLoop();
  };

  const fraudCount = callHistory.filter((item) => item.classification === "fraud").length;
  const normalCount = callHistory.length - fraudCount;

  const pieData = [
    {
      name: "Fraud",
      count: fraudCount,
      color: "#d9534f",
      legendFontColor: "#fff",
      legendFontSize: 14,
    },
    {
      name: "Normal",
      count: normalCount,
      color: "#5cb85c",
      legendFontColor: "#fff",
      legendFontSize: 14,
    },
  ];

  const getStatusColor = () => {
    if (status.includes("FRAUD")) return "#ff4757";
    if (status.includes("Normal")) return "#2ed573";
    return "#ffa502";
  };

  const renderHistoryItem = (item, index) => (
    <LinearGradient
      key={index}
      colors={["#2d343633", "#2d343600"]}
      style={styles.historyItem}
    >
      <View style={styles.historyContent}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.classification === "fraud" ? "#ff475755" : "#2ed57355" }
        ]}>
          <Feather
            name={item.classification === "fraud" ? "alert-octagon" : "check-circle"}
            size={16}
            color={item.classification === "fraud" ? "#ff4757" : "#2ed573"}
          />
        </View>
        <View style={styles.historyText}>
          <Text style={styles.historyTitle}>
            {item.classification.toUpperCase()} CALL
          </Text>
          <Text style={styles.historyExplanation}>{item.explanation}</Text>
        </View>
      </View>
    </LinearGradient>
  );
  
  return (
    <LinearGradient colors={["#0f0f1a", "#1a1a2f"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>SEECURE</Text>
          <Text style={styles.subtitle}>AI-Powered Call Protection</Text>
        </View>

        <View style={styles.statusCard}>
          <LinearGradient
            colors={["#2d2d42", "#252538"]}
            style={styles.gradientCard}
          >
            <View style={styles.statusHeader}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.statusText}>{status}</Text>
            </View>
            
            {results.classification && (
              <View style={styles.resultContainer}>
                <Text style={[
                  styles.resultText,
                  { color: getStatusColor() }
                ]}>
                  {results.classification.toUpperCase()}
                </Text>
                <Text style={styles.explanationText}>{results.explanation}</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        <View style={styles.controls}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { backgroundColor: isMonitoring ? "#ff4757" : "#2ed573" }
              ]}
              onPress={handleToggle}
            >
              <Feather
                name={isMonitoring ? "mic-off" : "mic"}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.chartCard}>
          <LinearGradient
            colors={["#2d2d42", "#252538"]}
            style={styles.gradientCard}
          >
            <Text style={styles.cardTitle}>Call Analysis Overview</Text>
            <PieChart
              data={pieData}
              width={screenWidth - 88}
              height={160}
              chartConfig={{
                color: () => `#fff`,
                backgroundColor:"#000",
                backgroundGradientFrom: "#1e1f21",
                backgroundGradientTo: "#1e1f21",
                decimalPlaces: 0,
              }}
              accessor="count"
              paddingLeft="15" 
            
              absolute
              hasLegend={false}
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#ff4757" }]} />
                <Text style={styles.legendText}>Fraud ({fraudCount})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#2ed573" }]} />
                <Text style={styles.legendText}>Normal ({normalCount})</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.historyCard}>
          <LinearGradient
            colors={["#2d2d42", "#252538"]}
            style={styles.gradientCard}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.cardTitle}>Call History</Text>
              <TouchableOpacity
                onPress={() => setCallHistory([])}
                style={styles.clearButton}
              >
                <MaterialIcons name="delete-sweep" size={20} color="#ff4757" />
              </TouchableOpacity>
            </View>
            {callHistory.map(renderHistoryItem)}
          </LinearGradient>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'left',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Nothing-Regular',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  statusCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradientCard: {
    padding: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  resultText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  explanationText: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  controls: {
    alignItems: 'center',
    marginVertical: 25,
  },
  micButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  chartCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: '#fff',
    fontSize: 12,
  },
  historyCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyItem: {
    borderRadius: 12,
    marginBottom: 10,
    padding: 15,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyText: {
    flex: 1,
  },
  historyTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  historyExplanation: {
    color: '#adb5bd',
    fontSize: 12,
    lineHeight: 16,
  },
  clearButton: {
    padding: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingBottom:10
  },
});