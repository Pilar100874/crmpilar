// Resolve a URL de download mais recente do APK do Android TV Signage.
// O workflow do GitHub Actions atualiza public/apps/android-tv-signage-latest.json
// a cada build, apontando para o release rolling "android-tv-signage-latest".
const FALLBACK_URL =
  "/__l5e/assets-v1/22639f5c-8527-42b2-8fe0-01f9fee05946/pareamento-pilar-remotas-v1.1.3.apk";
const MANIFEST_URL = "/apps/android-tv-signage-latest.json";

let cached: string | null = null;

export async function getLatestTvSignageApkUrl(): Promise<string> {
  if (cached) return cached;
  try {
    const res = await fetch(`${MANIFEST_URL}?_=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.url && typeof data.url === "string") {
        cached = data.url;
        return data.url;
      }
    }
  } catch {
    // ignore, use fallback
  }
  cached = FALLBACK_URL;
  return FALLBACK_URL;
}

export const TV_SIGNAGE_APK_FILENAME = "pareamento-pilar-remotas.apk";
