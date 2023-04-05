<script lang="ts">
	import { Accordion, AccordionItem, modalStore } from '@skeletonlabs/skeleton';
	import { clickToCopyAction } from 'svelte-legos';
	import { DocumentDuplicate } from '@inqling/svelte-icons/heroicon-24-solid';
	import { chatStore } from '$misc/stores';
	import { showToast, track } from '$misc/shared';

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
		track('shareChat');
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

	function handleCopyDone() {
		modalStore.close();
		showToast('Share URL copied to clipboard');
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
							<button
								type="submit"
								class="btn"
								use:clickToCopyAction={shareUrl}
								on:copy-done={() => handleCopyDone()}
								on:copy-error={() => (copyClipboardError = true)}
							>
								<DocumentDuplicate class="w-6 h-6" />
							</button>
						</div>
					</label>
				{/if}
			</div>
		</form>
	</div>
{/if}
