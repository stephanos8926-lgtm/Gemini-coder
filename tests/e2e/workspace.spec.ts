import { test, expect } from '@playwright/test';

test('can create a new workspace', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Open workspace modal
  await page.click('button:has-text("Workspaces")');
  await expect(page.locator('text=Create Workspace')).toBeVisible();
  
  // Fill workspace name
  await page.fill('input[name="workspaceName"]', 'test-workspace');
  await page.click('button:has-text("Create")');
  
  // Verify workspace is created
  await expect(page.locator('text=test-workspace')).toBeVisible();
});
