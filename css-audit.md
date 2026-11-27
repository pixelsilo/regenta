# Webflow CSS audit (27 Nov 2026)

**Result:** 164 of the 182 were deleted and published to staging. Webflow refused 18 because it still counts them as in use somewhere the API scan didn't show (likely leftover references in component variants or page history): `nm_link`, `nm_link.nm_link-services`, `nm_links`, `bpb_cl`, `bpb_content`, `bpb_image-div`, `Div Block 139`, `Dropdown 2`, `dropdown-link`, `dropdown-ci`, `fd_specs`, `fd_button`, `fd_slide`, `sp_js`, `hide-on-mobile`, `navbar_mini-link.faded.hide-on-mobile`, `icon-size_0.5rem`, `Collection List 5`. Those stay.

Restored afterwards: `fs-cc-manager_component.move-up` (tablet and below: bottom 4rem). It's set on the cookie button on development pages outside the Designer's class list, so the scan missed it. `review-card.big` was also deleted, but it had no CSS, so nothing changed. It's still set by the purchaser-stories CMS "Card style" field (a class bound to the CMS), so recreate it if big cards ever need their own styling.

After publishing, every class in the published pages' markup still has CSS except `big` (above), and the main pages render as before.

1473 classes and combos on the site (tag styles like body/h1 not counted).

| | count |
|---|---|
| Assigned to elements on live pages / placed components | 1113 |
| Only added by the site code (JS) at runtime | 99 |
| Targeted by Webflow interactions | 25 |
| Used inside HTML embeds / custom code | 9 |
| Only on archived draft pages or components not placed anywhere | 45 |
| **Not used anywhere: proposed for deletion** | 182 |

The code check covered `src/`, `snippets/`, the code-v2 CSS embed, and every published staging page (embeds, inline styles and scripts). Classes built in code from strings (e.g. `is-slot-${n}`, `STALE_CLASS = 'is-stale'`) are kept.

## Proposed for deletion (182)

Deleting a base class also deletes its combos; all of these combos are unused too.

