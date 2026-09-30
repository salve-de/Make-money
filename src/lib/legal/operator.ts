import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';

/** 特定商取引法の表記に使う運営者情報。値は環境変数で設定する（コードに個人情報を置かない）。 */
export interface OperatorInfo {
  name: string | null;
  representative: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export const OPERATOR_ENV_NAMES = {
  name: 'LEGAL_OPERATOR_NAME',
  representative: 'LEGAL_REPRESENTATIVE',
  address: 'LEGAL_ADDRESS',
  phone: 'LEGAL_PHONE',
  email: 'LEGAL_EMAIL',
} as const;

export async function readOperatorInfo(): Promise<OperatorInfo> {
  const entries = await Promise.all(
    Object.entries(OPERATOR_ENV_NAMES).map(async ([key, envName]) => [key, (await getRuntimeEnvValue(envName)) ?? null] as const),
  );
  return Object.fromEntries(entries) as unknown as OperatorInfo;
}

/** 所在地と電話番号は、請求があれば遅滞なく開示すると表示すれば省略できる（特定商取引法第11条ただし書き）。 */
export const DISCLOSED_ON_REQUEST = '請求があった場合は遅滞なく開示します';
export const NOT_CONFIGURED = '準備中';
