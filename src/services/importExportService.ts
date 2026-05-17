import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { createBackupPayload, restoreBackup, serializeBackup } from "./backupService";
import { dateKey } from "../utils/time";

export async function exportBackupFile(): Promise<string> {
  const payload = await createBackupPayload();
  const filename = `lifeos-backup-${dateKey()}.json`;
  const uri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, serializeBackup(payload), { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/json",
      dialogTitle: "Export LifeOS backup",
      UTI: "public.json",
    });
  }
  return uri;
}

export async function importBackupFile(): Promise<void> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return;
  const uri = result.assets[0]?.uri;
  if (!uri) throw new Error("No backup file selected.");
  const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  await restoreBackup(raw);
}
