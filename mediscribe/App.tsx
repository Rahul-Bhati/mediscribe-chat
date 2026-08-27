import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatScreen } from './src/screens/ChatScreen';

export default function App() {
  return (
    // GiftedChat mounts its own SafeAreaProvider and ActionSheetProvider
    // internally, but ChatScreen sits above both and needs them too.
    <SafeAreaProvider>
      <ActionSheetProvider>
        <>
          <StatusBar style="dark" />
          <ChatScreen />
        </>
      </ActionSheetProvider>
    </SafeAreaProvider>
  );
}
