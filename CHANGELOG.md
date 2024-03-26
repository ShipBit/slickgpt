# Changelog

## March 18, 2024

- SlickGPT now offers an optional "Pro" plan. If you choose this, you can use our Azure cloud infrastructure to access all the OpenAI models and settings without worrying about your own API key or usage limits. Yes, it's unlimited. We added a bunch of environment variables that you have to specify in your `.env` file to make this work. Check the `.env.example` file for details. You can leave all the values empty but you have to declare the variables if you want to self-host.
- The Svelte endpoint layer for `/ask` and `/suggest-title` were removed. The client now communicates with Open AI (using your own API key) or our Azure backend (if you are on the Pro plan) directly. This should simplify self-hosting as you no longer need serverless/Edge functions to execute prompts.

## March 08, 2024

- incomplete code blocks in completions should no longer overflow their containers
- fixed dashboard layout on smaller screens/resolutions

## March 04, 2024

- add CommandBar to search and jump to chats (thanks @th8m0z)
- integrate Moderation API, can be disabled in .env file (thanks @th8m0z)

## February 19, 2024

- upgraded to new OpenAI 0125 preview models and model aliases

## Dezember 31, 2023

- Pressing ENTER in the "Edit Chat Title" modal now saves the title instead of suggesting one via GPT
- Fixed gpt-4-turbo maxToken length

## November 14, 2023

- Links to our new Discord and Patreon were added. Feel free to remove them in your custom instance!

## October 09, 2023

- Messages with code now display a "Copy Code" button onHover
- upgraded all client libs, including Svelte4, Skeleton 2.0 and OpenAI 4

## July 03, 2023

- Fixed an issue in Firefox that made the ChatInput appear too small in height
- Maintenance: Update client libs, use Svelte 4 etc.

## May 12, 2023

- add new enironment variable PUBLIC_DISABLE_TRACKING. Set this to `true` to prevent tracking actions.

## April 28, 2023

- improved performance in large chats by initializing the tokenizer only once (thanks @Schroedi)
- minor bugfix: resize ChatInput on every input event (thanks @Schroedi)

## April 17, 2023

- Opened but unclosed code tags in completions are now auto-closed automatically. This should make streaming (and partial) results more readable. Thanks to @Arro for the suggestion!

## April 13, 2023

- cancelled completions are now added to the chat history as well. They might be malformatted or incomplete, but they are there.
- only autoscroll if user is at the bottom of the chat. Thanks to @thenbe for the suggestion and PR!

## April 12, 2023

- **Messages are now editable**. This creates a branch in the chat history and preserves your old prompts and completions. You can continue writing in any branch, just like you are used to from the OpenAI client. This change requires a (in-place, client-side) migration of the chat data structure, so you might have to wait a few seconds for each chat to load for the first time after the update.

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
