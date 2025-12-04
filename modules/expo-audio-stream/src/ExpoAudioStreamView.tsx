import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoAudioStreamViewProps } from './ExpoAudioStream.types';

const NativeView: React.ComponentType<ExpoAudioStreamViewProps> =
  requireNativeView('ExpoAudioStream');

export default function ExpoAudioStreamView(props: ExpoAudioStreamViewProps) {
  return <NativeView {...props} />;
}
