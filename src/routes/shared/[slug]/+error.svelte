<script lang="ts">
	import { createNewChat } from '$misc/shared';
	import { PlusCircle } from '@inqling/svelte-icons/heroicon-24-solid';
</script>

<div class="flex flex-col justify-center items-center h-full space-y-4 text-center">
	<h2>Aww, snap!</h2>
	<p>
		The requested chat was not found. <br />
		Either your link is invalid or the other person unshared this chat.
	</p>

	<!-- Add button -->
	<button class="card p-4 grid variant-ghost-primary" on:click={() => createNewChat()}>
		<div class="flex space-x-2 md:space-x-4 items-center self-center justify-self-center">
			<PlusCircle class="w-6 h-6" />
			<span>Create your own</span>
		</div>
	</button>
</div>
