import * as React from 'react';

import { ExpoAudioStreamViewProps } from './ExpoAudioStream.types';

export default function ExpoAudioStreamView(props: ExpoAudioStreamViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
