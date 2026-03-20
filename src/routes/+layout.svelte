<script lang="ts">
  import "./layout.css";
  import Navbar from "$lib/components/Navbar.svelte";
  import Footer from "$lib/components/Footer.svelte";
</script>

<div class="min-h-screen flex flex-col bg-base-100 font-sans antialiased">
  <Navbar />
  <slot />
  <Footer />
</div>