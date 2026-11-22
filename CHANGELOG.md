# Changelog

## [0.2.0-alpha.1](https://github.com/jingcai86/modern-charts/compare/v0.1.0-alpha.1...v0.2.0-alpha.1) (2026-11-22)


### Features

* **bar:** add coexisting outer/stack-summary bar labels with negative positioning, padding, and full &lt;mc-label&gt; customization ([#25](https://github.com/jingcai86/modern-charts/issues/25)) ([94d64a4](https://github.com/jingcai86/modern-charts/commit/94d64a42bf8e2fcb6fabb39bc72866bb350a2c70))
* **context:** move demo site to apps/ and add AI context documentation & schemas ([#17](https://github.com/jingcai86/modern-charts/issues/17)) ([#27](https://github.com/jingcai86/modern-charts/issues/27)) ([ecd4003](https://github.com/jingcai86/modern-charts/commit/ecd4003e157a882d1c4570df018213c6ad71d1e0))
* **demo:** add 4 interactive guide pages (Custom Layers, Themes, D3, Custom Labels) ([#20](https://github.com/jingcai86/modern-charts/issues/20)) ([de4c3e6](https://github.com/jingcai86/modern-charts/commit/de4c3e6ae54fdf57b2ab42c7bc297874fa87e9c8))
* **demo:** scrollable attributes panel, live-editable HTML markup & cleanup ([#19](https://github.com/jingcai86/modern-charts/issues/19)) ([c14f6d8](https://github.com/jingcai86/modern-charts/commit/c14f6d8ebc62d1ddd9724bb8bb0c409ccc538d04))
* **exports:** add per-chart standalone subpath exports and tree-shakeable D3 imports ([#24](https://github.com/jingcai86/modern-charts/issues/24)) ([81bb29f](https://github.com/jingcai86/modern-charts/commit/81bb29f0e3b631e00527e9156c634089ebafc4e3))
* **legend:** unified Pretext SVG &lt;mc-legend&gt; component with 4 positions, padding, wrapping & dedicated legend tooltip ([#35](https://github.com/jingcai86/modern-charts/issues/35)) ([fa6c417](https://github.com/jingcai86/modern-charts/commit/fa6c41762e9158b47863719e33a8772686610f3c))
* **markers:** add inside/outside marker label positioning, padding controls, and auto-margin expansion ([#23](https://github.com/jingcai86/modern-charts/issues/23)) ([4f5adce](https://github.com/jingcai86/modern-charts/commit/4f5adceaccd3bf4c79c8b1e18ec5eb9dd4ee161b))
* **markers:** marker legends, outside annotations (left/right/top/bottom + padding) & interactive tooltips ([#37](https://github.com/jingcai86/modern-charts/issues/37)) ([f99f3e6](https://github.com/jingcai86/modern-charts/commit/f99f3e64a3492f16a5721a5475bdb2a517076671))
* **markers:** partial/split threshold styling via Option B semantic &lt;g&gt; ARIA host and clipped shapes ([#18](https://github.com/jingcai86/modern-charts/issues/18)) ([#29](https://github.com/jingcai86/modern-charts/issues/29)) ([e64cd55](https://github.com/jingcai86/modern-charts/commit/e64cd55fc7715a0db03a7f601e2a9944b8373e22))
* **studio:** studio improvements — modular structure, compact nav dropdown, light/dark select & apps/context ([#36](https://github.com/jingcai86/modern-charts/issues/36)) ([9e165de](https://github.com/jingcai86/modern-charts/commit/9e165de294fd4d66d29ca6b7b67beb2df1fa9d47))
* **tooltip:** configurable item-anchored vs follow-mouse positioning & keyboard focus tooltips ([#9](https://github.com/jingcai86/modern-charts/issues/9)) ([#39](https://github.com/jingcai86/modern-charts/issues/39)) ([23c6e7a](https://github.com/jingcai86/modern-charts/commit/23c6e7a488d8f3590635d61dad6a4853bb97f439))
* **tooltip:** unify &lt;mc-tooltip&gt; across all 10 charts with CSS ::part(), docs guide & apps/studio structure ([#30](https://github.com/jingcai86/modern-charts/issues/30)) ([#31](https://github.com/jingcai86/modern-charts/issues/31)) ([dc7b30d](https://github.com/jingcai86/modern-charts/commit/dc7b30dd0e25779785925e03c7cc16d102a47f0c))


### Bug Fixes

* **markers:** set pointer-events: none on marker and decorative overlay layers so tooltips show on underlying items ([#22](https://github.com/jingcai86/modern-charts/issues/22)) ([080d54e](https://github.com/jingcai86/modern-charts/commit/080d54e90423e1155af666b4bd5387294634d493)), closes [#10](https://github.com/jingcai86/modern-charts/issues/10)
* **security:** resolve CodeQL polynomial ReDoS and prototype pollution alerts ([#8](https://github.com/jingcai86/modern-charts/issues/8)) ([f005f54](https://github.com/jingcai86/modern-charts/commit/f005f544670eb6516851d7737ae5c7e84f44195a))


### Performance Improvements

* **bundle:** shrink standalone & full bundles by 22–40% and track Brotli + gzip sizes ([#38](https://github.com/jingcai86/modern-charts/issues/38)) ([86e24cc](https://github.com/jingcai86/modern-charts/commit/86e24cc5c4e0943870b743e3ca42d58de001e6e8))


### Miscellaneous Chores

* **release:** standardize GitHub release notes format across all workflows ([a45985e](https://github.com/jingcai86/modern-charts/commit/a45985efb970140bb368e46bad9c6162e776bf4b))
* **size-limit:** track all 10 standalone chart subpaths + core and test isolation across every entry ([#26](https://github.com/jingcai86/modern-charts/issues/26)) ([97be391](https://github.com/jingcai86/modern-charts/commit/97be391637e15f0a261a8410cc555b0cffb512f4))
