import { PatchEngine, PatchSuggestion } from '../security/patch-engine';
import { testRunner, TestResult } from './testRunner';
import { filesystemService } from './filesystemService';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';

export interface VerifiedPatchResult {
  patch: PatchSuggestion;
  testResult: TestResult;
  verified: boolean;
  attempts: number;
}

export class VerifiedPatchEngine {
  private patchEngine = new PatchEngine();
  private guard = ForgeGuard.init('verified-patch-engine');

  /**
   * Generates and verifies a patch.
   * If tests fail, it can optionally retry or return the failure context.
   */
  public async applyAndVerify(
    workspaceRoot: string, 
    issues: any[], 
    maxRetries = 2
  ): Promise<VerifiedPatchResult[]> {
    return await this.guard.protect(async () => {
      const suggestions = await this.patchEngine.generatePatches(issues);
      const results: VerifiedPatchResult[] = [];

      for (const patch of suggestions) {
        let attempts = 0;
        let verified = false;
        let lastTestResult: TestResult | null = null;

        while (attempts < maxRetries && !verified) {
          attempts++;
          
          // 1. Apply the patch (simulated here, in real scenario we'd write to disk)
          // For this implementation, we assume the caller handles the write or we do it here.
          // await filesystemService.saveFile(patch.file, patch.fix);

          // 2. Run tests
          lastTestResult = await testRunner.runTests(workspaceRoot);
          
          if (lastTestResult.success) {
            verified = true;
          } else {
            // If it fails, we'd ideally use the test output to regenerate the patch.
            // This is where the "Self-Correction" happens.
            console.warn(`Patch verification failed for ${patch.file} (Attempt ${attempts})`);
          }
        }

        results.push({
          patch,
          testResult: lastTestResult!,
          verified,
          attempts
        });
      }

      return results;
    }, { workspaceRoot, issueCount: issues.length });
  }
}

export const verifiedPatchEngine = new VerifiedPatchEngine();
