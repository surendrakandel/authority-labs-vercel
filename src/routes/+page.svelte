<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<header class="bg-white py-40 border-b border-base-200">
  <div class="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
    <div>
      <div class="text-primary font-bold mb-4 uppercase tracking-[0.2em] text-xs">The Discovery Journal</div>
      <h1 class="text-6xl md:text-7xl font-black leading-[0.9] mb-6 tracking-tighter">
        Independent <span class="italic text-primary">Insights.</span>
      </h1>
      <p class="text-xl text-base-content/70 mb-8 leading-relaxed max-w-lg">
        Deep-dives into the products, platforms, and services shaping the modern economy. We explore the details so you don't have to.
      </p>
      <div class="flex gap-4">
        <a data-sveltekit-reload href="/blog" class="btn btn-primary btn-lg rounded-none px-12">Latest Reviews</a>
        <a href="/about" class="btn btn-ghost btn-lg rounded-none underline decoration-2">Our Process</a>
      </div>
    </div>
    <div class="hidden lg:block relative">
        <div class="p-10 border-2 border-black bg-white relative z-10">
            <h3 class="text-2xl font-black mb-4">Integrity First.</h3>
            <p class="text-sm opacity-70 leading-loose">
              Every review on this platform is the result of direct interaction and data-driven analysis. We provide information discovery for an informed world.
            </p>
        </div>
        <div class="absolute inset-0 bg-primary translate-x-3 translate-y-3 z-0"></div>
    </div>
  </div>
</header>

<main id="feed" class="max-w-7xl mx-auto px-6 py-20">
  <div class="flex justify-between items-end border-b-2 border-black mb-12 pb-4 gap-3">
    <h2 class="text-2xl font-black uppercase">Recent Discoveries</h2>
    <p class="text-xs font-mono uppercase opacity-50">Updated daily // {new Date().toLocaleDateString()}</p>
  </div>
</main>