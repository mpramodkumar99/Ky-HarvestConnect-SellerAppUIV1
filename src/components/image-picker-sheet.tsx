import { Modal, View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppColors, type AppColors } from '@/hooks/use-app-colors';

interface Props {
  visible:        boolean;
  onClose:        () => void;
  onPick:         (uri: string) => void;
  title?:         string;
  sizeHint?:      string;
  aspect?:        [number, number];
  allowsEditing?: boolean;
}

export function ImagePickerSheet({
  visible, onClose, onPick,
  title         = 'Add Image',
  sizeHint,
  aspect        = [4, 3],
  allowsEditing = true,
}: Props) {
  const c = useAppColors();
  const s = makeStyles(c);
  // uCrop (Android's native crop activity) crashes on any aspect ratio — skip editing on Android
  const editing = allowsEditing && Platform.OS !== 'android';

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: editing,
      aspect: editing ? aspect : undefined,
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
      quality: 0.85,
      allowsEditing: editing,
      aspect: editing ? aspect : undefined,
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
          <Text style={s.title}>{title}</Text>
          {sizeHint && (
            <View style={s.hintRow}>
              <Text style={s.hintIcon}>📐</Text>
              <Text style={s.hintTxt}>Recommended: {sizeHint}</Text>
            </View>
          )}

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

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop:  { backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 36,
      paddingTop: 12,
    },
    bar: {
      alignSelf: 'center',
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.borderMid, marginBottom: 16,
    },
    title: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 6 },

    hintRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.primaryBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
      marginBottom: 8,
    },
    hintIcon: { fontSize: 14 },
    hintTxt:  { fontSize: 12, color: c.primaryText, fontWeight: '500' },

    option: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    optionIcon:  { fontSize: 28 },
    optionLabel: { fontSize: 15, fontWeight: '600', color: c.text },
    optionSub:   { fontSize: 12, color: c.textMuted, marginTop: 2 },

    cancelBtn: {
      marginTop: 16, paddingVertical: 14,
      borderRadius: 12, borderWidth: 1.5, borderColor: c.border,
      alignItems: 'center',
    },
    cancelTxt: { fontSize: 15, fontWeight: '600', color: c.textSub },
  });
}
