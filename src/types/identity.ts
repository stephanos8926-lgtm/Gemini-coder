export interface UserProfile {
  id: string; // UUIDv5(username@public-key)
  username: string;
  email: string;
  emailValidated: boolean;
  fullName: string;
  registrationDate: string;
  tier: 'free' | 'pro' | 'enterprise'; // Placeholder for future tier system
  lastLogin: string;
  status: 'online' | 'offline' | 'dormant';
  systemState: 'new' | 'normal' | 'review' | 'temp_ban' | 'perm_ban';
  adminComment: string;
  publicKey: string; // Stored public key (Base64)
  createdAt: string;
}

export interface FilesystemJournal {
  ownerId: string;
  ownerEmail: string;
  masterHash: string; // Blake3
  totalFileCount: number;
  totalSizeKB: number;
  lastAccessedFile: string;
  lastAccessedTimestamp: string;
  snapshotPath: string; // URL to storage blob
  createdAt: string;
}
