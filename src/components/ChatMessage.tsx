import React from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  onDelete?: () => void;
  canDelete?: boolean;
  isLoading?: boolean;
}

const ChatMessage = ({ type, content, isError = false, onDelete, canDelete = false }: ChatMessageProps) => {
  const isUser = type === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full glass flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? isError
                ? 'error-glass text-destructive-foreground'
                : 'chat-message-user text-primary-foreground'
              : 'chat-message-assistant text-foreground'
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
          
          {/* Delete button for invalid feedback */}
          {canDelete && onDelete && (
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          )}
        </motion.div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full chat-message-user flex items-center justify-center order-2">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </motion.div>
  );
};

export default ChatMessage;