`._1600-container` `.about-hero_bg-dots` `.article-background` `.article-gallery` `.article_heading-layout-copy` `.bd_heading` `.bpb_cl` `.bpb_content` `.bpb_content-copy` `.bpb_image-div` `.button-2.button-wide` `.button-2.is-sand` `.button-3.button-wide` `.button-text.text-inline` `.button.rb-success-btn` `.calc_status` `.case-study-index_hero` `.case-study-index_hero_content` `.case-study-stats_component` `.circle-button.outlined` `.code-embed` `.code-embed-2` `.collection-list-5` `.collection-list-7` `.collection-list-8-copy` `.cs-gal_link` `.cs-gal_main` `.cs-stats_content` `.cs-stats_heading2` `.cs-stats_heading2-var` `.cs-stats_heading2-var.var` `.cs-stats_icon` `.cs-stats_item` `.cs-stats_item.hidden` `.csb_service-link` `.csl-lede` `.csl_content` `.csl_image-holder` `.dev-collection-list.is-two` `.developer-details_item` `.developer-details_items` `.dg_tab_text` `.display-flex` `.div-block-139` `.div-block-144` `.div-block-151` `.div-block-153` `.div-block-154` `.div-block-157` `.div-block-163` `.div-block-92` `.div-block-93` `.div-block-95` `.div-block-95-copy` `.dropdown-2` `.dropdown-ci` `.dropdown-link` `.empty-state` `.empty-state-4` `.fd_button` `.fd_logo-div-copy` `.fd_slide` `.fd_specs` `.footer_cta` `.footer_cta-arrow` `.footer_cta-card` `.footer_cta-row` `.footer_cta-title` `.footer_tagline` `.footer_top` `.fs-cc-banner_button` `.fs-cc-banner_button.fs-cc-button-alt` `.fs-cc-manager_component.move-up` `.fs-cc-prefs_button` `.fs-cc-prefs_button.fs-cc-button-alt` `.fs-cc-prefs_close` `.fs-cc-prefs_title` `.fs-radio_label-4` `.fs-radio_label-4.button-text` `.fs-radio_label-4.hidden` `.fs_accordion-2_arrow-wrapper` `.fs_accordion-2_arrow-wrapper.is-active-accordion` `.fs_accordion-2_body` `.fs_accordion-2_component` `.fs_accordion-2_content` `.fs_accordion-2_embed` `.fs_accordion-2_embed-2` `.fs_accordion-2_header` `.fs_accordion-2_icon` `.fs_accordion-2_item` `.fs_accordion-2_label` `.fs_accordion-2_label-2` `.fs_accordion-2_message` `.fs_accordion-2_message-2` `.fs_accordion-2_paragraph` `.fs_accordion-2_paragraph-2` `.heading-1-4-black.bm_1rem` `.heading-2-7-bold.griffiths-font` `.heading-4433-black.griffiths-font` `.heading-4433-black.shift-up` `.heading-4433-black.text-inline` `.heading-5544-black.griffiths-font` `.heading-5544-black.shift-up` `.heading-5544-black.text-inline` `.hide-on-mobile` `.icon-size_0-5rem` `.image-15` `.image-20` `.image-21` `.link-block-2` `.map-view_count` `.navbar_logo.previoulsy` `.navbar_logo.previously-2` `.navbar_mini-link.faded.hide-on-mobile` `.news-hero_full-size` `.nha_div1` `.nm_link` `.nm_link.nm_link-services` `.nm_links` `.pagination` `.pg_item.pg_item-green` `.pg_item.pg_item-red` `.pop-up_logo.previoulsy` `.pop-up_logo.previously-2` `.popup-holder.fade-out` `.popup-logo-holder.bm_2rem` `.ps-active` `.ps-cta` `.ps-float` `.ps-float_btn` `.ps-float_btn.is-active` `.ps-index_img` `.ps-index_sum` `.ps-index_thumb` `.ps-top` `.range_label` `.required.is-svc` `.review-card.big` `.row-flash.is-flashing` `.search-count` `.search-count_clear` `.search-count_text` `.search-toolbar` `.section.section_vert-flex-8rem` `.section_property-search.is-band` `.section_property-search.is-band.is-map` `.section_vert-flex-8rem` `.sector-tag` `.service-contact_heading-holder` `.service-contact_holder` `.service-contact_lead-contact-holder` `.service-contact_top` `.service-hero_component` `.service-hero_content` `.service-hero_copy` `.service-hero_grad` `.service-hero_image-container` `.service-hero_rich-text` `.service_grid-left` `.service_main-grid` `.service_sticky-contact-holder` `.sf_div1.is-fit` `.share-script` `.sharedsort` `.sp_js` `.sticky-content` `.svc-contact_left` `.svc-contact_link` `.svc-contact_text` `.svc-hero_top` `.svc-person` `.svc-person_img` `.svc-switch_faded` `.svc-switch_toggle.is-faded` `.tags_cl` `.text-block-14` `.text-block-16` `.text-block.tb_size_small` `.text-field.auto-width` `.toggle-holder-copy` `.toggle-holder-copy.on` `.usp-text`


## Only on archived drafts or unplaced components (45): your call

These stay unless you say otherwise. Deleting the archived pages / unused components first would let these go too.

- **archived-fabricaresales**: `.dev-collection-list._2-col` `.li_thumb-link.tall`
- **archived-home2**: `.code_hidden` `.collection-list-9` `.eyebrow` `.heading-5544-black` `.home-hero_bg-grad2` `.home-hero_component2` `.home-hero_content_d1` `.home-hero_content_d2` `.home-hero_content_var2` `.image-22` `.usp-container` `.usp-row`
- **archived-property-search-shared-ownership**: `.div-block-50` `.locations-code` `.select-field` `.sf_div1` `.text-block.tb_no-breaking` `.text-block.tb_no-breaking-copy`
- **case-studies-strip**: `.csb_cl` `.csb_clw` `.csb_content` `.csb_image-link` `.section_case-studies-banner`
- **footer (backup 26 Nov 2026), footer (old, backup 24 Nov 2026)**: `.collection-list-4` `.footer_large.smaller`
- **footer (old, backup 24 Nov 2026)**: `.div-block-136` `.div-block-137` `.footer_calc-links` `.footer_link-grid` `.footer_link.is-nowrap` `.footer_row-1` `.footer_row-2` `.link-block-5` `.text-button-copy`
- **popup**: `.heading-3-black.alt` `.pop-up_logo` `.popup-block` `.popup-divider` `.popup-holder` `.popup-logo-holder` `.popup_logo-flex`
- **snowflakes**: `.toggle-holder` `.xmas-toggle`
