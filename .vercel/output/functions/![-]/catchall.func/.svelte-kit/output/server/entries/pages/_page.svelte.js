import { c as create_ssr_component, v as validate_component } from "../../chunks/ssr.js";
import { M as Main } from "../../chunks/Main.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(Main, "Main").$$render($$result, {}, {}, {})}`;
});
export {
  Page as default
};
