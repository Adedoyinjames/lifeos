import * as Contacts from "expo-contacts";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import * as Location from "expo-location";

const APP_PACKAGES: Record<string, string> = {
  chrome: "com.android.chrome",
  gmail: "com.google.android.gm",
  messages: "com.google.android.apps.messaging",
  phone: "com.google.android.dialer",
  spotify: "com.spotify.music",
  whatsapp: "com.whatsapp",
  youtube: "com.google.android.youtube",
  "youtube music": "com.google.android.apps.youtube.music",
};

export async function callNumber(numberOrCode: string): Promise<void> {
  const cleaned = numberOrCode.replace(/[^\d+#*]/g, "");
  if (cleaned.length < 3) throw new Error("Give me a phone number or USSD code to dial.");
  await Linking.openURL(`tel:${cleaned}`);
}

export async function callContactOrNumber(nameOrNumber: string): Promise<string> {
  const direct = nameOrNumber.replace(/[^\d+#*]/g, "");
  if (direct.length >= 3) {
    await callNumber(direct);
    return nameOrNumber;
  }
  const permission = await Contacts.requestPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Contact permission is needed to call by name. You can still say a phone number.");
  }
  const response = await Contacts.getContactsAsync({
    name: nameOrNumber,
    fields: [Contacts.Fields.PhoneNumbers],
    pageSize: 5,
  });
  const contact = response.data.find((item) => item.phoneNumbers?.[0]?.number);
  const number = contact?.phoneNumbers?.[0]?.number;
  if (!contact || !number) {
    throw new Error(`I could not find a phone number for "${nameOrNumber}".`);
  }
  await callNumber(number);
  return contact.name ?? nameOrNumber;
}

export async function openKnownApp(name: string): Promise<void> {
  const key = name.toLowerCase().trim();
  const packageName = APP_PACKAGES[key];
  if (!packageName) {
    throw new Error(`I do not know the package for "${name}" yet. Try Chrome, Gmail, WhatsApp, YouTube, Spotify, Messages, or Phone.`);
  }
  await IntentLauncher.openApplication(packageName);
}

export async function playMusic(query?: string): Promise<void> {
  try {
    await IntentLauncher.openApplication(APP_PACKAGES.spotify);
  } catch {
    const encoded = encodeURIComponent(query || "music");
    await Linking.openURL(`https://music.youtube.com/search?q=${encoded}`);
  }
}

export async function openAssistantSystemSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_SETTINGS);
}

export function knownApps(): string[] {
  return Object.keys(APP_PACKAGES);
}

export async function pickFile(): Promise<{ name: string; uri: string; mimeType?: string; size?: number } | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: "*/*" });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri || !asset?.name) return null;
  return { name: asset.name, uri: asset.uri, mimeType: asset.mimeType, size: asset.size };
}

export async function readTextFileMaybe(uri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    if (info.size && info.size > 200_000) return null;
    const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    return text.trim() || null;
  } catch {
    return null;
  }
}

export async function getCurrentLocationSummary(): Promise<string> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission is needed for maps and travel estimates.");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return `Latitude ${position.coords.latitude.toFixed(5)}, longitude ${position.coords.longitude.toFixed(5)}.`;
}

export async function openDirections(destination: string): Promise<void> {
  const encoded = encodeURIComponent(destination);
  await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`);
}

export async function openMapsSearch(query: string): Promise<void> {
  await Linking.openURL(`geo:0,0?q=${encodeURIComponent(query)}`);
}
