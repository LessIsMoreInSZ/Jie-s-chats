import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import useTranslation from '@/hooks/useTranslation';

import { getApiUrl } from '@/utils/common';
import { throttle } from '@/utils/throttle';
import { getUserSession } from '@/utils/user';

import { ChatBody, Content, Message, Role } from '@/types/chat';

import { HomeContext } from '@/pages/home/home';

import { ModeToggle } from '@/components/ModeToggle/ModeTooggle';

import ChangeModel from './ChangeModel';
import { ChatInput } from './ChatInput';
import EnableNetworkSearch from './EnableNetworkSearch';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';

import { getChat, postChats, putUserChatModel } from '@/apis/clientApis';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation();

  const {
    state: {
      selectChat,
      selectModel,
      selectMessages,
      currentMessages,
      chats,
      models,
      prompts,
      userModelConfig,
      settings,
      chatError,
    },
    handleUpdateSelectMessage,
    handleUpdateCurrentMessage,
    handleUpdateUserModelConfig,
    hasModel,
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getSelectMessagesLast = () => {
    const selectMessageLength = selectMessages.length - 1;
    const lastMessage = { ...selectMessages[selectMessageLength] };
    return { lastMessage, selectMessageLength };
  };

  const handleSend = useCallback(
    async (
      message: Message,
      messageId: string,
      isRegenerate: boolean,
      modelId?: number,
    ) => {
      const isChatEmpty = selectMessages.length === 0;
      homeDispatch({ field: 'chatError', value: false });
      let selectChatId = selectChat?.id;
      let selectMessageList = [...selectMessages];
      let chatList = chats;
      let assistantParentId = messageId;
      if (!selectChatId) {
        const newChat = await postChats({ title: t('New Conversation') });
        selectChatId = newChat.id;
        chats.unshift(newChat);
        homeDispatch({ field: 'selectChat', value: newChat });
        homeDispatch({ field: 'currentMessages', value: [] });
        homeDispatch({ field: 'selectMessages', value: [] });
        homeDispatch({ field: 'chats', value: [...chatList] });
      }
      if (messageId && isRegenerate) {
        const messageIndex = selectMessageList.findIndex(
          (x) => x.id === messageId,
        );
        homeDispatch({ field: 'selectMessageLastId', value: messageId });
        selectMessageList.splice(messageIndex + 1, selectMessageList.length);
      } else {
        const userTempId = uuidv4();
        assistantParentId = userTempId;
        homeDispatch({ field: 'selectMessageLastId', value: userTempId });
        const parentMessage = selectMessageList.find((x) => x.id == messageId);
        parentMessage && parentMessage?.childrenIds.unshift(userTempId);
        const parentMessageIndex = selectMessageList.findIndex(
          (x) => x.id == messageId,
        );
        const newUserMessage = {
          id: userTempId,
          role: 'user' as Role,
          parentId: messageId,
          childrenIds: [],
          assistantChildrenIds: [],
          content: message.content,
          inputTokens: 0,
          outputTokens: 0,
          inputPrice: new Decimal(0),
          outputPrice: new Decimal(0),
        };
        let removeCount = -1;
        if (parentMessageIndex !== -1)
          removeCount = selectMessageList.length - 1;
        if (!messageId) {
          removeCount = selectMessageList.length;
          homeDispatch({
            field: 'currentMessages',
            value: [...currentMessages, newUserMessage],
          });
        }

        selectMessageList.splice(
          parentMessageIndex + 1,
          removeCount,
          newUserMessage,
        );
      }

      const assistantTempId = uuidv4();
      const newAssistantMessage = {
        id: assistantTempId,
        role: 'assistant' as Role,
        parentId: assistantParentId,
        childrenIds: [],
        assistantChildrenIds: [],
        content: {
          image: [],
          text: '',
        },
        inputTokens: 0,
        outputTokens: 0,
        inputPrice: new Decimal(0),
        outputPrice: new Decimal(0),
      };

      homeDispatch({
        field: 'currentChatMessageId',
        value: assistantTempId,
      });
      selectMessageList.push(newAssistantMessage);

      homeDispatch({
        field: 'selectMessages',
        value: [...selectMessageList],
      });
      homeDispatch({ field: 'loading', value: true });
      homeDispatch({ field: 'messageIsStreaming', value: true });
      const messageContent = message.content;
      const chatBody: ChatBody = {
        modelId: modelId || selectModel?.modelId!,
        chatId: selectChatId,
        messageId: messageId || null,
        userMessage: messageContent,
        userModelConfig,
      };
      let body = JSON.stringify(chatBody);

      const controller = new AbortController();
      const response = await fetch(`${getApiUrl()}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getUserSession()}`,
        },
        signal: controller.signal,
        body,
      });

      if (!response.ok) {
        homeDispatch({ field: 'loading', value: false });
        homeDispatch({ field: 'messageIsStreaming', value: false });
        homeDispatch({ field: 'chatError', value: true });
        const result = await response.json();
        toast.error(t(result?.message) || response.statusText);
        return;
      }
      const data = response.body;
      if (!data) {
        homeDispatch({ field: 'loading', value: false });
        homeDispatch({ field: 'messageIsStreaming', value: false });
        homeDispatch({ field: 'chatError', value: true });
        return;
      }

      let errorChat = false;
      let text = '';
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function setSelectMessages(content: Content) {
        let lastMessages = selectMessageList[selectMessageList.length - 1];
        lastMessages = {
          ...lastMessages,
          content,
        };

        selectMessageList.splice(-1, 1, lastMessages);

        homeDispatch({
          field: 'selectMessages',
          value: [...selectMessageList],
        });
      }
      async function* processBuffer() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex + 1).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line.startsWith('data:')) {
              yield line.slice(5).trim();
            }

            if (line === '') {
              continue;
            }
          }
        }
      }

      for await (const message of processBuffer()) {
        let value = JSON.parse(message);
        if (!value.success) {
          errorChat = true;
          homeDispatch({
            field: 'chatError',
            value: errorChat,
          });
          controller.abort();
          setSelectMessages({ text, error: value.result });
          break;
        }
        if (stopConversationRef.current === true) {
          controller.abort();
          break;
        }
        text += value.result;
        setSelectMessages({ text });
      }

      if (isChatEmpty) {
        setTimeout(async () => {
          const data = await getChat(selectChatId);
          const _chats = chats.map((x) => {
            if (x.id === data.id) {
              return data;
            }
            return x;
          });
          homeDispatch({
            field: 'userModelConfig',
            value: data.userModelConfig,
          });
          homeDispatch({ field: 'chats', value: _chats });
        }, 100);
      }

      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
      !errorChat &&
        setTimeout(() => {
          handleUpdateCurrentMessage(selectChatId);
        }, 200);
      stopConversationRef.current = false;
    },
    [
      userModelConfig,
      chats,
      selectChat,
      chatError,
      currentMessages,
      selectMessages,
      selectModel,
      stopConversationRef,
    ],
  );

  useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  useEffect(() => {
    throttledScrollDown();
  }, [selectMessages, throttledScrollDown]);

  useEffect(() => {}, [userModelConfig]);

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#262630]">
      <>
        <div
          className="max-h-full overflow-x-hidden"
          ref={chatContainerRef}
          onScroll={handleScroll}
        >
          {selectMessages?.length === 0 ? (
            <>
              <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-[52px] sm:max-w-[600px]">
                {models.length !== 0 && (
                  <div className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
                    <ModelSelect />
                    {userModelConfig?.prompt && (
                      <SystemPrompt
                        currentPrompt={userModelConfig?.prompt}
                        prompts={prompts}
                        onChangePrompt={(prompt) => {
                          handleUpdateUserModelConfig({ prompt });
                        }}
                      />
                    )}
                    {userModelConfig?.temperature !== undefined && (selectModel?.minTemperature !== selectModel?.maxTemperature) && (
                      <TemperatureSlider
                        label={t('Temperature')}
                        min={selectModel?.minTemperature!}
                        max={selectModel?.maxTemperature!}
                        defaultTemperature={userModelConfig.temperature}
                        onChangeTemperature={(temperature) =>
                          handleUpdateUserModelConfig({
                            temperature,
                          })
                        }
                      />
                    )}
                    {userModelConfig?.enableSearch != undefined && (
                      <EnableNetworkSearch
                        label={t('Internet Search')}
                        enable={userModelConfig.enableSearch}
                        onChange={(enableSearch) => {
                          handleUpdateUserModelConfig({
                            enableSearch,
                          });
                        }}
                      />
                    )}
                    {/* <Button
                      onClick={() => {
                        handleUpdateSettings('showChatSettingBar', true);
                      }}
                    >
                      Settings
                    </Button> */}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {selectChat?.id && (
                <div className="sticky top-0 pt-1 z-10 text-sm bg-white dark:bg-[#262630] dark:text-neutral-200 flex items-center justify-between">
                  <div
                    className={cn(
                      'ml-[84px] flex justify-start items-center',
                      settings.showChatBar && 'ml-6',
                    )}
                  >
                    {hasModel() && (
                      <ChangeModel
                        className="font-semibold text-base"
                        content={selectModel?.name}
                        onChangeModel={(model) => {
                          homeDispatch({
                            field: 'selectModel',
                            value: model,
                          });
                          putUserChatModel(selectChat.id, model.modelId);
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-start px-[6px]">
                    <ModeToggle />
                  </div>
                </div>
              )}

              {selectMessages.map((current, index) => {
                let lastMessage = selectMessages[selectMessages.length - 1];
                let parentChildrenIds: string[] = [];
                if (!current.parentId) {
                  parentChildrenIds = currentMessages
                    .filter((x) => !x.parentId)
                    .map((x) => x.id);
                } else {
                  parentChildrenIds =
                    currentMessages.find((x) => x.id === current.parentId)
                      ?.childrenIds || [];
                  parentChildrenIds = [...parentChildrenIds].reverse();
                }
                return (
                  <MemoizedChatMessage
                    key={current.id + index}
                    modelName={current.modelName}
                    modelId={current.modelId}
                    currentSelectIndex={parentChildrenIds.findIndex(
                      (x) => x === current.id,
                    )}
                    parentId={current.parentId}
                    childrenIds={current.childrenIds}
                    parentChildrenIds={parentChildrenIds}
                    assistantChildrenIds={current.assistantChildrenIds}
                    assistantCurrentSelectIndex={current.assistantChildrenIds.findIndex(
                      (x) => x === current.id,
                    )}
                    lastMessageId={lastMessage.id}
                    message={{
                      id: current.id!,
                      role: current.role,
                      content: current.content,
                      duration: current.duration || 0,
                      inputTokens: current.inputTokens || 0,
                      outputTokens: current.outputTokens || 0,
                      inputPrice: current.inputPrice || new Decimal(0),
                      outputPrice: current.outputPrice || new Decimal(0),
                    }}
                    onChangeMessage={(messageId) => {
                      handleUpdateSelectMessage(messageId);
                    }}
                    onRegenerate={(modelId?: number) => {
                      const message = currentMessages.find(
                        (x) => x.id === current.parentId,
                      );
                      if (!message) return;
                      handleSend(
                        { role: 'user', content: message.content },
                        current.parentId || '',
                        true,
                        modelId,
                      );
                    }}
                    onEdit={(editedMessage, parentId) => {
                      handleSend(editedMessage, parentId || '', false);
                    }}
                  />
                );
              })}

              <div
                className="h-[162px] bg-white dark:bg-[#262630]"
                ref={messagesEndRef}
              />
            </>
          )}
        </div>
        {hasModel() && (
          <ChatInput
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            onSend={(message) => {
              const { lastMessage } = getSelectMessagesLast();
              handleSend(message, lastMessage?.id, false);
            }}
            onScrollDownClick={handleScrollDown}
            showScrollDownButton={showScrollDownButton}
          />
        )}
      </>
    </div>
  );
});
Chat.displayName = 'Chat';
