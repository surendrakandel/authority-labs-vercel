<script lang="ts">
  // Destructure and set a default fallback value here
  let { projectName = "" }: { projectName?: string } = $props();
</script>

<nav class="navbar bg-base-100 border-b border-base-200 px-4 md:px-16 sticky top-0 z-50 backdrop-blur-md bg-white/90">
  <div class="flex-1">
    <a href="/" class="text-2xl font-black tracking-tighter italic">
      {#if !projectName || projectName === ""}
        AUTHORITY<span class="text-primary underline decoration-4">LABS</span>
      {:else}
        <span class="uppercase">{projectName}</span>
      {/if}
    </a>
  </div>
  
  <div class="flex-none hidden md:block">
    <ul class="menu menu-horizontal px-1 font-bold text-sm uppercase tracking-widest">
      <li><a href="/about">Our Agency</a></li>
      <li><a href="/contact">Partner with Us</a></li>
    </ul>
  </div>
</nav>