<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { PUBLIC_AZURE_UPDATE_TERMS_CONSENT } from '$env/static/public';
	import { AuthService } from '$misc/authService';
	import { get } from 'svelte/store';

	const modalStore = getModalStore();

	async function save() {
		const authService = await AuthService.getInstance();
		const token = get(authService.token);

		fetch(PUBLIC_AZURE_UPDATE_TERMS_CONSENT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ consent: true, app: 'SlickGPT' })
		}).then((response) => {
			if (response.ok) {
				if ($modalStore && $modalStore.length && $modalStore[0].response) {
					$modalStore[0].response(true);
				}
				modalStore.close();
			}
		});
	}

	let checked = false;
</script>

<div class="card variant-filled-surface-700 p-8 max-w-xl md:min-w-[500px] flex flex-col gap-4">
	<h3 class="h3">Please accept our Terms of Service</h3>
	<div class="flex flex-col gap-2">
		<p>Please agree to our Terms and Conditions. You can read them here:</p>
		<a href="https://www.shipbit.de/terms/slickgpt" class="anchor" target="_blank" rel="external">
			Terms & Conditions
		</a>
		<a
			href="https://www.shipbit.de/datenschutz/slickgpt"
			class="anchor"
			target="_blank"
			rel="external"
		>
			Privacy policy
		</a>
	</div>

	<div class="flex justify-between items-center">
		<label class="flex items-center space-x-2">
			<input class="checkbox" type="checkbox" bind:checked />
			<p>I accept</p>
		</label>
		<button
			type="button"
			class="btn btn-sm variant-ghost-primary"
			disabled={!checked}
			on:click={save}
		>
			<span>Save</span>
		</button>
	</div>
</div>
