const DEFAULT_LEAD_IN_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = (): void => {
      cleanup();
      resolve();
    };
    const onError = (): void => {
      cleanup();
      reject(new Error('Nepavyko įkelti garso'));
    };
    const cleanup = (): void => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
  });
}

export async function playAudioElement(
  audio: HTMLAudioElement,
  options?: { leadInMs?: number },
): Promise<void> {
  const leadInMs = options?.leadInMs ?? DEFAULT_LEAD_IN_MS;
  audio.preload = 'auto';

  await waitForAudioReady(audio);

  if (leadInMs > 0) {
    await delay(leadInMs);
  }

  await audio.play();
}
