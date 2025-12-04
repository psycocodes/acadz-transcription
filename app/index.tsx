import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue
} from 'react-native-reanimated';
import { addAudioListener, startRecordingAsync, stopRecordingAsync, type AudioEvent } from '../modules/expo-audio-stream';

const MAX_SAMPLES = 30;

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const currentAmplitude = useSharedValue(0);
  const visualizerData = useSharedValue<number[]>(new Array(MAX_SAMPLES).fill(0));

  useEffect(() => {
    const subscription = addAudioListener((event: AudioEvent) => {
      // Update current amplitude for immediate feedback
      currentAmplitude.value = withTiming(event.amplitude, { duration: 50 });
      
      // Update history for waveform
      const newData = [...visualizerData.value];
      newData.shift();
      newData.push(event.amplitude);
      visualizerData.value = newData;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleToggleRecording = async () => {
    try {
      setError(null);
      if (isRecording) {
        await stopRecordingAsync();
        setIsRecording(false);
        currentAmplitude.value = withTiming(0);
        visualizerData.value = new Array(MAX_SAMPLES).fill(0);
      } else {
        await startRecordingAsync();
        setIsRecording(true);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsRecording(false);
    }
  };

  // Animated styles
  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isRecording ? 0.9 : 1) }
      ]
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    const size = interpolate(
      currentAmplitude.value,
      [0, 1],
      [100, 300],
      Extrapolation.CLAMP
    );
    
    const opacity = interpolate(
      currentAmplitude.value,
      [0, 0.1, 1],
      [0.2, 0.5, 0.8],
      Extrapolation.CLAMP
    );

    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity: opacity,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Audio Stream</Text>
        <Text style={styles.subtitle}>Real-time RMS Visualizer</Text>
      </View>

      <View style={styles.visualizerContainer}>
        {/* Pulsing Background Circle */}
        <Animated.View style={[styles.pulseIndicator, indicatorStyle]} />
        
        {/* Waveform Bars */}
        <View style={styles.waveformContainer}>
          {new Array(MAX_SAMPLES).fill(0).map((_, index) => (
            <WaveformBar 
              key={index} 
              index={index} 
              data={visualizerData} 
            />
          ))}
        </View>
      </View>

      <View style={styles.controls}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        <TouchableOpacity 
          onPress={handleToggleRecording}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.recordButton, buttonStyle, isRecording && styles.recordingActive]}>
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={32} 
              color="#FFFFFF" 
            />
          </Animated.View>
        </TouchableOpacity>
        
        <Text style={styles.statusText}>
          {isRecording ? "Recording Active" : "Tap to Record"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Separate component for individual bars to optimize rendering
const WaveformBar = ({ index, data }: { index: number, data: SharedValue<number[]> }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const value = data.value[index] || 0;
    const height = interpolate(
      value,
      [0, 1],
      [4, 150], // Min height 4, max 150
      Extrapolation.CLAMP
    );
    
    const opacity = interpolate(
      value,
      [0, 0.05],
      [0.3, 1],
      Extrapolation.CLAMP
    );

    return {
      height: withTiming(height, { duration: 50 }),
      opacity: withTiming(opacity, { duration: 50 }),
      backgroundColor: getColorForAmplitude(value)
    };
  });

  return <Animated.View style={[styles.bar, animatedStyle]} />;
};

// Helper to interpolate color based on amplitude
const getColorForAmplitude = (value: number) => {
  'worklet';
  if (value < 0.3) return '#4ADE80'; // Green
  if (value < 0.6) return '#FACC15'; // Yellow
  return '#EF4444'; // Red
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  visualizerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseIndicator: {
    position: 'absolute',
    backgroundColor: '#3B82F6',
    zIndex: 0,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    gap: 4,
    zIndex: 1,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  controls: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  recordingActive: {
    backgroundColor: '#EF4444',
    shadowColor: "#EF4444",
  },
  statusText: {
    color: '#888888',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
});
