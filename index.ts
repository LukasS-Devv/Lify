// Entry point. O serviço de playback do TrackPlayer precisa ser registrado
// antes de o Expo Router montar o app (executa em headless JS no Android).
import TrackPlayer from 'react-native-track-player';
import 'expo-router/entry';
import { playbackService } from '@/services/audio/playbackService';

TrackPlayer.registerPlaybackService(() => playbackService);
