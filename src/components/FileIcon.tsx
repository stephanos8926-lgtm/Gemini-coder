import React from 'react';
import { 
  File, 
  FileCode, 
  FileJson, 
  FileText, 
  FileType, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileArchive,
  Hash,
  Layout,
  Code2,
  Braces,
  Terminal,
  Database,
  Key,
  Shield
} from 'lucide-react';

interface FileIconProps {
  filename: string;
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, className }) => {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className={`${className} text-yellow-500`} />;
    case 'json':
      return <FileJson className={`${className} text-orange-400`} />;
    case 'html':
      return <Layout className={`${className} text-orange-600`} />;
    case 'css':
    case 'scss':
    case 'less':
      return <Hash className={`${className} text-blue-400`} />;
    case 'md':
    case 'txt':
      return <FileText className={`${className} text-gray-400`} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage className={`${className} text-purple-400`} />;
    case 'mp4':
    case 'mov':
    case 'webm':
      return <FileVideo className={`${className} text-pink-400`} />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <FileAudio className={`${className} text-pink-400`} />;
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
      return <FileArchive className={`${className} text-yellow-600`} />;
    case 'sql':
      return <Database className={`${className} text-blue-500`} />;
    case 'sh':
    case 'bash':
    case 'zsh':
      return <Terminal className={`${className} text-green-500`} />;
    case 'py':
      return <Code2 className={`${className} text-blue-400`} />;
    case 'env':
    case 'example':
      return <Key className={`${className} text-yellow-400`} />;
    case 'lock':
      return <Shield className={`${className} text-red-400`} />;
    case 'yml':
    case 'yaml':
      return <FileJson className={`${className} text-purple-400`} />;
    default:
      return <File className={`${className} text-gray-400`} />;
  }
};
