import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    type SharedValue
} from 'react-native-reanimated';
import {
    addAudioListener,
    requestPermissionsAsync,
    startRecordingAsync,
    stopRecordingAsync,
    type AudioEvent
} from '../modules/expo-audio-stream';

const MAX_SAMPLES = 50;

const SERVER_URL = 'ws://localhost:8000/ws/transcribe'; 

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- DSP Toggles ---
  const [isRNNoise, setIsRNNoise] = useState(true);
  const [isAGC, setIsAGC] = useState(true);

  const [transcription, setTranscription] = useState("");
  const [serverStatus, setServerStatus] = useState("Disconnected");
  const ws = useRef<WebSocket | null>(null);

  const currentAmplitude = useSharedValue(0);
  const visualizerData = useSharedValue<number[]>(new Array(MAX_SAMPLES).fill(0));

  const connectWebSocket = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    setServerStatus("Connecting...");
    ws.current = new WebSocket(SERVER_URL);

    ws.current.onopen = () => {
        setServerStatus("Connected 🟢");
        // Sync initial state
        sendConfig(isRNNoise, isAGC);
    };
    ws.current.onclose = () => setServerStatus("Disconnected 🔴");
    ws.current.onerror = (e) => setServerStatus("Error ⚠️");
    ws.current.onmessage = (e) => setTranscription(prev => prev + (prev ? " " : "") + e.data);
  };

  // Helper to send JSON config
  const sendConfig = (rnn: boolean, agc: boolean) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ 
              rnnoise_enabled: rnn,
              agc_enabled: agc
          }));
      }
  };

  const toggleRNN = () => {
      const newVal = !isRNNoise;
      setIsRNNoise(newVal);
      sendConfig(newVal, isAGC);
  };

  const toggleAGC = () => {
      const newVal = !isAGC;
      setIsAGC(newVal);
      sendConfig(isRNNoise, newVal);
  };

  useEffect(() => {
    connectWebSocket();
    const subscription = addAudioListener((event: AudioEvent) => {
      currentAmplitude.value = withTiming(event.amplitude, { duration: 50 });
      const newData = [...visualizerData.value];
      newData.shift();
      newData.push(event.amplitude);
      visualizerData.value = newData;

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(event.data);
      }
    });

    return () => {
      subscription.remove();
      ws.current?.close();
    };
  }, []);

  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        await stopRecordingAsync();
        setIsRecording(false);
        currentAmplitude.value = withTiming(0);
        visualizerData.value = new Array(MAX_SAMPLES).fill(0);
      } else {
        if (ws.current?.readyState !== WebSocket.OPEN) connectWebSocket();
        
        const status = await requestPermissionsAsync();
        if (status === 'DENIED') return Alert.alert("Required", "Please grant mic permission");
        if (status === 'REQUESTED') return;

        await startRecordingAsync();
        setIsRecording(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setIsRecording(false);
    }
  };

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(isRecording ? 0.9 : 1) }] }));
  
  const indicatorStyle = useAnimatedStyle(() => {
    const size = interpolate(currentAmplitude.value, [0, 1], [100, 300], Extrapolation.CLAMP);
    const opacity = interpolate(currentAmplitude.value, [0, 0.1, 1], [0.2, 0.5, 0.8], Extrapolation.CLAMP);
    return { width: size, height: size, borderRadius: size / 2, opacity: opacity };
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Acadz Live</Text>
        <Text style={styles.subtitle}>Server: {serverStatus}</Text>
      </View>

      <View style={styles.transcriptContainer}>
        <ScrollView contentContainerStyle={{ padding: 15 }} ref={ref => ref?.scrollToEnd({ animated: true })}>
            <Text style={transcription ? styles.transcriptText : styles.placeholderText}>
                {transcription || `Waiting for speech... ${isRecording ? "(Listening)" : "(Paused)"}`}
            </Text>
        </ScrollView>
      </View>

      <View style={styles.visualizerContainer}>
        <Animated.View style={[styles.pulseIndicator, indicatorStyle]} />
        <View style={styles.waveformContainer}>
          {new Array(MAX_SAMPLES).fill(0).map((_, index) => (
            <WaveformBar key={index} index={index} data={visualizerData} />
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        {/* --- DSP CONTROLS --- */}
        <View style={styles.settingsRow}>
            
            {/* 1. RNNoise Toggle */}
            <TouchableOpacity onPress={toggleRNN} style={[styles.chip, isRNNoise && styles.chipActive]}>
                <Ionicons name="water-outline" size={18} color={isRNNoise ? "white" : "#aaa"} />
                <Text style={[styles.chipText, isRNNoise && styles.chipTextActive]}>
                    Clean: {isRNNoise ? "ON" : "OFF"}
                </Text>
            </TouchableOpacity>

            {/* 2. AGC Toggle */}
            <TouchableOpacity onPress={toggleAGC} style={[styles.chip, isAGC && styles.chipActive]}>
                <Ionicons name="volume-high-outline" size={18} color={isAGC ? "white" : "#aaa"} />
                <Text style={[styles.chipText, isAGC && styles.chipTextActive]}>
                    Boost: {isAGC ? "ON" : "OFF"}
                </Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleToggleRecording} activeOpacity={0.8}>
          <Animated.View style={[styles.recordButton, buttonStyle, isRecording && styles.recordingActive]}>
            <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
        
        <Text style={styles.statusText}>{isRecording ? "Streaming Raw Audio..." : "Tap to Record"}</Text>
      </View>
    </SafeAreaView>
  );
}


const WaveformBar = ({ index, data }: { index: number, data: SharedValue<number[]> }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const value = data.value[index] || 0;
    const height = interpolate(value, [0, 1], [4, 150], Extrapolation.CLAMP);
    const opacity = interpolate(value, [0, 0.05], [0.3, 1], Extrapolation.CLAMP);
    return {
      height: withTiming(height, { duration: 50 }),
      opacity: withTiming(opacity, { duration: 50 }),
      backgroundColor: getColorForAmplitude(value)
    };
  });
  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

const getColorForAmplitude = (value: number) => {
  'worklet';
  if (value > 0.8) return '#ff3b30';
  if (value > 0.5) return '#ffcc00';
  return '#4cd964';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { paddingTop: 20, alignItems: 'center', zIndex: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  subtitle: { fontSize: 14, color: '#888888', marginTop: 5 },
  transcriptContainer: { height: 120, backgroundColor: '#1e1e1e', marginHorizontal: 20, marginTop: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  transcriptText: { color: '#fff', fontSize: 16, lineHeight: 24 },
  placeholderText: { color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  visualizerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pulseIndicator: { position: 'absolute', backgroundColor: '#ffffff', zIndex: -1 },
  waveformContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 100, gap: 2 },
  bar: { width: 4, borderRadius: 2 },
  
  controls: { paddingBottom: 40, paddingHorizontal: 20, alignItems: 'center', backgroundColor: '#121212' },
  settingsRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 30, width: '100%', alignItems: 'center' },
  
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, gap: 8, borderWidth: 1, borderColor: '#333' },
  chipActive: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  chipText: { color: '#aaa', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: 'white' },
  
  recordButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', elevation: 10 },
  recordingActive: { backgroundColor: '#FF3B30', borderWidth: 4, borderColor: '#FFFFFF' },
  statusText: { color: '#888888', marginTop: 15, fontSize: 14 },
  errorText: { color: '#FF3B30', marginBottom: 10 }
});