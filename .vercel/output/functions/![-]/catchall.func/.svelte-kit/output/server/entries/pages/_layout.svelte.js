import { c as create_ssr_component, v as validate_component, e as each, a as escape, n as null_to_empty, b as add_attribute, d as add_classes, m as missing_component } from "../../chunks/ssr.js";
import { I as Icon, M as Main } from "../../chunks/Main.js";
import { tsParticles } from "@tsparticles/engine";
import { w as writable } from "../../chunks/index.js";
import { loadSlim } from "@tsparticles/slim";
const Footer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<section class="w-full h-20 md:h-16 border-t-[1px] border-border-bottom flex justify-center items-center z-40"><div class="w-10/12 flex flex-col md:flex-row justify-center md:justify-between items-center gap-2"><div class="capitalize text-sm text-secondary-text" data-svelte-h="svelte-1ggvjz5">@ made with love by <span class="text-border"> &lt; Akshat Gupta /&gt;</span></div> <div class="flex gap-5 items-center"><a href="https://www.linkedin.com/in/akshatgg/" target="_blank">${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      icon: "mdi:linkedin",
      class: "cursor-pointer text-2xl text-secondary"
    },
    {},
    {}
  )}</a> <a href="https://x.com/akshat___30" target="_blank">${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      icon: "mdi:twitter",
      class: "cursor-pointer text-2xl text-secondary"
    },
    {},
    {}
  )}</a> <a href="https://www.instagram.com" target="_blank">${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      icon: "lets-icons:insta",
      class: "cursor-pointer text-2xl text-secondary"
    },
    {},
    {}
  )}</a> <a href="https://github.com/akshatgg" target="_blank">${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      icon: "mdi:github",
      class: "cursor-pointer text-2xl text-secondary"
    },
    {},
    {}
  )}</a></div></div></section>`;
});
const css = {
  code: ".drawer.svelte-15gg23r{background:#000;position:absolute;top:0;right:0;display:flex;height:100vh;width:80%;opacity:1;overflow:hidden;border-left:1px solid green}",
  map: `{"version":3,"file":"Header.svelte","sources":["Header.svelte"],"sourcesContent":["<script>\\n\\timport Icon from '@iconify/svelte';\\n\\timport { onMount } from 'svelte';\\n\\n\\texport let sections = [];\\n\\texport let activeSectionId;\\n\\t// export let activeSection;\\n\\texport let y;\\n\\n\\tlet drawerVisible = false;\\n\\n\\t// onMount(() => {\\n\\t// \\tconsole.log(activeSection);\\n\\t// });\\n<\/script>\\n\\n<div\\n\\tclass={'fixed z-10 w-full h-16 md:h-20 text-white flex justify-between items-center px-4 md:px-16 ' +\\n\\t\\t(y > 0 ? 'bg-transparent backdrop-blur-md border-b-[1px] border-border-bottom' : 'bg-primary')}\\n>\\n\\t<span class=\\"text-3xl text-secondary\\">&lt;&nbsp;</span>\\n\\t<div class=\\"md:gap-10 hidden md:flex\\">\\n\\t\\t{#each sections as { name, id }}\\n\\t\\t\\t<li type=\\"none\\">\\n\\t\\t\\t\\t<a href={\`#\${id}\`} class:active={activeSectionId === id}>\\n\\t\\t\\t\\t\\t<span\\n\\t\\t\\t\\t\\t\\tclass=\\"hover:text-secondary group transition-all duration-300 ease-in-out cursor-pointer text-secondary text-lg\\"\\n\\t\\t\\t\\t\\t>\\n\\t\\t\\t\\t\\t\\t<p\\n\\t\\t\\t\\t\\t\\t\\tclass={\`mx-3 bg-left-bottom bg-gradient-to-r from-border to-border bg-[length:0%_2px] bg-no-repeat group-hover:bg-[length:100%_2px] transition-all duration-600 ease-out\`}\\n\\t\\t\\t\\t\\t\\t>\\n\\t\\t\\t\\t\\t\\t\\t{name}\\n\\t\\t\\t\\t\\t\\t</p>\\n\\t\\t\\t\\t\\t</span></a\\n\\t\\t\\t\\t>\\n\\t\\t\\t</li>\\n\\t\\t{/each}\\n\\t</div>\\n\\n\\t<span class=\\"text-3xl text-secondary hidden md:flex\\">&nbsp;/&gt;</span>\\n\\n\\t<button on:click={() => (drawerVisible = !drawerVisible)} class=\\"md:hidden flex px-4\\">\\n\\t\\t<Icon icon=\\"mdi:hamburger-menu\\" class=\\"md:hidden flex text-secondary text-2xl\\" />\\n\\t</button>\\n\\n\\t{#if drawerVisible}\\n\\t\\t<div class=\\"drawer flex flex-col\\">\\n\\t\\t\\t<div\\n\\t\\t\\t\\tclass=\\"h-14 w-full border-b-[1px] border-border-bottom px-4 flex justify-between items-center\\"\\n\\t\\t\\t>\\n\\t\\t\\t\\t<button on:click={() => (drawerVisible = !drawerVisible)}>\\n\\t\\t\\t\\t\\t<Icon icon=\\"mdi:close\\" class=\\"md:hidden flex text-secondary text-2xl\\" />\\n\\t\\t\\t\\t</button>\\n\\t\\t\\t</div>\\n\\t\\t\\t<div class=\\"flex flex-col gap-4 ps-4 pt-4 w-min\\">\\n\\t\\t\\t\\t{#each sections as { name, id }}\\n\\t\\t\\t\\t\\t<li type=\\"none\\">\\n\\t\\t\\t\\t\\t\\t<a href={\`#\${id}\`} class:active={activeSectionId === id}\\n\\t\\t\\t\\t\\t\\t\\t><span\\n\\t\\t\\t\\t\\t\\t\\t\\tclass=\\"hover:text-secondary group transition-all duration-300 ease-in-out cursor-pointer text-secondary text-lg\\"\\n\\t\\t\\t\\t\\t\\t\\t>\\n\\t\\t\\t\\t\\t\\t\\t\\t<button on:click={() => (drawerVisible = !drawerVisible)}>\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t<p\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t\\tclass=\\"w-min mx-3 bg-left-bottom bg-gradient-to-r from-border to-border bg-[length:0%_2px] bg-no-repeat group-hover:bg-[length:100%_2px] transition-all duration-600 ease-out\\"\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t>\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t\\t{name}\\n\\t\\t\\t\\t\\t\\t\\t\\t\\t</p>\\n\\t\\t\\t\\t\\t\\t\\t\\t</button>\\n\\t\\t\\t\\t\\t\\t\\t</span></a\\n\\t\\t\\t\\t\\t\\t>\\n\\t\\t\\t\\t\\t</li>\\n\\t\\t\\t\\t{/each}\\n\\t\\t\\t</div>\\n\\t\\t</div>\\n\\t{/if}\\n</div>\\n\\n<style>\\n\\t.drawer {\\n\\t\\tbackground: #000;\\n\\t\\tposition: absolute;\\n\\t\\ttop: 0;\\n\\t\\tright: 0;\\n\\t\\tdisplay: flex;\\n\\t\\theight: 100vh;\\n\\t\\twidth: 80%;\\n\\t\\topacity: 1;\\n\\t\\toverflow: hidden;\\n\\t\\tborder-left: 1px solid green;\\n\\t}\\n</style>\\n"],"names":[],"mappings":"AA8EC,sBAAQ,CACP,UAAU,CAAE,IAAI,CAChB,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,CAAC,CACN,KAAK,CAAE,CAAC,CACR,OAAO,CAAE,IAAI,CACb,MAAM,CAAE,KAAK,CACb,KAAK,CAAE,GAAG,CACV,OAAO,CAAE,CAAC,CACV,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,GAAG,CAAC,KAAK,CAAC,KACxB"}`
};
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { sections = [] } = $$props;
  let { activeSectionId } = $$props;
  let { y } = $$props;
  if ($$props.sections === void 0 && $$bindings.sections && sections !== void 0) $$bindings.sections(sections);
  if ($$props.activeSectionId === void 0 && $$bindings.activeSectionId && activeSectionId !== void 0) $$bindings.activeSectionId(activeSectionId);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  $$result.css.add(css);
  return `<div class="${escape(
    null_to_empty("fixed z-10 w-full h-16 md:h-20 text-white flex justify-between items-center px-4 md:px-16 " + (y > 0 ? "bg-transparent backdrop-blur-md border-b-[1px] border-border-bottom" : "bg-primary")),
    true
  ) + " svelte-15gg23r"}"><span class="text-3xl text-secondary" data-svelte-h="svelte-r4cwbl">&lt; </span> <div class="md:gap-10 hidden md:flex">${each(sections, ({ name, id }) => {
    return `<li type="none"><a${add_attribute("href", `#${id}`, 0)}${add_classes((activeSectionId === id ? "active" : "").trim())}><span class="hover:text-secondary group transition-all duration-300 ease-in-out cursor-pointer text-secondary text-lg"><p class="${escape(null_to_empty(`mx-3 bg-left-bottom bg-gradient-to-r from-border to-border bg-[length:0%_2px] bg-no-repeat group-hover:bg-[length:100%_2px] transition-all duration-600 ease-out`), true) + " svelte-15gg23r"}">${escape(name)}</p> </span></a> </li>`;
  })}</div> <span class="text-3xl text-secondary hidden md:flex" data-svelte-h="svelte-xfv5yr"> /&gt;</span> <button class="md:hidden flex px-4">${validate_component(Icon, "Icon").$$render(
    $$result,
    {
      icon: "mdi:hamburger-menu",
      class: "md:hidden flex text-secondary text-2xl"
    },
    {},
    {}
  )}</button> ${``} </div>`;
});
const initialized = writable(false);
async function particlesInit(init) {
  tsParticles.init();
  await init(tsParticles);
  initialized.set(true);
}
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let sections = [
    { name: "Home", id: "home" },
    { name: "Skills", id: "skills" },
    { name: "Projects", id: "projects" },
    { name: "About", id: "about" },
    { name: "Contact", id: "contact" }
  ];
  let activeSectionId = sections[0].id;
  let particlesConfig = {
    particles: {
      color: { value: "#06591e" },
      links: { enable: true, color: "#06591e" },
      move: { enable: true },
      number: { value: 70 }
    }
  };
  void particlesInit(async (engine) => {
    await loadSlim(engine);
  });
  let y;
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${validate_component(missing_component, "svelte:component").$$render(
      $$result,
      {
        id: "tsparticles",
        options: particlesConfig
      },
      {},
      {}
    )} <div class="w-full flex flex-col bg-primary"><div class="z-50">${validate_component(Header, "Header").$$render(
      $$result,
      {
        y,
        sections,
        activeSection: activeSectionId
      },
      {
        activeSection: ($$value) => {
          activeSectionId = $$value;
          $$settled = false;
        }
      },
      {}
    )}</div> <div class="h-full z-20">${slots.default ? slots.default({}) : ``} ${validate_component(Main, "Main").$$render($$result, { y, sections, activeSectionId }, {}, {})}</div> ${validate_component(Footer, "Footer").$$render($$result, {}, {}, {})}</div> `;
  } while (!$$settled);
  return $$rendered;
});
export {
  Layout as default
};
