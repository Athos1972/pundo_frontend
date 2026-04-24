# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys/social-link-moderation.spec.ts >> Social-Link-Moderation AC1–AC10 >> AC8 — Shortener via_shortener message contains resolved host
- Location: e2e/journeys/social-link-moderation.spec.ts:653:7

# Error details

```
Error: AC8: Resolved host name must appear in the via_shortener error message

expect(received).toContain(expected) // indexOf

Expected substring: "pornhub.com"
Received string:    "Pundo ShopE2E Test Owner⊞Dashboard🏪Shop Profile🕐Opening Hours🏷️Offers⬆Import🔑API Keys★Reviews?HelpSign outPundo Shop☰Shop ProfileShop name*DescriptionShop Logo📷Upload imageJPEG, PNG, WebP — max 5 MBOr enter URL manuallyAddressLanguages spokenENDEELRUARHEPhone numberWhatsApp numberWebsite URLWebshop URLSocial mediaFacebookInstagramTikTokYouTubeLinkedInX / TwitterOther platformSaveself.__next_r=\"Nfs0fZDxn7miNyFCS3vaN\"(self.__next_f=self.__next_f||[]).push([0])self.__next_f.push([1,\"8:\\\"$Sreact.fragment\\\"\\na:I[\\\"[project]/node_modules/next/dist/client/components/layout-router.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"default\\\"]\\nc:I[\\\"[project]/node_modules/next/dist/client/components/render-from-template-context.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"default\\\"]\\ne:I[\\\"[project]/node_modules/next/dist/next-devtools/userspace/app/segment-explorer-node.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"SegmentViewNode\\\"]\\n4e:I[\\\"[project]/node_modules/next/dist/lib/framework/boundary-components.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"OutletBoundary\\\"]\\n50:\\\"$Sreact.suspense\\\"\\n5e:I[\\\"[project]/node_modules/next/dist/lib/framework/boundary-components.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"ViewportBoundary\\\"]\\n68:I[\\\"[project]/node_modules/next/dist/lib/framework/boundary-components.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"MetadataBoundary\\\"]\\n6f:I[\\\"[project]/node_modules/next/dist/client/components/builtin/global-error.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_global-error_004glpo.js\\\"],\\\"default\\\",1]\\n7d:I[\\\"[project]/node_modules/next/dist/lib/metadata/generate/icon-mark.js [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/node_modules_next_dist_0tt2wve._.js\\\",\\\"/_next/static/chunks/node_modules_next_dist_client_components_builtin_not-found_004glpo.js\\\"],\\\"IconMark\\\"]\\n:HL[\\\"/_next/static/chunks/%5Broot-of-the-server%5D__0spvw6d._.css\\\",\\\"style\\\",{\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"}]\\n:HL[\\\"/_next/static/media/5c285b27cdda1fe8-s.p.0yo6-5yoeeudq.woff2\\\",\\\"font\\\",{\\\"crossOrigin\\\":\\\"\\\",\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\",\\\"type\\\":\\\"font/woff2\\\"}]\\n1:D\\\"$5\\\"\\n1:D\\\"$2\\\"\\n1:D\\\"$6\\\"\\n1:null\\nf:D\\\"$11\\\"\\nf:D\\\"$10\\\"\\nf:D\\\"$13\\\"\\nf:D\\\"$12\\\"\\nf:D\\\"$14\\\"\\nf:[[\\\"$\\\",\\\"title\\\",null,{\\\"children\\\":\\\"404: This page could not be found.\\\"},\\\"$12\\\",\\\"$15\\\",1],[\\\"$\\\",\\\"div\\\",null,{\\\"style\\\":{\\\"fontFamily\\\":\\\"system-ui,\\\\\\\"Segoe UI\\\\\\\",Roboto,Helvetica,Arial,sans-serif,\\\\\\\"Apple Color Emoji\\\\\\\",\\\\\\\"Segoe UI Emoji\\\\\\\"\\\",\\\"height\\\":\\\"100vh\\\",\\\"textAlign\\\":\\\"center\\\",\\\"display\\\":\\\"flex\\\",\\\"flexDirection\\\":\\\"column\\\",\\\"alignItems\\\":\\\"center\\\",\\\"justifyContent\\\":\\\"center\\\"},\\\"children\\\":[\\\"$\\\",\\\"div\\\",null,{\\\"children\\\":[[\\\"$\\\",\\\"style\\\",null,{\\\"dangerouslySetInnerHTML\\\":{\\\"__html\\\":\\\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\\\"}},\\\"$12\\\",\\\"$18\\\",1],[\\\"$\\\",\\\"h1\\\",null,{\\\"className\\\":\\\"next-error-h1\\\",\\\"style\\\":{\\\"display\\\":\\\"inline-block\\\",\\\"margin\\\":\\\"0 20px 0 0\\\",\\\"padding\\\":\\\"0 23px 0 0\\\",\\\"fontSize\\\":24,\\\"fontWeight\\\":500,\\\"verticalAlign\\\":\\\"top\\\",\\\"lineHeight\\\":\\\"49px\\\"},\\\"children\\\":404},\\\"$12\\\",\\\"$19\\\",1],[\\\"$\\\",\\\"div\\\",null,{\\\"style\\\":{\\\"display\\\":\\\"inline-block\\\"},\\\"children\\\":[\\\"$\\\",\\\"h2\\\",null,{\\\"style\\\":{\\\"fontSize\\\":14,\\\"fontWeight\\\":400,\\\"lineHeight\\\":\\\"49px\\\",\\\"margin\\\":0},\\\"children\\\":\\\"This page could not be found.\\\"},\\\"$12\\\",\\\"$1b\\\",1]},\\\"$12\\\",\\\"$1a\\\",1]]},\\\"$12\\\",\\\"$17\\\",1]},\\\"$12\\\",\\\"$16\\\",1]]\\n22:D\\\"$2a\\\"\\n22:D\\\"$23\\\"\\n32:D\\\"$3a\\\"\\n32:D\\\"$33\\\"\\n40:D\\\"$44\\\"\\n40:D\\\"$41\\\"\\n49:D\\\"$4b\\\"\\n49:D\\\"$4a\\\"\\n49:D\\\"$4d\\\"\\n49:[\\\"$\\\",\\\"$L4e\\\",null,{\\\"children\\\":[\\\"$\\\",\\\"$50\\\",null,{\\\"name\\\":\\\"Next.MetadataOutlet\\\",\\\"children\\\":\\\"$@51\\\"},\\\"$4a\\\",\\\"$4f\\\",1]},\\\"$4a\\\",\\\"$4c\\\",1]\\n54:D\\\"$57\\\"\\n54:D\\\"$55\\\"\\n54:D\\\"$58\\\"\\n54:null\\n59:D\\\"$5b\\\"\\n59:D\\\"$5a\\\"\\n59:D\\\"$5d\\\"\\n5f:D\\\"$61\\\"\\n5f:D\\\"$60\\\"\\n59:[\\\"$\\\",\\\"$L5e\\\",null,{\\\"children\\\":\\\"$L5f\\\"},\\\"$5a\\\",\\\"$5c\\\",1]\\n62:D\\\"$64\\\"\\n62:D\\\"$63\\\"\\n62:D\\\"\"])self.__next_f.push([1,\"$66\\\"\\n6a:D\\\"$6c\\\"\\n6a:D\\\"$6b\\\"\\n62:[\\\"$\\\",\\\"div\\\",null,{\\\"hidden\\\":true,\\\"children\\\":[\\\"$\\\",\\\"$L68\\\",null,{\\\"children\\\":[\\\"$\\\",\\\"$50\\\",null,{\\\"name\\\":\\\"Next.Metadata\\\",\\\"children\\\":\\\"$L6a\\\"},\\\"$63\\\",\\\"$69\\\",1]},\\\"$63\\\",\\\"$67\\\",1]},\\\"$63\\\",\\\"$65\\\",1]\\n6e:[]\\n\"])self.__next_f.push([1,\"0:{\\\"P\\\":\\\"$1\\\",\\\"c\\\":[\\\"\\\",\\\"shop-admin\\\",\\\"profile?name=E2E+Test+Shop+Larnaca\\u0026description=\\u0026address=Finikoudes+Beach%2C+Larnaca%2C+Cyprus\\u0026phone=\\u0026whatsapp_number=\\u0026website_url=\\u0026webshop_url=\\\"],\\\"q\\\":\\\"?name=E2E%20Test%20Shop%20Larnaca\\u0026description=\\u0026address=Finikoudes%20Beach%2C%20Larnaca%2C%20Cyprus\\u0026phone=\\u0026whatsapp_number=\\u0026website_url=\\u0026webshop_url=\\\",\\\"i\\\":true,\\\"f\\\":[[[\\\"\\\",{\\\"children\\\":[\\\"(shop-admin)\\\",{\\\"children\\\":[\\\"shop-admin\\\",{\\\"children\\\":[\\\"(portal)\\\",{\\\"children\\\":[\\\"profile\\\",{\\\"children\\\":[\\\"__PAGE__?{\\\\\\\"name\\\\\\\":\\\\\\\"E2E Test Shop Larnaca\\\\\\\",\\\\\\\"description\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"address\\\\\\\":\\\\\\\"Finikoudes Beach, Larnaca, Cyprus\\\\\\\",\\\\\\\"phone\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"whatsapp_number\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"website_url\\\\\\\":\\\\\\\"\\\\\\\",\\\\\\\"webshop_url\\\\\\\":\\\\\\\"\\\\\\\"}\\\",{}]}]}]}]},\\\"$undefined\\\",\\\"$undefined\\\",16]}],[[\\\"$\\\",\\\"$8\\\",\\\"c\\\",{\\\"children\\\":[null,[\\\"$\\\",\\\"$La\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$undefined\\\",\\\"errorStyles\\\":\\\"$undefined\\\",\\\"errorScripts\\\":\\\"$undefined\\\",\\\"template\\\":[\\\"$\\\",\\\"$Lc\\\",null,{},null,\\\"$b\\\",1],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":[\\\"$\\\",\\\"$Le\\\",\\\"c-not-found\\\",{\\\"type\\\":\\\"not-found\\\",\\\"pagePath\\\":\\\"__next_builtin__not-found.js\\\",\\\"children\\\":[\\\"$f\\\",[]]},null,\\\"$d\\\",0],\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\",\\\"segmentViewBoundaries\\\":[[\\\"$\\\",\\\"$Le\\\",null,{\\\"type\\\":\\\"boundary:not-found\\\",\\\"pagePath\\\":\\\"__next_builtin__not-found.js@boundary\\\"},null,\\\"$1c\\\",1],\\\"$undefined\\\",\\\"$undefined\\\",[\\\"$\\\",\\\"$Le\\\",null,{\\\"type\\\":\\\"boundary:global-error\\\",\\\"pagePath\\\":\\\"__next_builtin__global-error.js\\\"},null,\\\"$1d\\\",1]]},null,\\\"$9\\\",1]]},null,\\\"$7\\\",0],{\\\"children\\\":[[\\\"$\\\",\\\"$Le\\\",\\\"layout\\\",{\\\"type\\\":\\\"layout\\\",\\\"pagePath\\\":\\\"(shop-admin)/layout.tsx\\\",\\\"children\\\":[\\\"$\\\",\\\"$8\\\",\\\"c\\\",{\\\"children\\\":[[[\\\"$\\\",\\\"link\\\",\\\"0\\\",{\\\"rel\\\":\\\"stylesheet\\\",\\\"href\\\":\\\"/_next/static/chunks/%5Broot-of-the-server%5D__0spvw6d._.css\\\",\\\"precedence\\\":\\\"next_static/chunks/[root-of-the-server]__0spvw6d._.css\\\",\\\"crossOrigin\\\":\\\"$undefined\\\",\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$20\\\",0],[\\\"$\\\",\\\"script\\\",\\\"script-0\\\",{\\\"src\\\":\\\"/_next/static/chunks/src_app_(shop-admin)_layout_tsx_004glpo._.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$21\\\",0]],\\\"$L22\\\"]},null,\\\"$1f\\\",1]},null,\\\"$1e\\\",0],{\\\"children\\\":[[\\\"$\\\",\\\"$8\\\",\\\"c\\\",{\\\"children\\\":[null,[\\\"$\\\",\\\"$La\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$undefined\\\",\\\"errorStyles\\\":\\\"$undefined\\\",\\\"errorScripts\\\":\\\"$undefined\\\",\\\"template\\\":[\\\"$\\\",\\\"$Lc\\\",null,{},null,\\\"$2d\\\",1],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":\\\"$undefined\\\",\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\",\\\"segmentViewBoundaries\\\":[\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\"]},null,\\\"$2c\\\",1]]},null,\\\"$2b\\\",0],{\\\"children\\\":[[\\\"$\\\",\\\"$Le\\\",\\\"layout\\\",{\\\"type\\\":\\\"layout\\\",\\\"pagePath\\\":\\\"(shop-admin)/shop-admin/(portal)/layout.tsx\\\",\\\"children\\\":[\\\"$\\\",\\\"$8\\\",\\\"c\\\",{\\\"children\\\":[[[\\\"$\\\",\\\"script\\\",\\\"script-0\\\",{\\\"src\\\":\\\"/_next/static/chunks/_08plq0i._.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$30\\\",0],[\\\"$\\\",\\\"script\\\",\\\"script-1\\\",{\\\"src\\\":\\\"/_next/static/chunks/src_app_(shop-admin)_shop-admin_(portal)_layout_tsx_0fu--8~._.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$31\\\",0]],\\\"$L32\\\"]},null,\\\"$2f\\\",1]},null,\\\"$2e\\\",0],{\\\"children\\\":[[\\\"$\\\",\\\"$8\\\",\\\"c\\\",{\\\"children\\\":[null,[\\\"$\\\",\\\"$La\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$undefined\\\",\\\"errorStyles\\\":\\\"$undefined\\\",\\\"errorScripts\\\":\\\"$undefined\\\",\\\"template\\\":[\\\"$\\\",\\\"$Lc\\\",null,{},null,\\\"$3d\\\",1],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":\\\"$undefined\\\",\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\",\\\"segmentViewBoundaries\\\":[\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\"]},null,\\\"$3c\\\",1]]},null,\\\"$3b\\\",0],{\\\"children\\\":[[\\\"$\\\",\\\"$8\\\",\\\"c\\\",{\\\"children\\\":[[\\\"$\\\",\\\"$Le\\\",\\\"c-page\\\",{\\\"type\\\":\\\"page\\\",\\\"pagePath\\\":\\\"(shop-admin)/shop-admin/(portal)/profile/page.tsx\\\",\\\"children\\\":\\\"$L40\\\"},null,\\\"$3f\\\",1],[[\\\"$\\\",\\\"script\\\",\\\"script-0\\\",{\\\"src\\\":\\\"/_next/static/chunks/node_modules_next_headers_0w_ctiq.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$45\\\",0],[\\\"$\\\",\\\"script\\\",\\\"script-1\\\",{\\\"src\\\":\\\"/_next/static/chunks/src_0~6fu61._.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$46\\\",0],[\\\"$\\\",\\\"script\\\",\\\"script-2\\\",{\\\"src\\\":\\\"/_next/static/chunks/node_modules_next_0slx6_o._.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$47\\\",0],[\\\"$\\\",\\\"script\\\",\\\"script-3\\\",{\\\"src\\\":\\\"/_next/static/chunks/src_app_(shop-admin)_shop-admin_(portal)_profile_page_tsx_0odn..4._.js\\\",\\\"async\\\":true,\\\"nonce\\\":\\\"R3A0hCuqLkiT+P0dG0h8oA==\\\"},null,\\\"$48\\\",0]],\\\"$49\\\"]},null,\\\"$3e\\\",0],{},null,false,null]},null,false,\\\"$@52\\\"]},null,false,null]},null,false,\\\"$@52\\\"]},null,false,null]},null,false,\\\"$@52\\\"],[\\\"$\\\",\\\"$8\\\",\\\"h\\\",{\\\"children\\\":[\\\"$54\\\",\\\"$59\\\",\\\"$62\\\",[\\\"$\\\",\\\"meta\\\",null,{\\\"name\\\":\\\"next-size-adjust\\\",\\\"content\\\":\\\"\\\"},null,\\\"$6d\\\",1]]},null,\\\"$53\\\",0],false]],\\\"m\\\":\\\"$W6e\\\",\\\"G\\\":[\\\"$6f\\\",[\\\"$\\\",\\\"$Le\\\",\\\"ge-svn\\\",{\\\"type\\\":\\\"global-error\\\",\\\"pagePath\\\":\\\"__next_builtin__global-error.js\\\",\\\"children\\\":[]},null,\\\"$70\\\",0]],\\\"S\\\":false,\\\"h\\\":null,\\\"s\\\":\\\"$undefined\\\",\\\"l\\\":\\\"$undefined\\\",\\\"p\\\":\\\"$undefined\\\",\\\"d\\\":\\\"$undefined\\\",\\\"b\\\":\\\"development\\\"}\\n\"])self.__next_f.push([1,\"71:[]\\n52:D\\\"$72\\\"\\n52:\\\"$W71\\\"\\n5f:D\\\"$73\\\"\\n5f:[[\\\"$\\\",\\\"meta\\\",\\\"0\\\",{\\\"charSet\\\":\\\"utf-8\\\"},\\\"$4a\\\",\\\"$74\\\",0],[\\\"$\\\",\\\"meta\\\",\\\"1\\\",{\\\"name\\\":\\\"viewport\\\",\\\"content\\\":\\\"width=device-width, initial-scale=1\\\"},\\\"$4a\\\",\\\"$75\\\",0],[\\\"$\\\",\\\"meta\\\",\\\"2\\\",{\\\"name\\\":\\\"theme-color\\\",\\\"content\\\":\\\"#D4622A\\\"},\\\"$4a\\\",\\\"$76\\\",0]]\\n51:D\\\"$77\\\"\\n51:null\\n6a:D\\\"$78\\\"\\n6a:[[\\\"$\\\",\\\"title\\\",\\\"0\\\",{\\\"children\\\":\\\"Shop Portal\\\"},\\\"$4a\\\",\\\"$79\\\",0],[\\\"$\\\",\\\"meta\\\",\\\"1\\\",{\\\"name\\\":\\\"description\\\",\\\"content\\\":\\\"Shop-Owner Portal\\\"},\\\"$4a\\\",\\\"$7a\\\",0],[\\\"$\\\",\\\"link\\\",\\\"2\\\",{\\\"rel\\\":\\\"icon\\\",\\\"href\\\":\\\"/icon.jpg?icon.0sie4e2qn96im.jpg\\\",\\\"sizes\\\":\\\"512x512\\\",\\\"type\\\":\\\"image/jpeg\\\"},\\\"$4a\\\",\\\"$7b\\\",0],[\\\"$\\\",\\\"$L7d\\\",\\\"3\\\",{},\\\"$4a\\\",\\\"$7c\\\",0]]\\n\"])self.__next_f.push([1,\"22:D\\\"$81\\\"\\n22:D\\\"$83\\\"\\n22:D\\\"$84\\\"\\n22:D\\\"$88\\\"\\n22:D\\\"$8a\\\"\\n22:D\\\"$8b\\\"\\n22:D\\\"$a7\\\"\\nac:D\\\"$ae\\\"\\nac:D\\\"$ad\\\"\\nac:D\\\"$b0\\\"\\nac:D\\\"$af\\\"\\nac:D\\\"$b1\\\"\\nac:[[\\\"$\\\",\\\"title\\\",null,{\\\"children\\\":\\\"404: This page could not be found.\\\"},\\\"$af\\\",\\\"$b2\\\",1],[\\\"$\\\",\\\"div\\\",null,{\\\"style\\\":\\\"$f:1:props:style\\\",\\\"children\\\":[\\\"$\\\",\\\"div\\\",null,{\\\"children\\\":[[\\\"$\\\",\\\"style\\\",null,{\\\"dangerouslySetInnerHTML\\\":{\\\"__html\\\":\\\"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}\\\"}},\\\"$af\\\",\\\"$b5\\\",1],[\\\"$\\\",\\\"h1\\\",null,{\\\"className\\\":\\\"next-error-h1\\\",\\\"style\\\":\\\"$f:1:props:children:props:children:1:props:style\\\",\\\"children\\\":404},\\\"$af\\\",\\\"$b6\\\",1],[\\\"$\\\",\\\"div\\\",null,{\\\"style\\\":\\\"$f:1:props:children:props:children:2:props:style\\\",\\\"children\\\":[\\\"$\\\",\\\"h2\\\",null,{\\\"style\\\":\\\"$f:1:props:children:props:children:2:props:children:props:style\\\",\\\"children\\\":\\\"This page could not be found.\\\"},\\\"$af\\\",\\\"$b8\\\",1]},\\\"$af\\\",\\\"$b7\\\",1]]},\\\"$af\\\",\\\"$b4\\\",1]},\\\"$af\\\",\\\"$b3\\\",1]]\\n22:[\\\"$\\\",\\\"html\\\",null,{\\\"lang\\\":\\\"en\\\",\\\"dir\\\":\\\"ltr\\\",\\\"children\\\":[\\\"$\\\",\\\"body\\\",null,{\\\"className\\\":\\\"dm_sans_eb7dfaae-module__Jm0yPa__variable antialiased bg-gray-50\\\",\\\"children\\\":[\\\"$\\\",\\\"$La\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$undefined\\\",\\\"errorStyles\\\":\\\"$undefined\\\",\\\"errorScripts\\\":\\\"$undefined\\\",\\\"template\\\":[\\\"$\\\",\\\"$Lc\\\",null,{},null,\\\"$aa\\\",1],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":[\\\"$\\\",\\\"$Le\\\",\\\"c-not-found\\\",{\\\"type\\\":\\\"not-found\\\",\\\"pagePath\\\":\\\"__next_builtin__not-found.js\\\",\\\"children\\\":[\\\"$ac\\\",[]]},null,\\\"$ab\\\",0],\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\",\\\"segmentViewBoundaries\\\":[[\\\"$\\\",\\\"$Le\\\",null,{\\\"type\\\":\\\"boundary:not-found\\\",\\\"pagePath\\\":\\\"__next_builtin__not-found.js@boundary\\\"},null,\\\"$b9\\\",1],\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\"]},null,\\\"$a9\\\",1]},\\\"$23\\\",\\\"$a8\\\",1]},\\\"$23\\\",\\\"$a6\\\",1]\\n\"])self.__next_f.push([1,\"df:I[\\\"[project]/src/components/shop-admin/AdminNav.tsx [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/src_app_(shop-admin)_layout_tsx_004glpo._.js\\\",\\\"/_next/static/chunks/_08plq0i._.js\\\",\\\"/_next/static/chunks/src_app_(shop-admin)_shop-admin_(portal)_layout_tsx_0fu--8~._.js\\\"],\\\"AdminNav\\\"]\\n32:D\\\"$ba\\\"\\n32:D\\\"$bc\\\"\\n32:D\\\"$bd\\\"\\n32:D\\\"$bf\\\"\\n32:D\\\"$c0\\\"\\n32:D\\\"$c2\\\"\\n32:D\\\"$c3\\\"\\n32:D\\\"$c7\\\"\\n32:D\\\"$c9\\\"\\n32:D\\\"$ca\\\"\\n32:D\\\"$cf\\\"\\n32:D\\\"$d0\\\"\\n32:D\\\"$db\\\"\\n32:D\\\"$da\\\"\\n32:D\\\"$dd\\\"\\n\"])self.__next_f.push([1,\"32:[\\\"$\\\",\\\"div\\\",null,{\\\"className\\\":\\\"flex flex-col md:flex-row min-h-screen bg-gray-50\\\",\\\"children\\\":[[\\\"$\\\",\\\"$Ldf\\\",null,{\\\"tr\\\":{\\\"register_title\\\":\\\"Register your shop\\\",\\\"register_subtitle\\\":\\\"Create an account to manage your shop on Pundo.\\\",\\\"login_title\\\":\\\"Sign in to your shop\\\",\\\"login_subtitle\\\":\\\"Manage your products, offers and opening hours.\\\",\\\"email\\\":\\\"Email\\\",\\\"password\\\":\\\"Password\\\",\\\"name\\\":\\\"Your name\\\",\\\"shop_name\\\":\\\"Shop name\\\",\\\"shop_address\\\":\\\"Shop address\\\",\\\"register_btn\\\":\\\"Create account\\\",\\\"login_btn\\\":\\\"Sign in\\\",\\\"logout\\\":\\\"Sign out\\\",\\\"already_account\\\":\\\"Already have an account?\\\",\\\"no_account\\\":\\\"Don't have an account?\\\",\\\"pending_title\\\":\\\"Account under review\\\",\\\"pending_desc\\\":\\\"Your email has been verified. Our team will review your shop and activate your account shortly.\\\",\\\"verify_title\\\":\\\"Verifying your email…\\\",\\\"verify_success\\\":\\\"Email verified! Your account is now under review.\\\",\\\"verify_error\\\":\\\"This verification link is invalid or has expired.\\\",\\\"nav_dashboard\\\":\\\"Dashboard\\\",\\\"nav_profile\\\":\\\"Shop Profile\\\",\\\"nav_hours\\\":\\\"Opening Hours\\\",\\\"nav_products\\\":\\\"Products\\\",\\\"nav_offers\\\":\\\"Offers\\\",\\\"nav_import\\\":\\\"Import\\\",\\\"nav_api_keys\\\":\\\"API Keys\\\",\\\"dashboard_title\\\":\\\"Dashboard\\\",\\\"dashboard_welcome\\\":\\\"Welcome back\\\",\\\"profile_title\\\":\\\"Shop Profile\\\",\\\"description\\\":\\\"Description\\\",\\\"logo_url\\\":\\\"Logo URL\\\",\\\"logo_upload_label\\\":\\\"Shop Logo\\\",\\\"logo_upload_button\\\":\\\"Upload image\\\",\\\"logo_upload_success\\\":\\\"Logo uploaded successfully.\\\",\\\"logo_upload_error\\\":\\\"Upload failed. Please try again.\\\",\\\"logo_upload_size_error\\\":\\\"File is too large. Maximum size is 5 MB.\\\",\\\"logo_or_url\\\":\\\"Or enter URL manually\\\",\\\"address\\\":\\\"Address\\\",\\\"spoken_languages\\\":\\\"Languages spoken\\\",\\\"phone\\\":\\\"Phone number\\\",\\\"whatsapp_number\\\":\\\"WhatsApp number\\\",\\\"website_url\\\":\\\"Website URL\\\",\\\"webshop_url\\\":\\\"Webshop URL\\\",\\\"social_links_title\\\":\\\"Social media\\\",\\\"social_platform_other\\\":\\\"Other platform\\\",\\\"social_platform_name\\\":\\\"Platform name\\\",\\\"social_platform_url\\\":\\\"URL\\\",\\\"save\\\":\\\"Save\\\",\\\"saving\\\":\\\"Saving…\\\",\\\"saved\\\":\\\"Saved\\\",\\\"hours_title\\\":\\\"Opening Hours\\\",\\\"hours_save\\\":\\\"Save hours\\\",\\\"closed\\\":\\\"Closed\\\",\\\"open_from\\\":\\\"Open from\\\",\\\"open_until\\\":\\\"until\\\",\\\"second_slot\\\":\\\"Second time slot\\\",\\\"days\\\":[\\\"Monday\\\",\\\"Tuesday\\\",\\\"Wednesday\\\",\\\"Thursday\\\",\\\"Friday\\\",\\\"Saturday\\\",\\\"Sunday\\\"],\\\"products_title\\\":\\\"Products \\u0026 Services\\\",\\\"add_product\\\":\\\"Add product\\\",\\\"product_name\\\":\\\"Name\\\",\\\"category\\\":\\\"Category\\\",\\\"available\\\":\\\"Available\\\",\\\"edit\\\":\\\"Edit\\\",\\\"delete\\\":\\\"Delete\\\",\\\"confirm_delete\\\":\\\"Are you sure you want to delete this item?\\\",\\\"cancel\\\":\\\"Cancel\\\",\\\"price\\\":\\\"Price\\\",\\\"currency\\\":\\\"Currency\\\",\\\"price_tiers_title\\\":\\\"Pricing\\\",\\\"add_price_tier\\\":\\\"Add pricing unit\\\",\\\"tier_unit_label\\\":\\\"Unit\\\",\\\"tier_unit_custom_placeholder\\\":\\\"e.g. per box, per project\\\",\\\"tier_steps_title\\\":\\\"Price steps\\\",\\\"add_step\\\":\\\"Add step\\\",\\\"step_min_qty\\\":\\\"From qty\\\",\\\"step_max_qty\\\":\\\"Until qty\\\",\\\"step_max_qty_hint\\\":\\\"empty = unlimited\\\",\\\"step_price\\\":\\\"Price\\\",\\\"step_currency\\\":\\\"Currency\\\",\\\"remove_step\\\":\\\"Remove\\\",\\\"remove_tier\\\":\\\"Remove unit\\\",\\\"tier_no_steps\\\":\\\"Add at least one price step.\\\",\\\"tier_step_error_max_lt_min\\\":\\\"Max must be ≥ min.\\\",\\\"tier_step_error_price\\\":\\\"Price must be \\u003e 0.\\\",\\\"offers_title\\\":\\\"Offers\\\",\\\"add_offer\\\":\\\"Add offer\\\",\\\"offer_title\\\":\\\"Title\\\",\\\"offer_desc\\\":\\\"Description\\\",\\\"valid_from\\\":\\\"Valid from\\\",\\\"valid_until\\\":\\\"Valid until\\\",\\\"product_link\\\":\\\"Link to product (optional)\\\",\\\"product_not_found\\\":\\\"Product not found or does not belong to this shop\\\",\\\"active\\\":\\\"Active\\\",\\\"expired\\\":\\\"Expired\\\",\\\"archive\\\":\\\"Archive\\\",\\\"offer_delete_active_error\\\":\\\"Active offers cannot be deleted. Archive first.\\\",\\\"import_title\\\":\\\"Import products\\\",\\\"upload_label\\\":\\\"Upload Excel / CSV\\\",\\\"upload_btn\\\":\\\"Upload file\\\",\\\"uploading\\\":\\\"Uploading…\\\",\\\"upload_success\\\":\\\"{n} products imported.\\\",\\\"upload_errors\\\":\\\"{n} rows with errors.\\\",\\\"sheets_label\\\":\\\"Google Sheets URL\\\",\\\"sheets_connect\\\":\\\"Connect\\\",\\\"sheets_sync\\\":\\\"Sync now\\\",\\\"sheets_syncing\\\":\\\"Syncing…\\\",\\\"sheets_remove\\\":\\\"Remove link\\\",\\\"sheets_last_sync\\\":\\\"Last sync\\\",\\\"sheets_status_ok\\\":\\\"OK\\\",\\\"sheets_status_error\\\":\\\"Error\\\",\\\"download_template\\\":\\\"Download template\\\",\\\"field_catalog_title\\\":\\\"Field reference\\\",\\\"field_catalog_intro\\\":\\\"Headers are case-insensitive. Spaces and hyphens in headers are ignored.\\\",\\\"field_catalog_col_name\\\":\\\"Column\\\",\\\"field_catalog_col_required\\\":\\\"Required?\\\",\\\"field_catalog_col_desc\\\":\\\"Description\\\",\\\"field_catalog_col_example\\\":\\\"Example\\\",\\\"field_catalog_required_yes\\\":\\\"Required\\\",\\\"field_catalog_required_no\\\":\\\"Optional\\\",\\\"field_name_desc\\\":\\\"Product name, unique per shop (case-insensitive dedup key).\\\",\\\"field_category_desc\\\":\\\"Free-text category. Empty = none.\\\",\\\"field_available_desc\\\":\\\"Availability. Accepts true/false, 1/0, yes/no, ja/nein. Default: true.\\\",\\\"field_image_url_desc\\\":\\\"Optional URL to the product image (JPEG/PNG/WebP, max 5 MB). Downloaded in background.\\\",\\\"field_catalog_footnote\\\":\\\"Price and unit are NOT imported — add price tiers in the portal after import.\\\",\\\"upload_hint_see_catalog\\\":\\\"The file must contain a 'name' column. See the field reference below.\\\",\\\"upload_formats_hint\\\":\\\".xlsx, .xls, .csv\\\",\\\"upload_error_unsupported_format\\\":\\\"Unsupported file format. Use .xlsx, .xls or .csv.\\\",\\\"upload_error_xls_unreadable\\\":\\\"This .xls file could not be read. Please save it as .xlsx or .csv.\\\",\\\"upload_error_too_large\\\":\\\"File too large. Maximum size is 5 MB.\\\",\\\"image_download_pending\\\":\\\"{n} product images are being downloaded in the background…\\\",\\\"image_download_errors_title\\\":\\\"{n} product images could not be loaded\\\",\\\"image_download_errors_detail_toggle\\\":\\\"Show details\\\",\\\"image_download_error_reason_header\\\":\\\"Reason\\\",\\\"api_keys_title\\\":\\\"API Keys\\\",\\\"add_key\\\":\\\"New API key\\\",\\\"key_name\\\":\\\"Name\\\",\\\"key_scope\\\":\\\"Scope\\\",\\\"key_created\\\":\\\"Created\\\",\\\"key_last_used\\\":\\\"Last used\\\",\\\"key_never\\\":\\\"Never\\\",\\\"key_copy\\\":\\\"Copy key\\\",\\\"key_copied\\\":\\\"Copied!\\\",\\\"key_once_warning\\\":\\\"This key is shown only once. Copy it now.\\\",\\\"scope_read\\\":\\\"Read\\\",\\\"scope_write\\\":\\\"Write\\\",\\\"scope_read_write\\\":\\\"Read \\u0026 Write\\\",\\\"nav_help\\\":\\\"Help\\\",\\\"help_title\\\":\\\"Help \\u0026 FAQ\\\",\\\"nav_reviews\\\":\\\"Reviews\\\",\\\"reviews_title\\\":\\\"Review Moderation\\\",\\\"reviews_filter_all\\\":\\\"All\\\",\\\"reviews_filter_reported\\\":\\\"Reported\\\",\\\"reviews_filter_invalidated\\\":\\\"Invalidated\\\",\\\"reviews_invalidate\\\":\\\"Invalidate\\\",\\\"reviews_restore\\\":\\\"Restore\\\",\\\"reviews_audit_log\\\":\\\"Audit log\\\",\\\"reviews_invalidate_reason\\\":\\\"Reason\\\",\\\"reviews_reason_spam\\\":\\\"Spam\\\",\\\"reviews_reason_offensive\\\":\\\"Offensive\\\",\\\"reviews_reason_legal\\\":\\\"Legal\\\",\\\"reviews_reason_other\\\":\\\"Other\\\",\\\"reviews_invalidated_badge\\\":\\\"Invalidated\\\",\\\"reviews_reported_badge\\\":\\\"{n} report(s)\\\",\\\"reviews_confirm_invalidate\\\":\\\"Invalidate this review?\\\",\\\"reviews_confirm_restore\\\":\\\"Restore this review?\\\",\\\"reviews_no_items\\\":\\\"No reviews found.\\\",\\\"reviews_entity_product\\\":\\\"Product\\\",\\\"reviews_entity_shop\\\":\\\"Shop\\\",\\\"reviews_audit_action_created\\\":\\\"Created\\\",\\\"reviews_audit_action_edited\\\":\\\"Edited\\\",\\\"reviews_audit_action_reported\\\":\\\"Reported\\\",\\\"reviews_audit_action_invalidated\\\":\\\"Invalidated\\\",\\\"reviews_audit_action_restored\\\":\\\"Restored\\\",\\\"reviews_audit_action_photo_approved\\\":\\\"Photo approved\\\",\\\"reviews_audit_action_photo_rejected\\\":\\\"Photo rejected\\\",\\\"reviews_action_failed\\\":\\\"Action failed. Please try again.\\\",\\\"product_photos\\\":\\\"Product photos\\\",\\\"product_photos_add\\\":\\\"Add photo\\\",\\\"product_photos_remove\\\":\\\"Remove photo\\\",\\\"product_photos_move_up\\\":\\\"Move up\\\",\\\"product_photos_move_down\\\":\\\"Move down\\\",\\\"product_photos_size_error\\\":\\\"File is too large. Maximum size is 5 MB.\\\",\\\"product_photos_type_error\\\":\\\"Invalid file type. Use JPEG, PNG or WebP.\\\",\\\"product_photos_upload_error\\\":\\\"Upload failed. Please try again.\\\",\\\"product_photos_hint\\\":\\\"JPEG, PNG, WebP — max 5 MB, up to 8 photos.\\\",\\\"product_photos_limit_error\\\":\\\"Maximum of 8 photos reached.\\\",\\\"item_picker_title\\\":\\\"Select item\\\",\\\"item_picker_ean_label\\\":\\\"EAN / Barcode\\\",\\\"item_picker_search_label\\\":\\\"Search by name\\\",\\\"item_picker_no_results\\\":\\\"No results found\\\",\\\"item_picker_add_new\\\":\\\"Create new item\\\",\\\"item_picker_selected\\\":\\\"Selected\\\",\\\"item_type_product\\\":\\\"Product\\\",\\\"item_type_service\\\":\\\"Service\\\",\\\"fuzzy_match_warning\\\":\\\"Similar items found\\\",\\\"fuzzy_match_hint\\\":\\\"Please select an existing item or confirm that your item is genuinely new.\\\",\\\"fuzzy_match_confirm\\\":\\\"Create anyway\\\",\\\"offer_step_item\\\":\\\"1. Select item\\\",\\\"offer_step_price\\\":\\\"2. Price \\u0026 details\\\",\\\"offer_action_title\\\":\\\"Promotion name (optional)\\\",\\\"offer_action_description\\\":\\\"Promotion description (optional)\\\",\\\"offer_url_label\\\":\\\"Link to promotion\\\",\\\"offer_permanent\\\":\\\"Permanent price (no expiry)\\\",\\\"source_scraper\\\":\\\"Automatic\\\",\\\"source_shop_manual\\\":\\\"Manual\\\",\\\"source_shop_upload\\\":\\\"Import\\\",\\\"source_spotted\\\":\\\"Spotted\\\",\\\"source_admin\\\":\\\"Admin\\\",\\\"photo_upload_label\\\":\\\"Photos\\\",\\\"photo_upload_limit\\\":\\\"Maximum 8 photos\\\",\\\"photo_set_main\\\":\\\"Set as main photo\\\",\\\"photo_from_pundo\\\":\\\"From Pundo\\\",\\\"photo_from_shop\\\":\\\"From your shop\\\",\\\"photo_delete\\\":\\\"Delete\\\",\\\"error_generic\\\":\\\"Something went wrong. Please try again.\\\",\\\"no_results\\\":\\\"No items yet.\\\",\\\"load_more\\\":\\\"Load more\\\",\\\"back\\\":\\\"Back\\\",\\\"required\\\":\\\"This field is required.\\\",\\\"social_blocked_generic\\\":\\\"This link is not allowed.\\\",\\\"social_blocked_adult\\\":\\\"Adult content is not permitted.\\\",\\\"social_blocked_gambling\\\":\\\"Gambling content is not permitted.\\\",\\\"social_blocked_hate\\\":\\\"Hate speech is not permitted.\\\",\\\"social_blocked_illegal\\\":\\\"Illegal content is not permitted.\\\",\\\"social_blocked_malware\\\":\\\"This link points to a known malware site.\\\",\\\"social_blocked_shortener_unresolvable\\\":\\\"Short link could not be verified — please enter the direct URL.\\\",\\\"social_blocked_via_shortener\\\":\\\"The short link resolves to ⁨{host}⁩, which is not allowed.\\\",\\\"social_blocked_toast\\\":\\\"Please fix the highlighted social-media link.\\\"},\\\"ownerName\\\":\\\"E2E Test Owner\\\"},\\\"$da\\\",\\\"$de\\\",1],\\\"$Le0\\\",\\\"$Le1\\\"]},\\\"$da\\\",\\\"$dc\\\",1]\\n\"])self.__next_f.push([1,\"ff:I[\\\"[project]/src/components/shop-admin/Toast.tsx [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/src_app_(shop-admin)_layout_tsx_004glpo._.js\\\",\\\"/_next/static/chunks/_08plq0i._.js\\\",\\\"/_next/static/chunks/src_app_(shop-admin)_shop-admin_(portal)_layout_tsx_0fu--8~._.js\\\"],\\\"ToastProvider\\\"]\\n104:I[\\\"[project]/src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx [app-client] (ecmascript)\\\",[\\\"/_next/static/chunks/src_app_(shop-admin)_layout_tsx_004glpo._.js\\\",\\\"/_next/static/chunks/_08plq0i._.js\\\",\\\"/_next/static/chunks/src_app_(shop-admin)_shop-admin_(portal)_layout_tsx_0fu--8~._.js\\\",\\\"/_next/static/chunks/node_modules_next_headers_0w_ctiq.js\\\",\\\"/_next/static/chunks/src_0~6fu61._.js\\\",\\\"/_next/static/chunks/node_modules_next_0slx6_o._.js\\\",\\\"/_next/static/chunks/src_app_(shop-admin)_shop-admin_(portal)_profile_page_tsx_0odn..4._.js\\\"],\\\"ProfileForm\\\"]\\n40:D\\\"$e2\\\"\\n40:D\\\"$e4\\\"\\n40:D\\\"$e5\\\"\\n40:D\\\"$e9\\\"\\n40:D\\\"$eb\\\"\\n40:D\\\"$ec\\\"\\n40:D\\\"$f1\\\"\\n40:D\\\"$f2\\\"\\ne0:D\\\"$fa\\\"\\ne0:[\\\"$\\\",\\\"main\\\",null,{\\\"className\\\":\\\"flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto\\\",\\\"children\\\":[\\\"$\\\",\\\"$La\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$undefined\\\",\\\"errorStyles\\\":\\\"$undefined\\\",\\\"errorScripts\\\":\\\"$undefined\\\",\\\"template\\\":[\\\"$\\\",\\\"$Lc\\\",null,{},null,\\\"$fc\\\",1],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":\\\"$undefined\\\",\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\",\\\"segmentViewBoundaries\\\":[\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\",\\\"$undefined\\\"]},null,\\\"$fb\\\",1]},\\\"$da\\\",\\\"$f9\\\",1]\\ne1:D\\\"$fe\\\"\\ne1:[\\\"$\\\",\\\"$Lff\\\",null,{},\\\"$da\\\",\\\"$fd\\\",1]\\n40:D\\\"$101\\\"\\n40:[\\\"$\\\",\\\"div\\\",null,{\\\"className\\\":\\\"flex flex-col gap-6 max-w-xl\\\",\\\"children\\\":[[\\\"$\\\",\\\"h1\\\",null,{\\\"className\\\":\\\"text-2xl font-bold text-gray-900\\\",\\\"children\\\":\\\"Shop Profile\\\"},\\\"$41\\\",\\\"$102\\\",1],[\\\"$\\\",\\\"$L104\\\",null,{\\\"shop\\\":{\\\"id\\\":2214,\\\"name\\\":\\\"E2E Test Shop Larnaca\\\",\\\"description\\\":null,\\\"logo_url\\\":null,\\\"address\\\":\\\"Finikoudes Beach, Larnaca, Cyprus\\\",\\\"location\\\":{\\\"lat\\\":34.9177,\\\"lng\\\":33.6273},\\\"spoken_languages\\\":[],\\\"phone\\\":null,\\\"whatsapp_number\\\":null,\\\"website_url\\\":null,\\\"webshop_url\\\":null,\\\"social_links\\\":null,\\\"whatsapp_url\\\":null},\\\"lang\\\":\\\"en\\\"},\\\"$41\\\",\\\"$103\\\",1]]},\\\"$41\\\",\\\"$100\\\",1]\\n\"])"
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Pundo Shop
      - generic [ref=e6]: E2E Test Owner
    - navigation "Shop admin navigation" [ref=e7]:
      - list [ref=e8]:
        - listitem [ref=e9]:
          - link "Dashboard" [ref=e10] [cursor=pointer]:
            - /url: /shop-admin/dashboard
            - generic [ref=e11]: ⊞
            - text: Dashboard
        - listitem [ref=e12]:
          - link "Shop Profile" [ref=e13] [cursor=pointer]:
            - /url: /shop-admin/profile
            - generic [ref=e14]: 🏪
            - text: Shop Profile
        - listitem [ref=e15]:
          - link "Opening Hours" [ref=e16] [cursor=pointer]:
            - /url: /shop-admin/hours
            - generic [ref=e17]: 🕐
            - text: Opening Hours
        - listitem [ref=e18]:
          - link "Offers" [ref=e19] [cursor=pointer]:
            - /url: /shop-admin/offers
            - generic [ref=e20]: 🏷️
            - text: Offers
        - listitem [ref=e21]:
          - link "Import" [ref=e22] [cursor=pointer]:
            - /url: /shop-admin/import
            - generic [ref=e23]: ⬆
            - text: Import
        - listitem [ref=e24]:
          - link "API Keys" [ref=e25] [cursor=pointer]:
            - /url: /shop-admin/api-keys
            - generic [ref=e26]: 🔑
            - text: API Keys
        - listitem [ref=e27]:
          - link "Reviews" [ref=e28] [cursor=pointer]:
            - /url: /shop-admin/reviews
            - generic [ref=e29]: ★
            - text: Reviews
        - listitem [ref=e30]:
          - link "Help" [ref=e31] [cursor=pointer]:
            - /url: /shop-admin/help
            - generic [ref=e32]: "?"
            - text: Help
    - button "Sign out" [ref=e34]
  - main [ref=e35]:
    - generic [ref=e36]:
      - heading "Shop Profile" [level=1] [ref=e37]
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]: Shop name*
          - textbox "Shop name*" [ref=e41]: E2E Test Shop Larnaca
        - generic [ref=e42]:
          - generic [ref=e43]: Description
          - textbox "Description" [ref=e44]
        - generic [ref=e45]:
          - generic [ref=e46]: Shop Logo
          - generic [ref=e47]:
            - generic [ref=e49]: 📷
            - generic [ref=e50]:
              - button "Upload image" [ref=e51]
              - paragraph [ref=e52]: JPEG, PNG, WebP — max 5 MB
          - button "Or enter URL manually" [ref=e53]
        - generic [ref=e54]:
          - generic [ref=e55]: Address
          - textbox "Address" [ref=e56]: Finikoudes Beach, Larnaca, Cyprus
        - generic [ref=e57]:
          - generic [ref=e58]: Languages spoken
          - group "Languages spoken" [ref=e59]:
            - button "EN" [ref=e60]
            - button "DE" [ref=e61]
            - button "EL" [ref=e62]
            - button "RU" [ref=e63]
            - button "AR" [ref=e64]
            - button "HE" [ref=e65]
        - generic [ref=e66]:
          - generic [ref=e67]: Phone number
          - textbox "Phone number" [ref=e68]:
            - /placeholder: "+35799123456"
        - generic [ref=e69]:
          - generic [ref=e70]: WhatsApp number
          - textbox "WhatsApp number" [ref=e71]:
            - /placeholder: "+35799123456"
        - generic [ref=e72]:
          - generic [ref=e73]:
            - generic [ref=e74]: Website URL
            - textbox "Website URL" [ref=e75]:
              - /placeholder: https://...
          - generic [ref=e76]:
            - generic [ref=e77]: Webshop URL
            - textbox "Webshop URL" [ref=e78]:
              - /placeholder: https://...
        - generic [ref=e79]:
          - generic [ref=e80]: Social media
          - generic [ref=e81]:
            - generic [ref=e82]:
              - generic [ref=e83]: Facebook
              - textbox "https://..." [ref=e85]
            - generic [ref=e86]:
              - generic [ref=e87]: Instagram
              - textbox "https://..." [ref=e89]
            - generic [ref=e90]:
              - generic [ref=e91]: TikTok
              - textbox "https://..." [ref=e93]
            - generic [ref=e94]:
              - generic [ref=e95]: YouTube
              - textbox "https://..." [ref=e97]
            - generic [ref=e98]:
              - generic [ref=e99]: LinkedIn
              - textbox "https://..." [ref=e101]
            - generic [ref=e102]:
              - generic [ref=e103]: X / Twitter
              - textbox "https://..." [ref=e105]
            - generic [ref=e106]:
              - generic [ref=e107]: Other platform
              - generic [ref=e108]:
                - textbox "Platform name" [ref=e109]
                - 'textbox "URL: https://..." [ref=e111]'
        - button "Save" [ref=e112]
```

