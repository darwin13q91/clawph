/**
 * Provisioning runner type definitions.
 * Kept in a separate file so both the runner module and API routes can import without circular deps.
 */

export type ProvisioningRunnerStatus = 'idle' | 'running' | 'error' | 'complete';
export type JobState = 'pending' | 'not_started' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type ProvisioningStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ProvisioningStep {
  id: string;
  label: string;
  description?: string;
  status: ProvisioningStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  data?: Record<string, unknown>;
  manualActionRequired?: boolean;
}

export interface ProvisioningRun {
  id: string;
  jobId: string;
  workspaceId: string;
  planId: string;
  status: ProvisioningRunnerStatus;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  steps: ProvisioningStep[];
  metadata?: Record<string, unknown>;
  logs?: string[];
}

export interface ExternalProvisioningConfig {
  commandTemplate?: string;
  scriptPath?: string;
  envVars?: Record<string, string>;
  timeoutSeconds?: number;
}

export interface ProvisioningRunnerOptions {
  externalConfig?: ExternalProvisioningConfig;
  workspaceBaseDir?: string;
  maxConcurrentJobs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}
