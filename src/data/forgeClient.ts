import { createClient, type ForgeDBClient } from '@forgedb/client';

/**
 * ForgeDB 클라이언트 단일 인스턴스.
 *
 * 환경변수(VITE_FORGEDB_URL, VITE_FORGEDB_PROJECT_ID, VITE_FORGEDB_ANON_KEY)가
 * 모두 설정된 경우에만 실제 ForgeDB 프로젝트에 연결합니다. 하나라도 비어 있으면
 * `isConfigured()` 가 false 를 반환하고, DataContext 가 자동으로 오프라인(시드 +
 * localStorage) 모드로 동작합니다. 이 덕분에 백엔드 키 없이도 데모/미리보기가
 * 동작합니다.
 */
const rawUrl = (import.meta.env.VITE_FORGEDB_URL as string | undefined)?.trim();
const rawProjectId = (import.meta.env.VITE_FORGEDB_PROJECT_ID as string | undefined)?.trim();
const rawAnonKey = (import.meta.env.VITE_FORGEDB_ANON_KEY as string | undefined)?.trim();

// .env.example 의 placeholder 값이 그대로 들어와도 *구성된 것으로 잘못 인식*되지 않도록
// 명백한 placeholder 문자열은 비어 있는 것으로 취급합니다.
const isPlaceholder = (v: string | undefined) =>
  !v ||
  v === '' ||
  /^(your[_-]|placeholder|example|change[_-]?me|<.+>|\$\{)/i.test(v);

const url = isPlaceholder(rawUrl) ? undefined : rawUrl;
const projectId = isPlaceholder(rawProjectId) ? undefined : rawProjectId;
const anonKey = isPlaceholder(rawAnonKey) ? undefined : rawAnonKey;

export const isForgeConfigured = Boolean(url && projectId && anonKey);

// 어떤 환경변수가 누락/placeholder 인지 디버깅용으로 노출
export const forgeConfigStatus = {
  url: !!url,
  projectId: !!projectId,
  anonKey: !!anonKey,
};

let _client: ForgeDBClient | null = null;

export function getForge(): ForgeDBClient {
  if (!isForgeConfigured) {
    const missing = Object.entries(forgeConfigStatus)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    throw new Error(
      `[ForgeDB] 환경변수가 설정되지 않았습니다 (누락: ${missing.join(', ') || 'unknown'}). ` +
        '.env.example 을 참고해 VITE_FORGEDB_* 값을 채워주세요.'
    );
  }
  if (!_client) {
    _client = createClient({
      url: url!,
      projectId: projectId!,
      anonKey: anonKey!,
      storageKey: 'forgedb.yukye.session',
    });
  }
  return _client;
}

export const FORGEDB_PROJECT_ID = projectId ?? '';