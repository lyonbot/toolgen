import { type ChatCompletionChunk } from "./openai";

interface StreamParsedItem {
  type: 'code' | 'paragraph';

  language?: string; // for code only
  path?: string; // for code only, can be undefined too

  content: string;
  completed: boolean;
}

export async function* streamParse(stream: AsyncIterable<ChatCompletionChunk>): AsyncIterator<StreamParsedItem> {
  let incompletedItem: StreamParsedItem = {
    type: 'paragraph',
    content: '',
    completed: false,
  };

  let buffer = '';

  /** try to finalize the current item. if it's completed, return it. otherwise, return null */
  function consumeBuffer(): StreamParsedItem | null {
    switch (incompletedItem.type) {
      case 'paragraph': {
        // find next ```
        const match = /^```(\w+)\s*\{([^}]+)\}$/m.exec(buffer);
        if (match) {
          const language = match[1];
          const path = /path:\s*([^\s}]+)/.exec(match[2])?.[1];

          const newItem: StreamParsedItem = {
            ...incompletedItem,
            completed: true,
            content: buffer.slice(0, match.index),
          };

          buffer = buffer.slice(match.index! + match[0].length);
          incompletedItem = { type: 'code', language, path, content: buffer, completed: false };
          return newItem;
        }
        return null;
      }

      case 'code': {
        // find next ```
        const match = buffer.match(/^```/m);
        if (match) {
          const newItem: StreamParsedItem = {
            ...incompletedItem,
            completed: true,
            content: buffer.slice(0, match.index),
          };
          buffer = buffer.slice(match.index! + match[0].length);
          incompletedItem = { type: 'paragraph', content: buffer, completed: false };
          return newItem;
        }
        return null;
      }
    }
  }

  for await (const chunk of stream) {
    buffer += chunk.chunk.content;

    while (true) {
      const item = consumeBuffer();
      if (item) yield item;
      else break;
    }
  }

  if (buffer.length > 0) {
    incompletedItem.content = buffer;
    incompletedItem.completed = true;
    yield incompletedItem;
  }
}