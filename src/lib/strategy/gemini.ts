const MAX_GEMINI_RESPONSE_CHARS = 128 * 1024;

export function boundedGeminiText(text: string): string {
  if (!text || text.length > MAX_GEMINI_RESPONSE_CHARS) throw new Error('Gemini response exceeded the safety limit');
  return text;
}

export interface GeminiApiResponse {
  text: string;
  sources?: Array<{ title: string; url: string }>;
}

export interface GeminiCallOptions {
  /** 既定は 2048。JSON を返させる用途など、長い出力が要る呼び出しだけ上げる。 */
  maxOutputTokens?: number;
  /** true なら応答を JSON に固定する（responseMimeType）。Google 検索と同時には使えない。 */
  json?: boolean;
  /** 指定すると、この時間で待つのをやめて失敗にする。 */
  timeoutMs?: number;
}

// =========================================================================
// Gemini API による高度推論（APIキー存在時）
// 最安運用: 必要時のみ Google Search Grounding を有効化
// =========================================================================
export async function callGeminiApi(
  prompt: string,
  apiKey: string,
  enableSearch: boolean = false,
  options: GeminiCallOptions = {},
): Promise<GeminiApiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const requestBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      ...(options.json && !enableSearch ? { responseMimeType: 'application/json' } : {}),
    },
  };

  // リアルタイム検索AIが必要な場合のみGoogle検索ツールを有効化（完全無料枠運用・最安化）
  if (enableSearch) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
  });

  if (!resp.ok) {
    throw new Error(`Gemini API returned status ${resp.status}`);
  }

  const data = await resp.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text || '';

  // Google Search Grounding の参照元（URL・タイトル）の抽出
  const sources: Array<{ title: string; url: string }> = [];
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
  if (Array.isArray(groundingChunks)) {
    for (const chunk of groundingChunks) {
      if (chunk?.web?.uri) {
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
        });
      }
    }
  }

  return { text, sources: sources.length > 0 ? sources : undefined };
}
