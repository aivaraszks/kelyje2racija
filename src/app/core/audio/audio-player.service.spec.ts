import { TestBed } from '@angular/core/testing';
import { AudioPlayerService } from './audio-player.service';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  currentTime = 0;
  preload = '';
  playResult: () => Promise<void> = () => Promise.resolve();
  private listeners = new Map<string, (() => void)[]>();

  constructor() {
    FakeAudio.instances.push(this);
  }
  addEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  emit(type: string): void {
    this.listeners.get(type)?.forEach((fn) => fn());
  }
  play = vi.fn(() => this.playResult());
  pause = vi.fn();
}

describe('AudioPlayerService', () => {
  let service: AudioPlayerService;
  const audio = () => FakeAudio.instances[0];
  const a = { id: 'a', file: 'sounds/a.mp3' };
  const b = { id: 'b', file: 'sounds/b.mp3' };

  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FakeAudio);
    service = TestBed.inject(AudioPlayerService);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts idle', () => {
    expect(service.status()).toBe('idle');
    expect(service.playingId()).toBeNull();
  });

  it('calls audio.play() synchronously, goes loading, then playing', async () => {
    const promise = service.play(a);
    expect(audio().play).toHaveBeenCalledTimes(1);
    expect(audio().src).toBe('sounds/a.mp3');
    expect(service.status()).toBe('loading');
    expect(service.playingId()).toBe('a');
    audio().emit('playing');
    expect(service.status()).toBe('playing');
    await expect(promise).resolves.toBe(true);
  });

  it('reuses one element and stops the previous clip when a new one starts', () => {
    void service.play(a);
    void service.play(b);
    expect(FakeAudio.instances).toHaveLength(1);
    expect(audio().pause).toHaveBeenCalledTimes(2);
    expect(audio().src).toBe('sounds/b.mp3');
    expect(service.playingId()).toBe('b');
  });

  it('returns to idle when the clip ends', () => {
    void service.play(a);
    audio().emit('playing');
    audio().emit('ended');
    expect(service.status()).toBe('idle');
    expect(service.playingId()).toBeNull();
  });

  it('stop() pauses and resets', () => {
    void service.play(a);
    service.stop();
    expect(audio().pause).toHaveBeenCalled();
    expect(service.status()).toBe('idle');
    expect(service.playingId()).toBeNull();
  });

  it('reports an error when play() rejects', async () => {
    void service.play(a);
    audio().playResult = () => Promise.reject(new DOMException('x', 'NotAllowedError'));
    await expect(service.play(b)).resolves.toBe(false);
    expect(service.status()).toBe('error');
    expect(service.playingId()).toBeNull();
  });

  it('ignores a rejected play() of a clip that was already replaced', async () => {
    void service.play(a);
    audio().playResult = () => Promise.reject(new DOMException('x', 'AbortError'));
    const first = service.play(b);
    audio().playResult = () => Promise.resolve();
    const second = service.play(a);
    await first;
    await second;
    expect(service.playingId()).toBe('a');
    expect(service.status()).not.toBe('error');
  });

  it('reports an error on a media error event', () => {
    void service.play(a);
    audio().emit('error');
    expect(service.status()).toBe('error');
  });
});
