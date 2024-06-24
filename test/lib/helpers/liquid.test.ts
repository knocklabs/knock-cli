import { expect } from "@oclif/test";

import { LiquidParseError } from "@/lib/helpers/error";
import { validateLiquidSyntax } from "@/lib/helpers/liquid";

describe("lib/helpers/liquid", () => {
  describe("validateLiquidSyntax", () => {
    describe("given an invalid liquid string, with unclosed curly braces", () => {
      it("returns a LiquidParseError", async () => {
        const ret = validateLiquidSyntax("{{ hello ");

        expect(ret).to.be.an.instanceof(LiquidParseError);
      });
    });

    describe("given an invalid liquid string, with a nonexistent tag", () => {
      it("returns a LiquidParseError", async () => {
        const ret = validateLiquidSyntax("{% wrap %}");

        expect(ret).to.be.an.instanceof(LiquidParseError);
      });
    });

    describe("given an invalid liquid string, with an unsupported tag", () => {
      it("returns a LiquidParseError", async () => {
        const ret1 = validateLiquidSyntax("{% include 'footer.liquid' %}");
        expect(ret1).to.be.an.instanceof(LiquidParseError);
      });
    });

    describe("given a valid liquid string, with custom filters", () => {
      it("returns undefined (i.e. no errors)", async () => {
        const content = `
{{ page.title }}

{% if user %}
  Hello {{ user.name }}!
{% endif %}

{% for user in site.users %}
  {{ user }}
{% endfor %}

{{ "/my/fancy/url" | append: ".html" }}

{{ "adam!" | capitalize | prepend: "Hello " }}

{% assign name = "Tobi" %}
{% assign featured_product = all_products['product_handle'] %}

{% capture about_me %}
I am {{ age }} and my favorite food is {{ favorite_food }}.
{% endcapture %}

{{ about_me }}

<-- knock custom filter examples -->
{{timestamp | timezone: "America/New_York"}}
{{ 10000 | format_number: "en" }}
{{ 10.99 | rounded_currency: "GBP", "en" }}
{{ project_name | titlecase }}
`.trimStart();

        const ret = validateLiquidSyntax(content);
        expect(ret).to.be.equal(undefined);
      });
    });
  });
});
