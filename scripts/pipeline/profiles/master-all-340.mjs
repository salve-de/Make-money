import { postMortemProfiles } from './master-postmortem.mjs';
import { japanProfiles } from './master-japan.mjs';
import { corpsProfiles } from './master-corps.mjs';
import { d2cProfiles } from './master-d2c.mjs';
import { mediaProfiles } from './master-media-creators.mjs';
import { indieToolsProfiles } from './master-indie-tools.mjs';
import { getFull191Profiles } from '../build-full-191-profiles.mjs';
import { remaining116Profiles } from './master-remaining-116.mjs';

export function getMasterAll340Profiles() {
  return new Map([
    ...postMortemProfiles,
    ...japanProfiles,
    ...corpsProfiles,
    ...d2cProfiles,
    ...mediaProfiles,
    ...indieToolsProfiles,
    ...getFull191Profiles(),
    ...remaining116Profiles
  ]);
}
