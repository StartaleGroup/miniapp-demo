import { miniAppHost } from "@farcaster/miniapp-sdk";

export type MissionStatus = {
  completed: boolean;
  amountAwarded: number;
  completedAt?: string;
  timesProgressed: number;
} | null;

type StartaleNamespace = {
  startale: {
    getMissionStatus: () => Promise<MissionStatus>;
    completeMission: () => Promise<{ success: true }>;
  };
};

const host = miniAppHost as unknown as StartaleNamespace;

export const getMissionStatus = () => host.startale.getMissionStatus();
export const completeMission = () => host.startale.completeMission();
