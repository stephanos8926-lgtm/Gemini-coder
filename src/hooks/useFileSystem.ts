import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesystemService } from '../lib/filesystemService';
import { useFirebase } from '../contexts/FirebaseContext';

export function useWorkspaces() {
  const { idToken } = useFirebase();
  return useQuery({
    queryKey: ['workspaces', idToken],
    queryFn: () => filesystemService.listWorkspaces(),
    enabled: !!idToken,
  });
}

export function useFiles(workspace: string, path: string = '', recursive: boolean = false) {
  const { idToken } = useFirebase();
  return useQuery({
    queryKey: ['files', workspace, path, recursive, idToken],
    queryFn: () => {
      filesystemService.setWorkspace(workspace);
      return filesystemService.listFiles(path, recursive);
    },
    enabled: !!idToken && !!workspace,
  });
}

export function useFileContent(workspace: string, path: string) {
  const { idToken } = useFirebase();
  return useQuery({
    queryKey: ['fileContent', workspace, path, idToken],
    queryFn: () => {
      filesystemService.setWorkspace(workspace);
      return filesystemService.getFileContent(path);
    },
    enabled: !!idToken && !!path && !!workspace,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useFileSystemMutations() {
  const queryClient = useQueryClient();
  const { user } = useFirebase();

  const saveFileMutation = useMutation({
    mutationFn: ({ workspace, path, content }: { workspace: string, path: string, content: string }) => {
      filesystemService.setWorkspace(workspace);
      return filesystemService.saveFile(path, content);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fileContent', variables.workspace, variables.path] });
    },
  });

  const createFileMutation = useMutation({
    mutationFn: ({ workspace, path, isDir }: { workspace: string, path: string, isDir?: boolean }) => {
      filesystemService.setWorkspace(workspace);
      return filesystemService.createFile(path, isDir);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.workspace] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: ({ workspace, path }: { workspace: string, path: string }) => {
      filesystemService.setWorkspace(workspace);
      return filesystemService.deleteFile(path);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.workspace] });
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: ({ workspace, oldPath, newPath }: { workspace: string, oldPath: string, newPath: string }) => {
      filesystemService.setWorkspace(workspace);
      return filesystemService.renameFile(oldPath, newPath);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', variables.workspace] });
      queryClient.invalidateQueries({ queryKey: ['fileContent', variables.workspace, variables.oldPath] });
    },
  });

  return {
    saveFileMutation,
    createFileMutation,
    deleteFileMutation,
    renameFileMutation,
  };
}
