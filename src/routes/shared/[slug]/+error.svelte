<script lang="ts">
	import { createNewChat } from '$misc/shared';
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
					d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>Create your own</span>
		</div>
	</button>
</div>
