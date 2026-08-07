export interface VoiceChoice {
  id: string;
  label: string;
  aliases?: string[];
  speechId?: string;
  activate?: () => void;
}

export interface VoiceTurn {
  id?: string;
  key?: string;
  text: string;
  speaker?: string;
  emotion?: string;
  choices?: VoiceChoice[];
  metadata?: Record<string, unknown>;
}

export interface TTSProvider {
  name: string;
  speak(utterance: Record<string, unknown> & { id: string; text: string }): Promise<Record<string, unknown>>;
  stop?(): void | Promise<void>;
}

export interface STTProvider {
  name: string;
  listenOnce(options?: { onStatus?: (value: string) => void; onInterim?: (value: string) => void; signal?: AbortSignal }): Promise<{ text: string; alternatives?: string[] }>;
  stop?(): void | Promise<void>;
}

export class Observer {
  constructor(options?: { maxEvents?: number; onEvent?: (event: Record<string, unknown>, observer: Observer) => void });
  events: Record<string, unknown>[];
  record(type: string, fields?: Record<string, unknown>): Record<string, unknown>;
  export(extra?: Record<string, unknown>): Record<string, unknown>;
  reset(): void;
}

export class AccessibilityRuntime extends EventTarget {
  constructor(options: { tts: TTSProvider; stt: STTProvider; observer?: Observer; scope?: string; readChoices?: boolean; maxRetries?: number; locale?: string });
  present(turn: VoiceTurn): Promise<VoiceChoice | null>;
  speak(utterance: Record<string, unknown> & { id: string; text: string }): Promise<Record<string, unknown>>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
}

export class BrowserTTSProvider implements TTSProvider { name: string; constructor(options?: Record<string, unknown>); speak(utterance: any): Promise<any>; stop(): void; }
export class ManifestTTSProvider implements TTSProvider { name: string; constructor(options?: Record<string, unknown>); speak(utterance: any): Promise<any>; stop(): void; }
export class VocalBridgeSTTProvider implements STTProvider { name: string; constructor(options?: Record<string, unknown>); connect(onStatus?: (value: string) => void): Promise<boolean>; listenOnce(options?: any): Promise<any>; stop(): Promise<void>; disconnect(): Promise<void>; }
export class TwineHarloweAdapter { constructor(options: { runtime: AccessibilityRuntime; storyId?: string; passageSelector?: string; choiceSelector?: string; settleMs?: number }); start(): this; stop(): void; }
export class GameEngineAdapter extends EventTarget { constructor(options: { runtime: AccessibilityRuntime; scope?: string }); present(turn: VoiceTurn): Promise<VoiceChoice | null>; stop(): Promise<void>; }
export class WindowMessageGameEngineAdapter extends GameEngineAdapter { start(): this; destroy(): Promise<void>; }
export function matchChoices(alternatives: string | string[], choices: Array<VoiceChoice | string>): { index: number; score: number; margin: number; via: string; confident: boolean };
export function stableLineId(scope: string, key: string, text: string): string;
