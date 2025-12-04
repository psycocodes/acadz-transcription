import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoAudioStream.types';

type ExpoAudioStreamModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoAudioStreamModule extends NativeModule<ExpoAudioStreamModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoAudioStreamModule, 'ExpoAudioStreamModule');
