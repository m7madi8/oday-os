export type AppStage = 'development' | 'preview' | 'production';

export function appStage(envValue: string | undefined): AppStage {
  const env = String(envValue || '').trim().toLowerCase();
  if (env === 'production') return 'production';
  if (env === 'preview') return 'preview';
  return 'development';
}

export function isHttpsOrigin(url: string) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function isLoopbackOrigin(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function resolveApiUrl(input: {
  stage: AppStage;
  stored: string;
  envUrl: string;
  allowDevelopmentFallback: boolean;
}): string {
  const candidate = input.stored || input.envUrl;
  if (input.stage === 'production') {
    if (!candidate || !isHttpsOrigin(candidate) || isLoopbackOrigin(candidate)) return '';
    return candidate;
  }
  if (input.stage === 'preview') {
    if (!candidate || isLoopbackOrigin(candidate)) return '';
    return candidate;
  }
  if (candidate) return candidate;
  if (input.allowDevelopmentFallback) return 'http://127.0.0.1:8000';
  return '';
}

export function acceptServerUrl(stage: AppStage, url: string) {
  if (!url) return '';
  if (stage === 'production' && (!isHttpsOrigin(url) || isLoopbackOrigin(url))) return '';
  if (stage === 'preview' && isLoopbackOrigin(url)) return '';
  return url;
}
