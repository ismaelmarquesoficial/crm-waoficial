export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive'
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  pipelineStage: string; // e.g., 'lead', 'negotiation'
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tags: string[];
  email?: string;
  company?: string;
  channel?: string;
  notes?: string;
}

export interface Message {
  id: string;
  contactId: string;
  sender: 'user' | 'contact';
  type: MessageType;
  content: string; // Text content or Media URL
  fileName?: string; // For documents
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  channelId?: string;
}

export interface PipelineStage {
  id: string | number;
  name: string;
  color?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'completed';
  sent: number;
  total: number;
  date: string;
}

export interface Template {
  id: string;
  name: string;
  language: string;
  status: 'approved' | 'rejected' | 'pending';
  category: 'marketing' | 'utility' | 'authentication';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent';
  avatar: string;
}