import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { Card } from "../src/components/Card";
import { Screen } from "../src/components/Screen";
import { colors, spacing } from "../src/components/theme";
import { savePhotoToVault } from "../src/services/photoVaultService";

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!permission) {
    return <Screen title="Camera" subtitle="Loading camera permissions..."> <View /> </Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen title="Camera" subtitle="We need camera access to take pictures.">
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.body}>Camera permission is required to take pictures inside LifeOS.</Text>
          <AppButton label="Grant Camera Permission" onPress={() => void requestPermission()} />
          <AppButton label="Back" onPress={() => router.back()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  async function takePicture() {
    try {
      setBusy(true);
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85, exif: false });
      if (!photo?.uri) throw new Error("No photo captured.");
      setPreviewUri(photo.uri);
    } catch (error) {
      Alert.alert("Camera error", error instanceof Error ? error.message : "Could not take photo.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!previewUri) return;
    try {
      setBusy(true);
      await savePhotoToVault(previewUri);
      Alert.alert("Saved", "Photo stored safely inside LifeOS.");
      setPreviewUri(null);
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Could not save photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Camera" subtitle="Take pictures safely. LifeOS will not delete any files.">
      <Card style={styles.cameraCard}>
        <CameraView ref={(ref) => (cameraRef.current = ref)} style={styles.camera} facing={facing} />
        <View style={styles.cameraControls}>
          <AppButton label="Snap" onPress={() => void takePicture()} disabled={busy} />
          <AppButton label="Flip" onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))} disabled={busy} variant="secondary" />
          <AppButton label="Back" onPress={() => router.back()} disabled={busy} variant="ghost" />
        </View>
      </Card>

      {previewUri ? (
        <Card style={{ gap: spacing.md }}>
          <Text style={styles.title}>Preview</Text>
          <Image source={{ uri: previewUri }} style={styles.preview} />
          <View style={styles.row}>
            <AppButton label="Save To LifeOS" onPress={() => void save()} disabled={busy} />
            <AppButton label="Retake" onPress={() => setPreviewUri(null)} disabled={busy} variant="secondary" />
          </View>
          <Pressable onPress={() => setPreviewUri(null)}>
            <Text style={styles.body}>Tap retake if the image is not right.</Text>
          </Pressable>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraCard: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  camera: {
    height: 420,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  cameraControls: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  title: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  preview: {
    width: "100%",
    height: 320,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});

