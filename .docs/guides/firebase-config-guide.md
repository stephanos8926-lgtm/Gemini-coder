# Firebase Configuration Guide: GitHub Authentication

This guide outlines the steps to enable GitHub Authentication in your Firebase project.

## Steps

1. **Enable GitHub Provider in Firebase Console**
   - Navigate to the Firebase Console.
   - Select your project.
   - Go to **Authentication** > **Sign-in method**.
   - Click **Add new provider** and select **GitHub**.
   - Enable the provider.

2. **Configure GitHub OAuth App**
   - Go to your GitHub account settings > **Developer settings** > **OAuth Apps**.
   - Create a new OAuth App.
   - Set the **Authorization callback URL** to the URL provided by Firebase in the GitHub provider configuration page.
   - Copy the **Client ID** and **Client Secret** from GitHub.

3. **Update Firebase Configuration**
   - Paste the **Client ID** and **Client Secret** into the Firebase Console GitHub provider configuration.
   - Save the configuration.

4. **Update Application Code**
   - Ensure `src/firebase.ts` correctly exports `githubProvider`.
   - Ensure `src/App.tsx` uses `githubProvider` in `signInWithPopup`.
