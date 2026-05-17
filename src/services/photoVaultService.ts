import * as FileSystem from "expo-file-system/legacy";
import { createEvent } from "../db/repository";
import { nowIso } from "../utils/time";

const VAULT_DIR = `${FileSystem.documentDirectory}vault/photos/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
}

export async function savePhotoToVault(sourceUri: string): Promise<string> {
  await ensureDir();
  const filename = `photo_${Date.now()}.jpg`;
  const target = `${VAULT_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: target });
  await createEvent({ type: "note", title: "Photo captured", note: `Saved photo: ${filename}\n${nowIso()}` });
  return target;
}

export async function listVaultPhotos(): Promise<Array<{ name: string; uri: string }>> {
  await ensureDir();
  const names = await FileSystem.readDirectoryAsync(VAULT_DIR);
  return names
    .filter((name) => name.toLowerCase().endsWith(".jpg"))
    .sort()
    .reverse()
    .map((name) => ({ name, uri: `${VAULT_DIR}${name}` }));
}

