<!-- FILE: src/routes/blog/+page.svelte -->
<script lang="ts">
  let { data } = $props();

  type BlogCategory = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };

  type BlogTag = {
    id: string;
    name: string;
    slug: string;
  };

  type BlogListItem = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    description: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
    category: BlogCategory | null;
    tags: BlogTag[];
  };

  const posts = (data.posts ?? []) as BlogListItem[];
  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

  function formatDate(value?: string | null) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
</script>

<svelte:head>
  <title>Blog</title>
  <meta
    name="description"
    content="Read the latest articles, guides, and updates from our blog."
  />
</svelte:head>

<section class="bg-background text-foreground min-h-250">
  <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
    <header class="mb-8 sm:mb-10">
      <div class="card rounded-lg border border-border bg-background shadow-sm">
        <div class="card-body gap-5 px-4 sm:px-6 py-6 sm:py-8 lg:py-10">
          <div class="flex flex-wrap items-center gap-3">
            <span class="badge badge-outline rounded-full border-border bg-background-muted px-3 py-3 text-foreground">
              Blog
            </span>

            <span class="text-sm text-foreground-muted">
              {posts.length} {posts.length === 1 ? 'article' : 'articles'}
            </span>
          </div>

          <div class="max-w-3xl space-y-3">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
              Articles, guides, and updates
            </h1>
          </div>
        </div>
      </div>
    </header>

    {#if featured}
      <section class="mb-8 sm:mb-10">
        <a
          data-sveltekit-reload
          href={`/blog/${featured.slug}`}
          class="card overflow-hidden rounded-lg border border-border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:card-side"
        >
          {#if featured.coverImageUrl}
            <figure class="bg-background-inset lg:w-[45%]">
              <img
                src={featured.coverImageUrl}
                alt={featured.title}
                class="h-full  w-full object-cover"
                loading="eager"
              />
            </figure>
          {/if}

          <div class="card-body gap-5 py-6 sm:py-8 lg:w-[55%] lg:py-10">
            <div class="flex flex-wrap items-center gap-2.5 text-sm">
              <span class="badge rounded-full border-none bg-accent/10 px-3 py-3 text-foreground">
                Featured
              </span>

              {#if featured.category}
                <span class="badge badge-outline rounded-full border-border bg-background-muted px-3 py-3 text-foreground">
                  {featured.category.name}
                </span>
              {/if}

              {#if formatDate(featured.publishedAt)}
                <time datetime={featured.publishedAt} class="text-foreground-muted">
                  {formatDate(featured.publishedAt)}
                </time>
              {/if}
            </div>

            <div class="space-y-3">
              <h2 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {featured.title}
              </h2>

              {#if featured.excerpt || featured.description}
                <p class="max-w-2xl text-base leading-8 text-foreground-muted sm:text-lg">
                  {featured.excerpt ?? featured.description}
                </p>
              {/if}
            </div>

            <!-- {#if featured.tags.length}
              <div class="flex flex-wrap gap-2">
                {#each featured.tags as tag}
                  <span class="badge rounded-full border-none bg-background-muted px-3 py-3 text-foreground-muted">
                    #{tag.name}
                  </span>
                {/each}
              </div>
            {/if} -->

            <div class="pt-1">
              <span
                class="btn btn-sm rounded-full border border-border bg-background text-foreground shadow-xs normal-case hover:bg-background-muted"
              >
                Read article
              </span>
            </div>
          </div>
        </a>
      </section>
    {/if}

    {#if rest.length}
      <section>
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {#each rest as post}
            <a
              href={`/blog/${post.slug}`}
              class="card overflow-hidden rounded-4xl border border-border bg-background shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {#if post.coverImageUrl}
                <figure class="bg-background-inset">
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    class="h-56 w-full object-cover"
                    loading="lazy"
                  />
                </figure>
              {/if}

              <div class="card-body gap-4 p-6">
                <div class="flex flex-wrap items-center gap-2.5 text-sm">
                  {#if post.category}
                    <span class="badge badge-outline rounded-full border-border bg-background-muted px-3 py-3 text-foreground">
                      {post.category.name}
                    </span>
                  {/if}

                  {#if formatDate(post.publishedAt)}
                    <time datetime={post.publishedAt} class="text-foreground-muted">
                      {formatDate(post.publishedAt)}
                    </time>
                  {/if}
                </div>

                <div class="space-y-2">
                  <h2 class="text-2xl font-semibold tracking-tight text-foreground">
                    {post.title}
                  </h2>

                  {#if post.excerpt || post.description}
                    <p class="text-sm leading-7 text-foreground-muted">
                      {post.excerpt ?? post.description}
                    </p>
                  {/if}
                </div>

                {#if post.tags.length}
                  <div class="flex flex-wrap gap-2 pt-1">
                    {#each post.tags.slice(0, 4) as tag}
                      <span class="badge rounded-full border-none bg-background-muted px-3 py-3 text-foreground-muted">
                        #{tag.name}
                      </span>
                    {/each}
                  </div>
                {/if}

                <div class="card-actions pt-2">
                  <span
                    class="btn btn-ghost btn-sm rounded-full border border-border bg-background text-foreground shadow-xs normal-case hover:bg-background-muted"
                  >
                    Read more
                  </span>
                </div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    {#if !posts.length}
      <section class="mt-6">
        <div class="card rounded-4xl border border-border bg-background shadow-sm">
          <div class="card-body items-center p-8 text-center sm:p-10">
            <span class="badge badge-outline rounded-full border-border bg-background-muted px-3 py-3 text-foreground-muted">
              Blog
            </span>

            <h2 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              No posts published yet
            </h2>

            <div class="prose prose-neutral max-w-xl dark:prose-invert">
              <p class="text-foreground-muted">
                Publish a few articles and they’ll appear here automatically.
              </p>
            </div>
          </div>
        </div>
      </section>
    {/if}
  </div>
</section>