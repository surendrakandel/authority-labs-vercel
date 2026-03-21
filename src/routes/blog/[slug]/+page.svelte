<!-- FILE: src/routes/blog/[slug]/+page.svelte -->
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

  type BlogPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    description: string | null;
    bodyHtml: string;
    coverImageUrl: string | null;
    status: string;
    seoTitle: string | null;
    seoDescription: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    category: BlogCategory | null;
    tags: BlogTag[];
  };

  const post = data.post as BlogPost | undefined;

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

  const publishedDate = formatDate(post?.publishedAt);
  const metaTitle = post?.seoTitle ?? post?.title ?? 'Blog';
  const metaDescription = post?.seoDescription ?? post?.description ?? null;
</script>

<svelte:head>
  <title>{metaTitle}</title>

  {#if metaDescription}
    <meta name="description" content={metaDescription} />
  {/if}
</svelte:head>

{#if post}
  <section>
    <article class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-12 bg-base-200">
      <div class="mb-6 sm:mb-8">
        <a
          data-sveltekit-reload
          href="/blog"
          class="btn btn-ghost btn-sm gap-2 rounded-full border border-border bg-background text-foreground-muted shadow-xs normal-case hover:bg-background-muted hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          <span>Back to blog</span>
        </a>
      </div>

      <header class="overflow-hidden">
        <div class="gap-6 py-6 sm:py-8 lg:py-10">
          {#if post.category || publishedDate || post.tags.length}
            <div class="flex flex-wrap items-center gap-2.5 text-sm">
              {#if post.category}
                <span
                  class="badge badge-outline rounded-full border-border bg-background-muted px-3 py-3 font-medium text-foreground"
                >
                  {post.category.name}
                </span>
              {/if}

              {#if publishedDate}
                <time datetime={post.publishedAt} class="text-sm text-foreground-muted mb-3">
                  {publishedDate}
                </time>
              {/if}

              <!-- {#if post.tags.length}
                <div class="flex flex-wrap gap-2">
                  {#each post.tags as tag}
                    <span
                      class="badge rounded-full border-none bg-background-muted px-3 py-3 text-foreground-muted"
                    >
                      #{tag.name}
                    </span>
                  {/each}
                </div>
              {/if} -->
            </div>
          {/if}

          <div class="space-y-4 sm:space-y-5">
            <h1 class="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              {post.title}
            </h1>

            {#if post.description}
              <p class="max-w-3xl leading-6 text-foreground-muted sm:text-md">
                {post.description}
              </p>
            {/if}
          </div>
        </div>

        {#if post.coverImageUrl}
          <div class="overflow-hidden rounded-lg">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              class="h-auto max-h-130 w-full object-cover"
              loading="eager"
            />
          </div>
        {/if}
      </header>

      <section class="mt-6 sm:mt-8">
        <div class="py-6 sm:py-8 lg:py-10">
          <div
            class="
              prose prose-neutral max-w-none
              prose-headings:scroll-mt-24
              prose-headings:text-foreground
              prose-headings:font-semibold
              prose-headings:tracking-tight
              prose-p:text-foreground
              prose-p:leading-8
              prose-li:text-foreground
              prose-li:leading-8
              prose-strong:text-foreground
              prose-a:text-accent
              hover:prose-a:text-accent-secondary
              prose-a:no-underline
              hover:prose-a:underline
              prose-blockquote:border-l-accent
              prose-blockquote:text-foreground-muted
              prose-hr:border-border
              prose-code:rounded-md
              prose-code:bg-background-muted
              prose-code:px-1.5
              prose-code:py-0.5
              prose-code:text-foreground
              prose-code:before:content-none
              prose-code:after:content-none
              prose-pre:rounded-2xl
              prose-pre:border
              prose-pre:border-border
              prose-pre:bg-background-inset
              prose-pre:text-foreground
              prose-img:rounded-3xl
              prose-img:border
              prose-img:border-border
              prose-figure:my-8
              prose-figcaption:text-foreground-muted
              prose-th:text-foreground
              prose-td:text-foreground
            "
          >
            {@html post.bodyHtml}
          </div>
        </div>
      </section>
    </article>
  </section>
{/if}