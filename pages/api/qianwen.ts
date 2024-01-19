import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatBody, QianWenContent, QianWenMessage } from '@/types/chat';
import { QianWenStream } from '@/services/qianwen';
import { ChatMessages, ChatModels } from '@/models';
import { QianWenTokenizer } from '@/services/qianwen.utils';

export const config = {
  // runtime: 'edge',
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 5,
};
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { messageId, model, messages, prompt, temperature } =
      req.body as ChatBody;

    const chatModel = await ChatModels.findOne({
      where: { modelId: model.modelId },
    });

    if (!chatModel) {
      throw 'Model is not Found!';
    }

    const userId = '5fec360a-4f32-49b6-bb93-d36c8ca2b9e1';

    const chatMessages = await ChatMessages.findOne({
      where: {
        id: messageId,
        userId: userId,
      },
    });

    let messagesToSend: QianWenMessage[] = [];

    messagesToSend = messages.map((message) => {
      const messageContent = message.content;
      let content = [] as QianWenContent[];
      if (messageContent?.image) {
        messageContent.image.forEach((url) => {
          content.push({
            image: url,
          });
        });
      }
      if (messageContent?.text) {
        content.push({ text: messageContent.text });
      }

      return { role: message.role, content };
    });

    const stream = await QianWenStream(
      chatModel,
      prompt,
      temperature,
      messagesToSend
    );

    let assistantMessage = '';
    if (stream.getReader) {
      const reader = stream.getReader();
      const streamResponse = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (value) {
            assistantMessage += value;
          }
          if (done) {
            res.end();
            const tokenCount = await QianWenTokenizer(
              chatModel,
              messagesToSend,
              prompt
            );
            if (chatMessages) {
              await ChatMessages.update(
                {
                  messages,
                  tokenCount: tokenCount + chatMessages.tokenCount,
                  chatCount: chatMessages.chatCount + 1,
                },
                {
                  where: {
                    id: chatMessages.id,
                    userId: userId,
                  },
                }
              );
            } else {
              await ChatMessages.create({
                id: messageId,
                messages,
                modelId: chatModel.id!,
                name: messages[0].content.text!.substring(0, 30),
                userId: userId,
                prompt: model.systemPrompt,
                tokenCount,
                chatCount: 1,
              });
            }
            break;
          }
          res.write(Buffer.from(value));
        }
      };

      streamResponse().catch((error) => {
        console.error(error);
        res.status(500).end();
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).end();
  } finally {
  }
};

export default handler;
