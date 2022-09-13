import * as httpm from "@actions/http-client";

import { Policy } from "./azure-client";

const userAgent = "GitHub multi-repository variant analysis action";

export function getApiClient() {
  return new httpm.HttpClient(userAgent, [], {
    allowRetries: true,
  });
}

const GH_DOTCOM_API_URL = "https://api.github.com";

interface InProgressAnalysis {
  status: "in_progress";
}

interface SuccessfulAnalysis {
  status: "succeeded";
  source_location_prefix: string;
  result_count: number;
  database_commit_sha: string;
}

interface FailedAnalysis {
  status: "failed";
  failure_message: string;
}

type UpdateVariantAnalysis =
  | InProgressAnalysis
  | SuccessfulAnalysis
  | FailedAnalysis;

export async function setVariantAnalysisRepoInProgress(
  controllerRepoId: number,
  variantAnalysisId: number,
  repoId: number
): Promise<void> {
  await updateVariantAnalysisStatus(
    controllerRepoId,
    variantAnalysisId,
    repoId,
    {
      status: "in_progress",
    }
  );
}

export async function setVariantAnalysisRepoSucceeded(
  controllerRepoId: number,
  variantAnalysisId: number,
  repoId: number,
  sourceLocationPrefix: string,
  resultCount: number,
  databaseCommitSha: string
): Promise<void> {
  await updateVariantAnalysisStatus(
    controllerRepoId,
    variantAnalysisId,
    repoId,
    {
      status: "succeeded",
      source_location_prefix: sourceLocationPrefix,
      result_count: resultCount,
      database_commit_sha: databaseCommitSha,
    }
  );
}

export async function setVariantAnalysisFailed(
  controllerRepoId: number,
  variantAnalysisId: number,
  repoId: number,
  failureMessage: string
): Promise<void> {
  await updateVariantAnalysisStatus(
    controllerRepoId,
    variantAnalysisId,
    repoId,
    {
      status: "failed",
      failure_message: failureMessage,
    }
  );
}

async function updateVariantAnalysisStatus(
  controllerRepoId: number,
  variantAnalysisId: number,
  repoId: number,
  data: UpdateVariantAnalysis
): Promise<void> {
  const http = getApiClient();

  const url = `${GH_DOTCOM_API_URL}/repositories/${controllerRepoId}/code-scanning/codeql/variant-analyses/${variantAnalysisId}/repositories/${repoId}`;
  const response = await http.patch(url, JSON.stringify(data));
  if (response.message.statusCode !== 204) {
    console.log(
      `Request to ${url} returned status code ${response.message.statusCode}:
      ${await response.readBody()}`
    );
    throw new Error(
      `Error while setting variant analysis as "${data.status}". Status code: ${response.message.statusCode}`
    );
  }
}

export async function getPolicyForRepoArtifact(
  controllerRepoId: number,
  variantAnalysisId: number,
  repoId: number,
  artifactSize: number
): Promise<Policy> {
  const data = {
    name: "results.zip",
    content_type: "application/zip",
    size: artifactSize,
  };
  const http = getApiClient();

  const url = `${GH_DOTCOM_API_URL}/repositories/${controllerRepoId}/code-scanning/codeql/variant-analyses/${variantAnalysisId}/repositories/${repoId}/artifact`;
  const response = await http.patch(url, JSON.stringify(data));

  if (response.message.statusCode !== 201) {
    console.log(
      `Request to ${url} returned status code ${response.message.statusCode}:
      ${await response.readBody()}`
    );
    throw new Error(
      `Error while getting policy for artifact. Status code: ${response.message.statusCode}`
    );
  }

  return JSON.parse(await response.readBody());
}
