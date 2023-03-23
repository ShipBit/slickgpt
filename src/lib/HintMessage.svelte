<script lang="ts">
	export let title: string;
	export let variantClass = '';
	export let actionClass = '';
	export let omitAlertActionsClass = false;
</script>

<aside class="alert {variantClass} max-w-4xl mx-auto mt-6 self-center">
	<div class="alert-message flex flex-col">
		<h3>{title}</h3>
		<slot />
	</div>
	<div class={actionClass} class:alert-actions={!omitAlertActionsClass}>
		<slot name="actions" />
	</div>
</aside>
