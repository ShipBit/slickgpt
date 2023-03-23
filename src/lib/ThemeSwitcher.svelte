<script lang="ts">
	/**
	 * This generally works but breaks if you select a previously selected theme.
	 * I asked in the Skeleton UI Discord how they did it on their page and they said:
	 *
	 * "With a lot of duct tape. We're still kind of fine tuning that a bit, but it's a bit involved.
	 * We don't typically offer support for our documentation features,
	 * but I've heard there's a lot of interest from folks to port this over to their own projects.
	 * When we're satisfied with that we'll look to build a guide of some sort.
	 * But until then we're presenting it as is."
	 *
	 * So we wait...
	 */

	enum SkeletonTheme {
		Skeleton = 'skeleton',
		Modern = 'modern',
		Rocket = 'rocket',
		Seafoam = 'seafoam',
		Vintage = 'vintage',
		Sahara = 'sahara',
		Hamlindigo = 'hamlindigo',
		GoldNouveau = 'gold-nouveau',
		Crimson = 'crimson'
	}

	const themeOptions: { name: string; value: SkeletonTheme }[] = [
		{ name: 'Default', value: SkeletonTheme.Skeleton },
		{ name: 'Modern', value: SkeletonTheme.Modern },
		{ name: 'Rocket', value: SkeletonTheme.Rocket },
		{ name: 'Seafoam', value: SkeletonTheme.Seafoam },
		{ name: 'Vintage', value: SkeletonTheme.Vintage },
		{ name: 'Sahara', value: SkeletonTheme.Sahara },
		{ name: 'Hamlindigo', value: SkeletonTheme.Hamlindigo },
		{ name: 'Gold Nouveau', value: SkeletonTheme.GoldNouveau },
		{ name: 'Crimson', value: SkeletonTheme.Crimson }
	];

	async function switchTheme(theme: SkeletonTheme) {
		// can't use dynamic strings here T_T
		switch (theme) {
			case SkeletonTheme.Skeleton:
				await import('@skeletonlabs/skeleton/themes/theme-skeleton.css');
				break;
			case SkeletonTheme.Modern:
				await import('@skeletonlabs/skeleton/themes/theme-modern.css');
				break;
			case SkeletonTheme.Rocket:
				await import('@skeletonlabs/skeleton/themes/theme-rocket.css');
				break;
			case SkeletonTheme.Seafoam:
				await import('@skeletonlabs/skeleton/themes/theme-seafoam.css');
				break;
			case SkeletonTheme.Vintage:
				await import('@skeletonlabs/skeleton/themes/theme-vintage.css');
				break;
			case SkeletonTheme.Sahara:
				await import('@skeletonlabs/skeleton/themes/theme-sahara.css');
				break;
			case SkeletonTheme.Hamlindigo:
				await import('@skeletonlabs/skeleton/themes/theme-hamlindigo.css');
				break;
			case SkeletonTheme.GoldNouveau:
				await import('@skeletonlabs/skeleton/themes/theme-gold-nouveau.css');
				break;
			case SkeletonTheme.Crimson:
				await import('@skeletonlabs/skeleton/themes/theme-crimson.css');
				break;
			default:
				await import('@skeletonlabs/skeleton/themes/theme-skeleton.css');
		}

		// waiting for https://github.com/sveltejs/svelte/issues/3105
		document.body.setAttribute('data-theme', theme);
	}

	function handleChange(event: any) {
		switchTheme(event?.target?.value);
	}
</script>

<div>
	<select class="select" on:change={handleChange}>
		{#each themeOptions as theme}
			<option value={theme.value}>{theme.name}</option>
		{/each}
	</select>
</div>
