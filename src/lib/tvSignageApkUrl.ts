// Resolve a URL de download mais recente do APK do Android TV Signage.
// O workflow do GitHub Actions atualiza public/apps/android-tv-signage-latest.json
// a cada build, apontando para o release rolling "android-tv-signage-latest".
const FALLBACK_URL =
  "https://github.com/Pilar100874/crmpilar/releases/download/android-tv-signage-latest/app-release.apk";
const MANIFEST_URL = "/apps/android-tv-signage-latest.json";

export type TvSignageApkInfo = {
  url: string;
  versionName?: string;
  versionCode?: number;
  updated_at?: string;
};

let cached: TvSignageApkInfo | null = null;

export async function getLatestTvSignageApkInfo(): Promise<TvSignageApkInfo> {
  if (cached) return cached;
  try {
    const res = await fetch(`${MANIFEST_URL}?_=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.url && typeof data.url === "string") {
        cached = {
          url: data.url,
          versionName: data.versionName,
          versionCode: data.versionCode,
          updated_at: data.updated_at,
        };
        return cached;
      }
    }
  } catch {
    // ignore, use fallback
  }
  cached = { url: FALLBACK_URL };
  return cached;
}

export async function getLatestTvSignageApkUrl(): Promise<string> {
  return (await getLatestTvSignageApkInfo()).url;
}

export const TV_SIGNAGE_APK_FILENAME = "pareamento-pilar-remotas.apk";
