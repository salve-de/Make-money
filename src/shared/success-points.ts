import points from '../../data/success-points.json';
import { textFingerprint } from './list-lines';
import { screenText } from './display-text';

/**
 * 「成功の秘訣」。その事例で効いたことを、見出し（やった事）＋根拠の事実（実際に起きた事）の組で並べる画面用の編集文。
 * 根拠は reader.facts の1件に紐づき、その文が変わったら（指紋が合わなくなったら）その1組は出さない。
 * 元の事実に無い事は書かない。真似の手順にしない（やった事の記録）。
 */
interface Point {
  head: string;
  body: string;
  factId: string;
  factHash: string;
}

const BY_ENTITY = new Map<string, Point[]>((points as Array<{ entityId: string; points: Point[] }>).map((p) => [p.entityId, p.points]));

export function successPointsFor(entityId: string | undefined, facts: ReadonlyArray<{ id: string; text: string }>): Array<{ head: string; body: string }> {
  const list = entityId ? BY_ENTITY.get(entityId) : undefined;
  if (!list) return [];
  const byId = new Map(facts.map((fact) => [fact.id, fact.text]));
  return list.filter((p) => {
    const text = byId.get(p.factId);
    return text !== undefined && textFingerprint(text) === p.factHash;
  }).map(({ head, body }) => ({ head: screenText(head), body: screenText(body) }));
}
