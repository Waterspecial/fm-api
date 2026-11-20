import { z } from 'zod';

// Zod schemas for the parts of FPL's responses we use.
// Extra fields FPL sends are ignored, so FPL adding a field doesn't break us.
// A field we use going missing or changing type does, on purpose.

export const fplTeamSchema = z.object({
  id: z.number().int(),
  code: z.number().int(),
  name: z.string(),
  short_name: z.string(),
  strength_overall_home: z.number().int(),
  strength_overall_away: z.number().int(),
  strength_attack_home: z.number().int(),
  strength_attack_away: z.number().int(),
  strength_defence_home: z.number().int(),
  strength_defence_away: z.number().int(),
});

export type FplTeam = z.infer<typeof fplTeamSchema>;

// FPL calls gameweeks "events".
export const fplGameweekSchema = z.object({
  id: z.number().int(),
  deadline_time: z.iso.datetime(),
  is_current: z.boolean(),
  is_next: z.boolean(),
  finished: z.boolean(),
  data_checked: z.boolean(),
});

export type FplGameweek = z.infer<typeof fplGameweekSchema>;

// FPL calls players "elements".
export const fplPlayerSchema = z.object({
  id: z.number().int(),
  code: z.number().int(),
  web_name: z.string(),
  team: z.number().int(),
  element_type: z.number().int().min(1).max(4),
  now_cost: z.number().int(),
  status: z.string(),
  news: z.string(),
  chance_of_playing_next_round: z.number().int().nullable(),
});

export type FplPlayer = z.infer<typeof fplPlayerSchema>;

export const fplFixtureSchema = z.object({
  id: z.number().int(),
  code: z.number().int(),
  event: z.number().int().nullable(),
  team_h: z.number().int(),
  team_a: z.number().int(),
  kickoff_time: z.iso.datetime().nullable(),
  team_h_difficulty: z.number().int(),
  team_a_difficulty: z.number().int(),
  team_h_score: z.number().int().nullable(),
  team_a_score: z.number().int().nullable(),
  started: z.boolean(),
  finished: z.boolean(),
});

export type FplFixture = z.infer<typeof fplFixtureSchema>;

// Whole responses: what each FPL endpoint returns.

// /api/bootstrap-static/
export const bootstrapStaticSchema = z.object({
  teams: z.array(fplTeamSchema),
  events: z.array(fplGameweekSchema),
  elements: z.array(fplPlayerSchema),
});

export type BootstrapStatic = z.infer<typeof bootstrapStaticSchema>;

// /api/fixtures/ (a plain list, not an object)
export const fixturesSchema = z.array(fplFixtureSchema);