# Test source

```ts
  582 | 
  583 |   test('AC8 — All 9 translation keys exist in all 6 languages (static source analysis)', async () => {
  584 |     const translationsPath = path.join(
  585 |       __dirname, '..', '..', 'src', 'lib', 'shop-admin-translations.ts'
  586 |     )
  587 |     const content = fs.readFileSync(translationsPath, 'utf8')
  588 | 
  589 |     const requiredKeys = [
  590 |       'social_blocked_generic',
  591 |       'social_blocked_adult',
  592 |       'social_blocked_gambling',
  593 |       'social_blocked_hate',
  594 |       'social_blocked_illegal',
  595 |       'social_blocked_malware',
  596 |       'social_blocked_shortener_unresolvable',
  597 |       'social_blocked_via_shortener',
  598 |       'social_blocked_toast',
  599 |     ]
  600 | 
  601 |     for (const key of requiredKeys) {
  602 |       const occurrences = (content.match(new RegExp(key, 'g')) ?? []).length
  603 |       expect(occurrences, `AC8: "${key}" must appear in all 6 languages (found ${occurrences})`).toBeGreaterThanOrEqual(6)
  604 |     }
  605 | 
  606 |     // FSI/PDI bidi isolation present in via_shortener template for ar/he
  607 |     const fsiCount = (content.match(/\\u2068/g) ?? []).length
  608 |     expect(fsiCount, 'AC8: FSI bidi isolation (\\u2068) must be present for RTL languages').toBeGreaterThan(0)
  609 |   })
  610 | 
  611 |   test('AC8 — German (de) error message shown for adult block (mocked 422)', async ({ page }) => {
  612 |     await page.context().addCookies([
  613 |       { name: 'app_lang', value: 'de', url: FRONTEND_URL },
  614 |     ])
  615 | 
  616 |     await page.route('**/api/shop-admin/shop', async (route) => {
  617 |       if (route.request().method() === 'PATCH') {
  618 |         await route.fulfill({
  619 |           status: 422,
  620 |           contentType: 'application/json',
  621 |           body: JSON.stringify({
  622 |             error: 'social_link_blocked',
  623 |             key: 'mylink',
  624 |             category: 'adult',
  625 |             resolved_host: null,
  626 |             via_shortener: false,
  627 |           }),
  628 |         })
  629 |       } else {
  630 |         await route.continue()
  631 |       }
  632 |     })
  633 | 
  634 |     await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
  635 |     await page.waitForLoadState('networkidle')
  636 | 
  637 |     const lastUrlInput = page.locator('input[type="url"]').last()
  638 |     await lastUrlInput.fill('https://onlyfans.com/test')
  639 |     await page.locator('button[type="submit"]').first().click()
  640 |     await page.waitForTimeout(1500)
  641 | 
  642 |     const bodyText = await page.textContent('body') ?? ''
  643 |     // German: "Erwachseneninhalte sind nicht erlaubt." or toast "Bitte korrigiere..."
  644 |     const hasGermanMsg =
  645 |       bodyText.includes('Erwachseneninhalte') ||
  646 |       bodyText.includes('nicht erlaubt') ||
  647 |       bodyText.includes('korrigiere') ||
  648 |       bodyText.includes('markierten')
  649 | 
  650 |     expect(hasGermanMsg, 'AC8: German (de) locale must show German error messages').toBe(true)
  651 |   })
  652 | 
  653 |   test('AC8 — Shortener via_shortener message contains resolved host', async ({ page }) => {
  654 |     await page.route('**/api/shop-admin/shop', async (route) => {
  655 |       if (route.request().method() === 'PATCH') {
  656 |         await route.fulfill({
  657 |           status: 422,
  658 |           contentType: 'application/json',
  659 |           body: JSON.stringify({
  660 |             error: 'social_link_blocked',
  661 |             key: 'mylink',
  662 |             category: 'adult',
  663 |             resolved_host: 'pornhub.com',
  664 |             via_shortener: true,
  665 |           }),
  666 |         })
  667 |       } else {
  668 |         await route.continue()
  669 |       }
  670 |     })
  671 | 
  672 |     await page.goto(`${FRONTEND_URL}/shop-admin/profile`)
  673 |     await page.waitForLoadState('networkidle')
  674 | 
  675 |     const lastUrlInput = page.locator('input[type="url"]').last()
  676 |     await lastUrlInput.fill('https://tinyurl.com/abc123')
  677 |     await page.locator('button[type="submit"]').first().click()
  678 |     await page.waitForTimeout(1500)
  679 | 
  680 |     const bodyText = await page.textContent('body') ?? ''
  681 |     // The resolved_host 'pornhub.com' should appear in the error message
> 682 |     expect(bodyText, 'AC8: Resolved host name must appear in the via_shortener error message').toContain('pornhub.com')
      |                                                                                                ^ Error: AC8: Resolved host name must appear in the via_shortener error message
  683 |   })
  684 | 
  685 |   // ─── AC9 — Performance ─────────────────────────────────────────────────────
  686 | 
  687 |   test('AC9 — Performance: shop save completes within 5s (BLOCKED — backend not implemented)', async () => {
  688 |     if (!ctx.backendValidates) {
  689 |       test.skip(true, 'AC9: Backend social-link validation not implemented — cannot measure real shortener timeout')
  690 |       return
  691 |     }
  692 |     const start = Date.now()
  693 |     const res = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  694 |       method: 'PATCH',
  695 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  696 |       body: JSON.stringify({ social_links: { xing: 'https://xing.com/profile/test-perf' } }),
  697 |     })
  698 |     const elapsed = Date.now() - start
  699 |     expect(elapsed, 'AC9: Save must complete within 5000ms').toBeLessThan(5000)
  700 |     expect([200, 204, 422]).toContain(res.status)
  701 |   })
  702 | 
  703 |   // ─── AC10 — Kein rückwirkendes Delete ──────────────────────────────────────
  704 | 
  705 |   test('AC10 — Existing link persists after blocklist expansion (BLOCKED — backend not implemented)', async () => {
  706 |     if (!ctx.hasSocialLinkRulesEndpoint || !ctx.backendValidates) {
  707 |       test.skip(true, 'AC10: Backend not implemented — both blocklist CRUD and social-link validation required')
  708 |       return
  709 |     }
  710 |     const testHost = `e2e-existing-${UUID}.example`
  711 | 
  712 |     // Step 1: Save link (testHost not yet blocked) → must succeed
  713 |     const save1 = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  714 |       method: 'PATCH',
  715 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  716 |       body: JSON.stringify({ social_links: { mylink: `https://${testHost}/page` } }),
  717 |     })
  718 |     expect([200, 204]).toContain(save1.status)
  719 | 
  720 |     // Step 2: Admin adds host to blocklist
  721 |     const createRule = await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules`, {
  722 |       method: 'POST',
  723 |       headers: { 'Content-Type': 'application/json', Cookie: `admin_token=${ctx.adminToken}` },
  724 |       body: JSON.stringify({ host: testHost, category: 'adult', note: `AC10 E2E ${UUID}` }),
  725 |     })
  726 |     expect([200, 201]).toContain(createRule.status)
  727 |     const rule = await createRule.json()
  728 | 
  729 |     // Step 3: Read shop — link must still exist (not retroactively deleted)
  730 |     const shopRes = await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  731 |       headers: { Cookie: `shop_owner_token=${ctx.ownerToken}` },
  732 |     })
  733 |     expect(shopRes.ok).toBe(true)
  734 |     const shopData = await shopRes.json()
  735 |     const socialLinks = shopData?.social_links ?? shopData?.shop?.social_links ?? {}
  736 |     const linkStillExists = Object.values(socialLinks).some(
  737 |       (v: unknown) => typeof v === 'string' && v.includes(testHost)
  738 |     )
  739 |     expect(linkStillExists, 'AC10: Existing link must NOT be retroactively deleted after blocklist expansion').toBe(true)
  740 | 
  741 |     // Cleanup
  742 |     await fetch(`${BACKEND_URL}/api/v1/admin/social-link-rules/${rule.id}`, {
  743 |       method: 'DELETE',
  744 |       headers: { Cookie: `admin_token=${ctx.adminToken}` },
  745 |     })
  746 |     await fetch(`${BACKEND_URL}/api/v1/shop-owner/shop`, {
  747 |       method: 'PATCH',
  748 |       headers: { 'Content-Type': 'application/json', Cookie: `shop_owner_token=${ctx.ownerToken}` },
  749 |       body: JSON.stringify({ social_links: null }),
  750 |     })
  751 |   })
  752 | 
  753 | })
  754 | 
```