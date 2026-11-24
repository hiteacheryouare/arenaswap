import { i18n } from '#i18n';
import { boostPresentation, isBoostId, isModeSignalId, signalPresentation } from '@arenaswap/ui/src/components/scoringModeMeta';

export const signalLabel = (id: string): string => (isModeSignalId(id) ? i18n.t(signalPresentation[id].labelKey) : id);
export const boostLabel = (id: string): string => (isBoostId(id) ? i18n.t(boostPresentation[id].labelKey) : id);
