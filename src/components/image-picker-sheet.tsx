import { Modal, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (uri: string) => void;
}

export function ImagePickerSheet({ visible, onClose, onPick }: Props) {
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
      onClose();
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
      onClose();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={s.container}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.bar} />
          <Text style={s.title}>Add Product Image</Text>

          <Pressable style={s.option} onPress={takePhoto}>
            <Text style={s.optionIcon}>📷</Text>
            <View>
              <Text style={s.optionLabel}>Take a Photo</Text>
              <Text style={s.optionSub}>Use your camera</Text>
            </View>
          </Pressable>

          <Pressable style={s.option} onPress={pickFromGallery}>
            <Text style={s.optionIcon}>🖼️</Text>
            <View>
              <Text style={s.optionLabel}>Choose from Gallery</Text>
              <Text style={s.optionSub}>Pick from your photo library</Text>
            </View>
          </Pressable>

          <Pressable style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  bar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionIcon: { fontSize: 28 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  optionSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
