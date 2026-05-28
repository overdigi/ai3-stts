import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, watchFile } from 'fs';
import { join } from 'path';

export interface PhonemeFix {
  match: string;
  ssml: string;
}

@Injectable()
export class PhonemeService {
  private readonly logger = new Logger(PhonemeService.name);
  private readonly configPath: string;
  private fixes: PhonemeFix[] = [];

  constructor() {
    this.configPath = join(process.cwd(), 'config', 'phoneme-fixes.json');
    this.load();
    this.watchConfig();
  }

  private load(): void {
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      this.fixes = JSON.parse(raw) as PhonemeFix[];
      this.logger.log(`Loaded ${this.fixes.length} phoneme fixes from ${this.configPath}`);
    } catch {
      this.logger.warn(`phoneme-fixes.json not found or invalid, no fixes applied`);
      this.fixes = [];
    }
  }

  private watchConfig(): void {
    watchFile(this.configPath, { interval: 5000 }, () => {
      this.logger.log('phoneme-fixes.json changed, reloading...');
      this.load();
    });
  }

  reload(): void {
    this.load();
  }

  getFixes(): PhonemeFix[] {
    return this.fixes;
  }

  applyFixes(text: string): string | null {
    if (this.fixes.length === 0) return null;

    const needsFix = this.fixes.some((fix) => text.includes(fix.match));
    if (!needsFix) return null;

    // Step 1: replace matched text with unique placeholders (before any XML escaping)
    const placeholders: Array<{ placeholder: string; ssml: string }> = [];
    let working = text;
    for (let i = 0; i < this.fixes.length; i++) {
      const fix = this.fixes[i];
      if (!working.includes(fix.match)) continue;
      const placeholder = `\x00PHONEME_${i}\x00`;
      placeholders.push({ placeholder, ssml: fix.ssml });
      working = working.split(fix.match).join(placeholder);
    }

    // Step 2: XML-escape the remaining plain text (placeholders contain \x00, safe from escaping)
    working = working
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Step 3: replace placeholders with actual SSML tags
    for (const { placeholder, ssml } of placeholders) {
      working = working.split(placeholder).join(ssml);
    }

    return working;
  }

  buildSsml(ssmlContent: string, voiceName: string): string {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">
  <voice name="${voiceName}">
    ${ssmlContent}
  </voice>
</speak>`;
  }
}
