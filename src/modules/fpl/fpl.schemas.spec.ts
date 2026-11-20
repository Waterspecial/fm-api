import { readFileSync } from 'node:fs';
import { bootstrapStaticSchema, fixturesSchema } from './fpl.schemas.js';

// The real FPL responses saved in FM-006.
const SNAPSHOT_DIR = new URL('../../../prisma/seed/fpl/', import.meta.url);

function readSnapshot(name: string): unknown {
  return JSON.parse(readFileSync(new URL(name, SNAPSHOT_DIR), 'utf8'));
}

describe('FPL schemas', () => {
  it('accept the saved bootstrap-static response', () => {
    const data = bootstrapStaticSchema.parse(
      readSnapshot('bootstrap-static.json'),
    );

    expect(data.teams).toHaveLength(20);
    expect(data.events).toHaveLength(38);
    expect(data.elements).toHaveLength(668);
  });

  it('accept the saved fixtures response', () => {
    const data = fixturesSchema.parse(readSnapshot('fixtures.json'));

    expect(data).toHaveLength(380);
  });

  it('reject a player with a missing field, naming the field', () => {
    const data = readSnapshot('bootstrap-static.json') as {
      elements: Record<string, unknown>[];
    };
    delete data.elements[0].now_cost;

    expect(() => bootstrapStaticSchema.parse(data)).toThrow('now_cost');
  });
});
