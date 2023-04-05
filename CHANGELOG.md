# Changelog

Sorry folks, no semantic versioning, proper tagging or fancy automations yet. I'm just going to keep an old-sql manual changelog here for now.

## April 05, 2023

- Suggest Title button now shows a loading spinner and is disabled while loading
- Chat titles are now also shown on mobile, along with better styling
- Toast messages (especially primary) look a bit better now
- use [svelte-legos](https://sveltelegos.com/) to replace some (worse) custom logic
  - [textareaAutosizeAction](https://sveltelegos.com/guides/actions/textareaAutosizeAction/) instead of `svelte-autosize`
  - [clickToCopyAction](https://sveltelegos.com/guides/actions/clickToCopyAction/) instead of custom `navigator.clipboard` logic
- long Chat titles no longer break the layout
- use [@inqling/svelte-icons](https://github.com/Inqling/svelte-icons) instead of inline SVGs
- added a little surprise. Can you spot it? 👀

## April 04, 2023

- **Auto-Suggest chat titles**: When you leave an untitled chat, a new Modal will appear and allow you to set the title or let `gpt-3.5-turbo` suggest one for you (based on the context and first prompt and completion). You can opt-in to always do that **by default**.
- Chat title moved from Chat Settings Modal to a new _Edit_ button next to the title (that will also open the Modal mentioned above)
- **Chat messages can now be deleted** (both user and assistant) by clicking the _x_ button next to them
- You can now **cancel completions** while ChatGPT is generating
- **OpenAI API key is now masked** in the Chat Settings modal once you entered it
- Added a new **_Insert code_ button** next to ChatInput that appends Markdown code tags to the input. Use this for code snippets, SVGs etc. that you want to feed to ChatGPT.
- Empty chats (just created, no context or messages) will be deleted automatically when you close them.
- fixed code highlighting in shared chats

## March 31, 2023

- If you change the model in the Chat Settings, you can set your **new model as default** for all subsequent chats
- added **_New Chat_ button next to context** which will create a new chat with the same context and settings

## March 29, 2023

- **debounce token calculation** on input change to avoid laggy UI (thanks [@Ratcha9](https://github.com/Ratcha9))
- fixed token count being unreadable in light theme

## March 28, 2023

- remove text blink while receiving a completion from ChatGPT
