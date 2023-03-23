<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		modalStore,
		toastStore,
		type ToastSettings
	} from '@skeletonlabs/skeleton';
	import { chatStore } from '$misc/stores';

	let slug = $modalStore[0].meta?.slug || '';
	$: chat = $chatStore[slug];

	let responseSlug = '';
	let copyClipboardError = false;
	let acceptTos = false;
	let shareUrl = '';

	$: alreadyShared = (chat && !!chat.updateToken) || false;
	$: {
		shareUrl = responseSlug
			? `${window.location.origin}/shared/${responseSlug}`
			: `${window.location.origin}/shared/${slug}`;
	}

	async function handleShareChat() {
		// no need to save/share some of the props
		const { isImported, ...rest } = chat;

		const response = await fetch('/api/share', {
			method: 'POST',
			body: JSON.stringify({
				slug,
				chat: rest
			})
		});
		const { slug: savedSlug, updateToken }: { slug: string; updateToken: string } =
			await response.json();

		// save the updateToken to localStorage to be able to edit later
		// this is basically like a "password" the server tells us.
		chatStore.update((store) => {
			let chats = { ...store };
			// the backend saved the chat with a new slug/id.
			// Probably because it it was already taken.
			if (savedSlug !== slug) {
				// store the chat with the new slug
				chats[savedSlug] = chats[slug];
				// delete the old entry
				delete chats[slug];
			}
			chats[savedSlug].updateToken = updateToken;
			return chats;
		});

		responseSlug = savedSlug;
		window.plausible('shareChat');
		if ($modalStore[0].response) {
			$modalStore[0].response(responseSlug);
		}
	}

	async function handleUnshare() {
		const docsToDelete: { [key: string]: string } = {};
		docsToDelete[slug] = chat.updateToken || '';

		const response = await fetch('/api/share', {
			method: 'DELETE',
			body: JSON.stringify(docsToDelete)
		});
		const { deleted }: { deleted: string[] } = await response.json();

		for (const deletedSlug of deleted) {
			chatStore.deleteUpdateToken(deletedSlug);
		}

		acceptTos = false;
	}

	async function copyShareUrlToClipboard() {
		try {
			await navigator.clipboard.writeText(shareUrl);

			modalStore.close();

			const toast: ToastSettings = {
				message: 'Share URL copied to clipboard',
				background: 'variant-filled-success',
				autohide: true,
				timeout: 5000
			};
			toastStore.trigger(toast);
		} catch (err) {
			copyClipboardError = true;
		}
	}

	function handleClose() {
		modalStore.close();
	}
</script>

{#if chat}
	<div class="card variant-filled-surface-700 p-8 max-w-xl md:min-w-[500px]">
		<h3>Share</h3>
		<Accordion>
			<AccordionItem>
				<svelte:fragment slot="summary">Is my data secure?</svelte:fragment>
				<svelte:fragment slot="content">
					<p class="!text-xs">
						When you share a chat, we store it in a database. This means that we can see it.
						However, there is no user data, so we don't know who created a chat, nor who it was
						shared with.
					</p>
					<p class="!text-xs">
						Please never share a chat with data that can personally identify you or another person.
					</p>
				</svelte:fragment>
			</AccordionItem>
			<AccordionItem>
				<svelte:fragment slot="summary">Can I update my shared chat later?</svelte:fragment>
				<svelte:fragment slot="content">
					<p class="!text-xs">
						As long as you keep your local version of the chat, you can. This only works on the
						device from which you shared. To update a share, simply open the chat and 'Share' it
						again. Messages you added since the last share will now also appear in the shared chat.
					</p>
				</svelte:fragment>
			</AccordionItem>
			<AccordionItem>
				<svelte:fragment slot="summary">Is my chat listed somewhere?</svelte:fragment>
				<svelte:fragment slot="content">
					<p class="!text-xs">
						No. We create a unique URL for your shared chat and only you (us) and the people you
						share it with and the people you share it with know about it. However, anyone who has
						this link can access it.
					</p>
				</svelte:fragment>
			</AccordionItem>
			<AccordionItem>
				<svelte:fragment slot="summary">How long is my chat stored?</svelte:fragment>
				<svelte:fragment slot="content">
					<p class="!text-xs">
						At the moment, we don't regularly delete shared chats but this could change in the
						future. It might also be necessary to delete old chats for new feature development.
					</p>
				</svelte:fragment>
			</AccordionItem>
		</Accordion>

		<form>
			<div class="flex-row space-y-6 mt-6">
				<!-- Terms -->
				<label class="flex items-center space-x-2">
					<span>My chat does not contain personal or forbidden content</span>
					<input class="checkbox" type="checkbox" bind:checked={acceptTos} />
				</label>

				<!-- Buttons -->
				<div class="flex justify-between space-x-4">
					<button class="btn btn-sm" on:click={handleClose}>Close</button>

					<div class="flex space-x-4">
						{#if alreadyShared}
							<button class="btn variant-ghost-error" on:click={handleUnshare}>Unshare</button>
						{/if}
						<button
							disabled={!acceptTos}
							class="btn variant-filled-primary"
							on:click={handleShareChat}
						>
							{alreadyShared ? 'Update' : 'Share'}
						</button>
					</div>
				</div>

				<!-- Share URL -->
				{#if alreadyShared}
					<label class="label">
						<span>Share URL</span>
						<div class="input-group input-group-divider grid-cols-[1fr_auto]">
							<!-- Display Share URL -->
							<input readonly={!copyClipboardError} class="input" type="text" value={shareUrl} />
							<!-- Copy to clipboard -->
							<button type="submit" class="btn" on:click={copyShareUrlToClipboard}>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
									class="w-6 h-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
									/>
								</svg>
							</button>
						</div>
					</label>
				{/if}
			</div>
		</form>
	</div>
{/if}
