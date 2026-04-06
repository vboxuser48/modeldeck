import type { HardwareProfile } from '@/types/ipc';
import type { CatalogModel } from '@/types/model';

interface EffectiveMemory {
  source: 'vram' | 'ram';
  totalGB: number;
  freeGB: number;
}

type ModelFit = 'ideal' | 'capable' | 'slow' | 'incompatible';

/**
 * Returns the effective memory available for model inference.
 */
export function getEffectiveMemoryGB(profile: HardwareProfile): EffectiveMemory {
  if (profile.vram.detected && profile.vram.totalGB >= 4) {
    return {
      source: 'vram',
      totalGB: profile.vram.totalGB,
      freeGB: profile.vram.totalGB
    };
  }

  return {
    source: 'ram',
    totalGB: profile.ram.totalGB,
    freeGB: Number((profile.ram.freeBytes / 1024 ** 3).toFixed(1))
  };
}

/**
 * Score a model against available hardware.
 */
export function scoreModel(model: CatalogModel, profile: HardwareProfile): ModelFit {
  const effective = getEffectiveMemoryGB(profile);
  const available = effective.totalGB;
  const required = model.ramRequiredGB;

  if (available >= required * 1.4) {
    return 'ideal';
  }
  if (available >= required) {
    return 'capable';
  }
  if (available >= required * 0.6) {
    return 'slow';
  }

  return 'incompatible';
}

/**
 * Returns models split by recommendation tiers.
 */
export function getRecommendedModels(
  catalog: CatalogModel[],
  profile: HardwareProfile
): {
  ideal: CatalogModel[];
  capable: CatalogModel[];
  slow: CatalogModel[];
  incompatible: CatalogModel[];
} {
  const groups = {
    ideal: [] as CatalogModel[],
    capable: [] as CatalogModel[],
    slow: [] as CatalogModel[],
    incompatible: [] as CatalogModel[]
  };

  for (const model of catalog) {
    const fit = scoreModel(model, profile);
    groups[fit].push(model);
  }

  const sortByRequirementThenName = (left: CatalogModel, right: CatalogModel): number => {
    if (left.ramRequiredGB !== right.ramRequiredGB) {
      return left.ramRequiredGB - right.ramRequiredGB;
    }
    return left.name.localeCompare(right.name);
  };

  groups.ideal.sort(sortByRequirementThenName);
  groups.capable.sort(sortByRequirementThenName);
  groups.slow.sort(sortByRequirementThenName);
  groups.incompatible.sort(sortByRequirementThenName);

  return groups;
}
