import { useEffect, useRef, useState } from 'react';

import useTranslation from '@/hooks/useTranslation';

import {
  ChatRole,
  ChatSpanStatus,
  Content,
  IChat,
  Message,
} from '@/types/chat';

import { Button } from '@/components/ui/button';

import CopyAction from './CopyAction';
import DeleteAction from './DeleteAction';
import EditAction from './EditAction';
import PaginationAction from './PaginationAction';

export interface UserMessage {
  id: string;
  role: ChatRole;
  content: Content;
  status: ChatSpanStatus;
  parentId: string | null;
  siblingIds: string[];
}

interface Props {
  message: UserMessage;
  selectedChat: IChat;
  onChangeMessage?: (messageId: string) => void;
  onEditAndSendMessage?: (editedMessage: Message, parentId?: string) => void;
  onEditUserMessage?: (messageId: string, content: Content) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const UserMessage = (props: Props) => {
  const { t } = useTranslation();

  const {
    message,
    selectedChat,
    onChangeMessage,
    onEditAndSendMessage,
    onEditUserMessage,
    onDeleteMessage,
  } = props;
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [messageContent, setMessageContent] = useState(message.content);
  const {
    id: messageId,
    siblingIds,
    parentId,
    content,
    status: chatStatus,
  } = message;
  const currentMessageIndex = siblingIds.findIndex((x) => x === messageId);

  const handleEditMessage = (isOnlySave: boolean = false) => {
    if (content != messageContent) {
      if (isOnlySave) {
        onEditUserMessage && onEditUserMessage(message.id, messageContent);
      } else {
        if (selectedChat.id && onEditAndSendMessage) {
          onEditAndSendMessage(
            { ...message, content: messageContent },
            parentId || undefined,
          );
        }
      }
    }
    setIsEditing(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent({
      text: event.target.value,
      fileIds: content.fileIds,
    });
    if (textareaRef.current) {
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  const handleToggleEditing = () => {
    setIsEditing(!isEditing);
  };

  useEffect(() => {
    setMessageContent(content);
  }, [content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  return (
    <>
      <div className="flex flex-row-reverse relative">
        {isEditing ? (
          <div className="flex w-full flex-col">
            <textarea
              ref={textareaRef}
              className="w-full outline-none resize-none whitespace-pre-wrap border-none rounded-md bg-muted"
              value={messageContent.text}
              onChange={handleInputChange}
              onKeyDown={handlePressEnter}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              style={{
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                padding: '10px',
                paddingBottom: '60px',
                margin: '0',
                overflow: 'hidden',
              }}
            />

            <div className="absolute right-2 bottom-2 flex justify-end space-x-4">
              <Button
                variant="link"
                className="rounded-md px-4 py-1 text-sm font-medium"
                onClick={() => {
                  handleEditMessage(true);
                }}
                disabled={(messageContent.text || '')?.trim().length <= 0}
              >
                {t('Save')}
              </Button>
              <Button
                variant="default"
                className="rounded-md px-4 py-1 text-sm font-medium"
                onClick={() => {
                  handleEditMessage();
                }}
                disabled={(messageContent.text || '')?.trim().length <= 0}
              >
                {t('Send')}
              </Button>
              <Button
                variant="outline"
                className="rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={() => {
                  setMessageContent(content);
                  setIsEditing(false);
                }}
              >
                {t('Cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted py-2 px-3 rounded-md overflow-x-scroll">
            <div className="flex flex-wrap justify-end text-right gap-2">
              {content?.fileIds &&
                content.fileIds.map((img, index) => (
                  <img
                    className="rounded-md mr-2 not-prose"
                    key={index}
                    style={{ maxWidth: 268, maxHeight: 168 }}
                    src={img.url}
                    alt=""
                  />
                ))}
            </div>
            <div
              className={`prose whitespace-pre-wrap dark:prose-invert text-base overflow-x-auto ${
                content?.fileIds && content.fileIds.length > 0 ? 'mt-2' : ''
              }`}
            >
              {content.text}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end my-2">
        {!isEditing && (
          <>
            <EditAction
              isHoverVisible
              disabled={chatStatus === ChatSpanStatus.Chatting || chatStatus === ChatSpanStatus.Thinking}
              onToggleEditing={handleToggleEditing}
            />
            <CopyAction
              triggerClassName="invisible group-hover:visible focus:visible"
              text={content.text}
            />
            <DeleteAction
              hidden={
                !(message.parentId !== null || message?.siblingIds?.length > 1)
              }
              isHoverVisible
              onDelete={() => {
                onDeleteMessage && onDeleteMessage(messageId);
              }}
            />
            <PaginationAction
              hidden={siblingIds.length <= 1}
              disabledPrev={
                currentMessageIndex === 0 ||
                chatStatus === ChatSpanStatus.Chatting || 
                chatStatus === ChatSpanStatus.Thinking
              }
              disabledNext={
                currentMessageIndex === siblingIds.length - 1 ||
                chatStatus === ChatSpanStatus.Chatting || 
                chatStatus === ChatSpanStatus.Thinking
              }
              currentSelectIndex={currentMessageIndex}
              messageIds={siblingIds}
              onChangeMessage={onChangeMessage}
            />
          </>
        )}
      </div>
    </>
  );
};

export default UserMessage;
